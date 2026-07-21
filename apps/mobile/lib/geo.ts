/**
 * 좌표 → 행정동 역지오코딩. 모바일은 상대경로 /api/geo가 없으므로
 * 웹 오리진(EXPO_PUBLIC_WEB_ORIGIN)의 프록시를 호출한다. 네이버 키는 웹 서버 전용.
 * 오리진 미설정·실패·구독 미비면 null → 호출부에서 기존 선택을 폴백한다.
 *   dev: EXPO_PUBLIC_WEB_ORIGIN=http://192.168.x.x:3000 (로컬 IP)
 */
export interface ReverseGeoResult {
  admCode: string | null;
  dongName: string;
}

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN;

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeoResult | null> {
  if (!WEB_ORIGIN) return null;
  try {
    const res = await fetch(`${WEB_ORIGIN}/api/geo?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ReverseGeoResult>;
    if (!data.dongName) return null;
    return { admCode: data.admCode ?? null, dongName: data.dongName };
  } catch {
    return null;
  }
}

/** 동네 검색 결과 한 건 (웹 오리진의 /api/neighborhoods 응답). */
export interface NeighborhoodSearchResult {
  admCode: string;
  dongName: string;
  sigungu: string;
  lat: number;
  lng: number;
}

/**
 * 행정동 이름 부분일치 검색. 웹과 동일 엔드포인트를 오리진 경유로 호출.
 * 오리진 미설정·실패·빈 검색어면 빈 배열.
 */
export async function searchNeighborhoods(q: string): Promise<NeighborhoodSearchResult[]> {
  const query = q.trim();
  if (!query || !WEB_ORIGIN) return [];
  try {
    const res = await fetch(`${WEB_ORIGIN}/api/neighborhoods?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: NeighborhoodSearchResult[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}
