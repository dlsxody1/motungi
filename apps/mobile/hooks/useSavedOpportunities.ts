import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { fetchOpportunitiesByIds } from "@/data/opportunities";

/** 보관함 로드 상태. loading은 스켈레톤, error는 재시도 안내, empty는 진짜 무저장. */
export type SavedLoadStatus = "loading" | "ok" | "empty" | "error";

export interface SavedView {
  items: MockOpportunity[];
  status: SavedLoadStatus;
  /** 실패한 조회만 다시 시도한다. status가 "error"가 아닐 때는 아무 일도 하지 않는다. */
  retry: () => void;
}

type BulkState = { status: "idle" | "loading" | CatalogStatus; data: Map<string, MockOpportunity> };

/**
 * 보관함 항목을 저장 id로 직접 해소한다(웹 apps/web/src/hooks/useSavedOpportunities.ts와
 * 동일한 계약을 react-query 없이 plain useState/useEffect로 재구현 — 모바일엔
 * @tanstack/react-query 의존성이 없다).
 *
 * [M-075] catalog 창 밖 저장 id를 개별 fetchOpportunityById로 N회 조회하던 것을
 * fetchOpportunitiesByIds 벌크 조회 1회로 교체했다(core catalog.ts:350, 웹 M-064 선례와 동등).
 * catalog에 있는 id는 여전히 재조회하지 않는다 — 벌크 요청 대상은 missingIds뿐이다.
 *
 * 마감 필터는 걸지 않는다 — fetchOpportunitiesByIds 자체가 마감 필터가 없고(catalog.ts 주석과
 * 동일 판단), 저장 목록에서 "지난 것 숨김"은 오히려 혼란이다.
 *
 * @param savedIds 저장한 활동 id(스토어 순서 그대로) — 결과 순서도 이 순서를 보존한다.
 * @param catalog 현재 로드된 카탈로그 창. 여기 있으면 재조회하지 않는다.
 */
export function useSavedOpportunities(
  savedIds: string[],
  catalog: MockOpportunity[],
): SavedView {
  const [bulk, setBulk] = useState<BulkState>({ status: "idle", data: new Map() });
  const inFlightKey = useRef<string | null>(null);

  const catalogMap = new Map(catalog.map((o) => [o.id, o]));
  const missingIds = savedIds.filter((id) => !catalogMap.has(id));
  const missingKey = missingIds.join(",");

  const runFetch = useCallback((ids: string[]) => {
    const key = ids.join(",");
    if (inFlightKey.current === key) return;
    inFlightKey.current = key;
    setBulk((prev) => ({ ...prev, status: "loading" }));
    void (async () => {
      const result = await fetchOpportunitiesByIds(ids);
      inFlightKey.current = null;
      setBulk({ status: result.status, data: new Map(result.data.map((o) => [o.id, o])) });
    })();
  }, []);

  useEffect(() => {
    if (missingKey) runFetch(missingKey.split(","));
    // missingKey(값 비교)로 충분 — savedIds/catalog 객체 identity 변화는 매 렌더 있을 수 있다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey, runFetch]);

  // 실패한(=아직 못 받은) 부분만 재조회한다 — catalog로 이미 해소된 id는 애초에 missingIds에
  // 없어 재요청 대상이 아니다("부분 실패 시 실패분만 재조회" 계약).
  const retry = useCallback(() => {
    if (bulk.status === "error" || bulk.status === "unconfigured") {
      inFlightKey.current = null;
      runFetch(missingIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey, bulk.status, runFetch]);

  const items = savedIds
    .map((id) => catalogMap.get(id) ?? bulk.data.get(id))
    .filter((o): o is MockOpportunity => !!o);

  if (savedIds.length === 0) return { items, status: "empty", retry };
  if (missingIds.length === 0) return { items, status: "ok", retry };

  if (bulk.status === "error" || bulk.status === "unconfigured") return { items, status: "error", retry };
  if (bulk.status === "idle" || bulk.status === "loading") return { items, status: "loading", retry };
  return { items, status: "ok", retry };
}
