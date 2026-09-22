/**
 * 좌표 → 행정동 역지오코딩 (클라이언트에서 /api/geo 프록시 호출).
 * 네이버 키는 서버에만 두므로 브라우저는 이 엔드포인트만 경유한다.
 * 실패(미설정·구독 미비·좌표 매칭 실패)면 null → 호출부에서 기존 선택을 폴백한다.
 *
 * 타입·응답 파싱은 @motungi/core(M-113)와 공유한다 — web·mobile의 실제 차이는 오리진뿐이다.
 */
import { reportError } from "@/lib/api-error";
import {
  parseNeighborhoodSearchResponse,
  parseReverseGeoResponse,
  type NeighborhoodSearchResult,
  type ReverseGeoResult,
} from "@motungi/core";

export type { NeighborhoodSearchResult, ReverseGeoResult };

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeoResult | null> {
  try {
    const res = await fetch(`/api/geo?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return parseReverseGeoResponse(await res.json());
  } catch (err) {
    // 반환값은 그대로 null — 호출부가 기존 선택으로 폴백한다. 다만 조용히 사라지진 않게 남긴다.
    reportError("lib/geo:reverseGeocode", err);
    return null;
  }
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
    return parseNeighborhoodSearchResponse(await res.json());
  } catch (err) {
    // AbortError는 타입어헤드가 이전 요청을 취소한 정상 동작이다 — 리포팅하면 노이즈만 쌓인다.
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      reportError("lib/geo:searchNeighborhoods", err);
    }
    return [];
  }
}
