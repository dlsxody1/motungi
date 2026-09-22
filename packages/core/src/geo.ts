/**
 * 동네 검색·역지오코딩 응답 계약 (M-113) — web(/api/geo·/api/neighborhoods 상대경로)과
 * mobile(EXPO_PUBLIC_WEB_ORIGIN 경유 동일 엔드포인트)이 같은 이름·같은 타입으로 각자
 * 구현하고 있던 것을 통합한다. 실제 차이는 오리진뿐이므로 fetch 호출 자체는 각 앱의
 * lib/geo.ts에 남기고, 여기서는 타입과 부작용 없는 응답 파싱만 공유한다.
 */

export interface ReverseGeoResult {
  admCode: string | null;
  dongName: string;
}

/** 동네 검색 결과 한 건 (/api/neighborhoods 응답). 좌표를 함께 실어와 앵커에 바로 주입 가능. */
export interface NeighborhoodSearchResult {
  admCode: string;
  dongName: string;
  sigungu: string;
  lat: number;
  lng: number;
}

/** /api/geo 응답 본문 → ReverseGeoResult. dongName이 없으면 null(호출부가 기존 선택으로 폴백). */
export function parseReverseGeoResponse(data: unknown): ReverseGeoResult | null {
  if (!data || typeof data !== "object") return null;
  const { admCode, dongName } = data as Partial<ReverseGeoResult>;
  if (!dongName) return null;
  return { admCode: admCode ?? null, dongName };
}

/** /api/neighborhoods 응답 본문 → NeighborhoodSearchResult[]. items가 배열이 아니면 빈 배열. */
export function parseNeighborhoodSearchResponse(data: unknown): NeighborhoodSearchResult[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as NeighborhoodSearchResult[]) : [];
}
