/**
 * KOPIS(공연예술통합전산망) 적재용 순수 함수.
 *
 * 매핑 자체(mapKopis)의 SoT는 `supabase/functions/ingest/adapters.ts`다(M-029) —
 * 여기엔 그 매핑과 적재 계층이 공유하는 판정/정규화 로직만 둔다.
 *
 * 배경: KOPIS는 좌표를 공연목록이 아니라 **시설상세**(prfplc/{mt10id})에만 준다.
 * 공연목록엔 시설ID조차 없고 공연장 '이름'(fcltynm)만 온다. 정공법은 공연상세를
 * 거쳐 mt10id를 받는 3단이지만 공연 1건당 1콜이라 무겁다.
 * 실측(2026-09-03, 서울 signgucode=11): 시설목록 전량 1,734곳을 이름으로 색인하면
 * 공연 100건이 쓰는 공연장 63곳이 **63/63 전부 매칭**됐다. 그래서 이름 색인으로
 * 시설ID를 얻고 공연상세 단계를 통째로 건너뛴다.
 * (주의: 그때 rows=100 × 10페이지=1,000곳만 받으면 가나다순 뒷부분이 잘려 매칭이
 *  34/63으로 조용히 떨어진다 — 사전은 반드시 끝까지 순회해야 한다.)
 */

/** 공연장 이름 → 조회 키. 실측 응답엔 후행공백이 섞여 온다("(재)정효문화재단 "). */
export function facilityKey(name: string | null | undefined): string | null {
  const s = name?.replace(/\s+/g, " ").trim();
  return s ? s : null;
}

/** 시설목록 응답 중 색인에 필요한 최소 형태. */
export interface KopisFacility {
  fcltynm?: string;
  mt10id?: string;
}

/**
 * 공연장 이름 → 시설ID 색인.
 * 이름이 겹치면 먼저 온 것을 유지한다 — 뒤엣것이 말없이 덮어쓰면 어느 시설의
 * 좌표가 붙었는지 추적할 수 없다.
 */
export function buildFacilityIndex(rows: KopisFacility[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const r of rows) {
    const key = facilityKey(r.fcltynm);
    const id = r.mt10id?.trim();
    if (!key || !id) continue;
    if (!idx.has(key)) idx.set(key, id);
  }
  return idx;
}

/**
 * 시설상세 주소에서 시군구를 뽑는다.
 *
 * 공연목록의 `area`는 "서울특별시"까지만 와서 구 단위 거리 큐레이션에 못 쓴다.
 * 시설상세 `adres`("서울특별시 서초구 사임당로18길 52-2 (서초동)")에서 구를 얻는다.
 * `view.ts`의 normalizeGu는 시/도 접두사만 떼는 함수라 전체 주소엔 맞지 않는다.
 */
export function parseGuFromAddress(addr: string | null | undefined): string | null {
  // 시/도 접두사를 먼저 떼지 않으면 "서울특별시"의 '시'가 시군구로 잡힌다.
  const rest = addr?.trim().replace(/^(?:서울특별시|서울|경기도|경기|인천광역시|인천)\s+/, "");
  if (!rest) return null;
  // 접두사 바로 뒤 토큰만 본다. "경기도 성남시 분당구"처럼 시·구가 겹치면
  // 앞의 시를 쓴다(dong_name 관례). 형식 밖 주소면 null — 지어내지 않는다.
  const m = rest.match(/^([가-힣]+(?:시|군|구))(?:\s|$)/);
  return m?.[1] ?? null;
}
