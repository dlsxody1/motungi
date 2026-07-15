/**
 * 활동 데이터 레이어 — 얇은 래퍼. 실제 변환/쿼리 로직은 @motungi/core의 catalog로 승격됐다(M-008).
 * 이 파일은 core의 타입/함수를 재노출하고, fetchOpportunities()만 무인자 시그니처를 유지하기 위해
 * 이 앱의 supabase 클라이언트를 core 함수에 주입하는 얇은 위임 함수로 감싼다(호출부 diff 0 요건).
 */
export type { MockOpportunity, CatalogStatus, CatalogResult } from "@motungi/core";
export { NEIGHBORHOOD_POINTS, rowToMock } from "@motungi/core";

import type { CatalogResult } from "@motungi/core";
import { fetchOpportunities as coreFetchOpportunities } from "@motungi/core";
import { supabase } from "@/lib/supabase";

/** Supabase에서 활동 후보를 읽어온다. 이 앱의 supabase 클라이언트를 core에 주입하는 얇은 래퍼. */
export async function fetchOpportunities(): Promise<CatalogResult> {
  return coreFetchOpportunities(supabase);
}
