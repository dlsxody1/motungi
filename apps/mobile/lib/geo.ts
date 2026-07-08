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
