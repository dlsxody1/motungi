/**
 * 좌표 → 행정동 역지오코딩 (클라이언트에서 /api/geo 프록시 호출).
 * 네이버 키는 서버에만 두므로 브라우저는 이 엔드포인트만 경유한다.
 * 실패(미설정·구독 미비·좌표 매칭 실패)면 null → 호출부에서 기존 선택을 폴백한다.
 */
export interface ReverseGeoResult {
  admCode: string | null;
  dongName: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeoResult | null> {
  try {
    const res = await fetch(`/api/geo?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ReverseGeoResult>;
    if (!data.dongName) return null;
    return { admCode: data.admCode ?? null, dongName: data.dongName };
  } catch {
    return null;
  }
}
