/**
 * 좌표 → 행정동 역지오코딩 (클라이언트에서 /api/geo 프록시 호출).
 * 네이버 키는 서버에만 두므로 브라우저는 이 엔드포인트만 경유한다.
 * 실패(미설정·구독 미비·좌표 매칭 실패)면 null → 호출부에서 기존 선택을 폴백한다.
 */
import { reportError } from "@/lib/api-error";

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
  } catch (err) {
    // 반환값은 그대로 null — 호출부가 기존 선택으로 폴백한다. 다만 조용히 사라지진 않게 남긴다.
    reportError("lib/geo:reverseGeocode", err);
    return null;
  }
}

/**
 * 동네 검색 결과 한 건 (/api/neighborhoods 응답). 좌표를 함께 실어와 앵커에 바로 주입 가능.
 */
export interface NeighborhoodSearchResult {
  admCode: string;
  dongName: string;
  sigungu: string;
  lat: number;
  lng: number;
}

/**
 * 행정동 이름 부분일치 검색 (/api/neighborhoods 경유). 실패/빈 검색어면 빈 배열.
 * signal로 이전 요청 취소 가능(타입어헤드 경합 방지).
 */
export async function searchNeighborhoods(
  q: string,
  signal?: AbortSignal,
): Promise<NeighborhoodSearchResult[]> {
  const query = q.trim();
  if (!query) return [];
  try {
    const res = await fetch(`/api/neighborhoods?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: NeighborhoodSearchResult[] };
    return data.items ?? [];
  } catch (err) {
    // AbortError는 타입어헤드가 이전 요청을 취소한 정상 동작이다 — 리포팅하면 노이즈만 쌓인다.
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      reportError("lib/geo:searchNeighborhoods", err);
    }
    return [];
  }
}
