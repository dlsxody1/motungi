/**
 * 구(區) 중심좌표 폴백 — 좌표 없는 활동을 반경 필터 안으로 들여보낸다.
 *
 * 왜 필요한가: `catalog.ts`의 반경 필터는 lat/lng만 읽으므로 좌표가 없는 행은
 * "근처"일 수 없어 통째로 탈락한다. 실측(2026-09-03) 520행 중 125행이 좌표가
 * 없고, 그중 53행(seoul_jobs 49 · culture_info 4)은 dong_name이 서울 구로
 * 매칭돼 구 중심좌표라도 줄 수 있다. 나머지 72행은 서울 밖이라 neighborhoods로
 * 못 고친다 — 지어내지 않고 그대로 둔다.
 *
 * 정밀도는 구 중심이다. 동 단위가 아니므로 `coord_level: "sigungu"` 표식을 남겨
 * 나중에 정밀 좌표가 생겼을 때 어느 행을 갱신할지 구분할 수 있게 한다.
 * (neighborhoods 테이블도 같은 컬럼명을 쓴다 — 0009.)
 */
/**
 * ⚠️ 이 파일은 leaf로 유지한다 — core 내부 모듈을 import하지 마라.
 *
 * ingest Edge Function이 이 파일을 원본 상대경로로 배포한다(Deno). Deno는 확장자 없는
 * import를 못 읽어 `from "../view"`는 배포를 400으로 깨뜨리고(실제로 0018 이후 계속
 * 깨져 있었다), 그렇다고 `../view.ts`로 쓰면 이번엔 tsc가 TS5097로 거부한다
 * (allowImportingTsExtensions 미설정). 양쪽을 동시에 만족하는 import 경로는 없다.
 *
 * 그래서 다른 adapters(util·ingest-fetch·audience)와 같은 규율을 따른다: import하지 않는다.
 * 아래 normalizeGu는 `../view.ts`의 동일 함수를 의도적으로 복제한 것이다 —
 * 4줄짜리 순수 문자열 처리라 복제 비용이 배포를 깨뜨리는 비용보다 싸다.
 * view.ts 쪽을 고치면 여기도 함께 고칠 것(양쪽 다 테스트가 잡는다).
 */
function normalizeGu(dong: string | null | undefined): string | null {
  const s = dong?.trim();
  if (!s) return null;
  return s.replace(/^(서울특별시|서울|경기도|경기|인천광역시|인천)\s+/, "").trim() || null;
}

/** neighborhoods 테이블에서 읽어온 동 좌표 1행. */
export interface GuCentroidRow {
  sigungu: string;
  lat: number | null;
  lng: number | null;
}

/** 좌표 폴백 대상 row의 최소 형태(적재 OppRow·DB row 양쪽에 맞는 구조적 타입). */
export interface CoordFallbackRow {
  dong_name: string | null;
  lat: number | null;
  lng: number | null;
  coord_level?: string;
}

/**
 * 동 좌표 목록 → 구별 중심좌표 맵.
 *
 * 구 중심을 별도로 갖고 있지 않으므로 그 구에 속한 동 좌표의 평균을 쓴다.
 * neighborhoods 426행 중 418행이 이미 구 중심을 공유하고 있어(coord_level='sigungu')
 * 실제로는 대부분 같은 값의 평균이지만, 동 단위 좌표가 채워지면(M-076) 이 평균이
 * 자연스럽게 진짜 구 중심으로 수렴한다 — 그때 이 함수를 고칠 필요가 없다.
 */
export function buildGuCentroids(rows: GuCentroidRow[]): Map<string, { lat: number; lng: number }> {
  const sums = new Map<string, { lat: number; lng: number; n: number }>();
  for (const r of rows) {
    if (r.lat == null || r.lng == null) continue;
    const key = normalizeGu(r.sigungu);
    if (!key) continue;
    const acc = sums.get(key);
    if (acc) {
      acc.lat += r.lat;
      acc.lng += r.lng;
      acc.n += 1;
    } else {
      sums.set(key, { lat: r.lat, lng: r.lng, n: 1 });
    }
  }
  const out = new Map<string, { lat: number; lng: number }>();
  for (const [gu, s] of sums) out.set(gu, { lat: s.lat / s.n, lng: s.lng / s.n });
  return out;
}

/**
 * 좌표 없는 행에 구 중심좌표를 채운다. 원본 좌표는 절대 덮어쓰지 않는다.
 *
 * `dong_name`은 손대지 않는다 — `inMetro()`가 "경기 안산시"처럼 시도 접두사로
 * 수도권을 판정하므로, 접두사를 벗기면 그 필터가 깨진다. 매칭할 때만 normalizeGu로
 * 정규화해 "종로구"와 "서울 종로구"를 같게 본다.
 *
 * 멱등 — 이미 채워진 행은 lat/lng가 있으므로 두 번째 호출에서 건너뛴다.
 */
export function applyGuCoordFallback<T extends CoordFallbackRow>(
  row: T,
  centroids: Map<string, { lat: number; lng: number }>,
): T {
  // 한쪽만 있어도 건드리지 않는다 — 반쪽 좌표에 다른 출처를 섞으면 엉뚱한 지점이 된다.
  if (row.lat != null || row.lng != null) return row;
  const gu = normalizeGu(row.dong_name);
  if (!gu) return row;
  const hit = centroids.get(gu);
  if (!hit) return row;
  return { ...row, lat: hit.lat, lng: hit.lng, coord_level: "sigungu" };
}
