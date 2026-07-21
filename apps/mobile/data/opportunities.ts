/**
 * 활동 데이터 레이어 — 얇은 래퍼. 실제 변환/쿼리 로직은 @motungi/core의 catalog로 승격됐다(M-008).
 * 이 파일은 core의 타입/함수를 재노출하고, fetchOpportunities()만 무인자 시그니처를 유지하기 위해
 * 이 앱의 supabase 클라이언트를 core 함수에 주입하는 얇은 위임 함수로 감싼다(호출부 diff 0 요건).
 */
export type {
  MockOpportunity,
  CatalogStatus,
  CatalogResult,
  NeighborhoodPick,
  FetchOpportunitiesOptions,
} from "@motungi/core";
export { POPULAR_NEIGHBORHOODS, DEFAULT_NEIGHBORHOOD, rowToMock } from "@motungi/core";

import type { CatalogResult, FetchOpportunitiesOptions } from "@motungi/core";
import { fetchOpportunities as coreFetchOpportunities } from "@motungi/core";
import { supabase } from "@/lib/supabase";

/**
 * Supabase에서 활동 후보를 읽어온다. 이 앱의 supabase 클라이언트를 core에 주입하는 얇은 래퍼.
 * `today`(마감 필터 기준일)는 여기서 자동 주입 — 어디서 부르든 지난 이벤트는 서버에서 제외된다.
 * 호출부가 today를 명시하면 그것을 우선한다.
 */
export async function fetchOpportunities(
  options: FetchOpportunitiesOptions = {},
): Promise<CatalogResult> {
  const today = new Date().toISOString().slice(0, 10);
  return coreFetchOpportunities(supabase, { today, ...options });
}
