import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { fetchOpportunityById } from "@/data/opportunities";

/** 보관함 로드 상태. loading은 스켈레톤, error는 재시도 안내, empty는 진짜 무저장. */
export type SavedLoadStatus = "loading" | "ok" | "empty" | "error";

export interface SavedView {
  items: MockOpportunity[];
  status: SavedLoadStatus;
  /** 실패한 조회만 다시 시도한다. status가 "error"가 아닐 때는 아무 일도 하지 않는다. */
  retry: () => void;
}

type FetchEntry = { status: "loading" | CatalogStatus; data: MockOpportunity | null };

/**
 * 보관함 항목을 저장 id로 직접 해소한다(웹 apps/web/src/hooks/useSavedOpportunities.ts와
 * 동일한 계약을 react-query 없이 plain useState/useEffect로 재구현 — 모바일엔
 * @tanstack/react-query 의존성이 없다).
 *
 * 이전(saved.tsx 인라인)에는 `savedIds.map(id => catalog.find(...)).filter(Boolean)`로만
 * 훑었다. catalog는 useEnsureCatalog가 반경으로 좁혀 받은 창(window)이라, 그 밖의 저장 id는
 * **조용히 사라졌다**(M-045). 이제 catalog에 없는 id는 fetchOpportunityById로 단건 조회한다.
 *
 * 마감 필터는 걸지 않는다 — fetchOpportunityById 자체가 마감 필터가 없고(catalog.ts 주석과
 * 동일 판단), 저장 목록에서 "지난 것 숨김"은 오히려 혼란이다.
 *
 * @param savedIds 저장한 활동 id(스토어 순서 그대로) — 결과 순서도 이 순서를 보존한다.
 * @param catalog 현재 로드된 카탈로그 창. 여기 있으면 재조회하지 않는다.
 */
export function useSavedOpportunities(
  savedIds: string[],
  catalog: MockOpportunity[],
): SavedView {
  const [fetched, setFetched] = useState<Record<string, FetchEntry>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const catalogMap = new Map(catalog.map((o) => [o.id, o]));
  const missingIds = savedIds.filter((id) => !catalogMap.has(id));
  const missingKey = missingIds.join(",");

  const runFetch = useCallback((id: string) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setFetched((prev) => ({ ...prev, [id]: { status: "loading", data: null } }));
    void (async () => {
      const { data, status } = await fetchOpportunityById(id);
      inFlight.current.delete(id);
      setFetched((prev) => ({ ...prev, [id]: { status, data } }));
    })();
  }, []);

  useEffect(() => {
    for (const id of missingKey ? missingKey.split(",") : []) {
      if (!fetched[id]) runFetch(id);
    }
    // missingKey(값 비교)로 충분 — savedIds/catalog 객체 identity 변화는 매 렌더 있을 수 있다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey, runFetch]);

  const retry = useCallback(() => {
    for (const id of missingIds) {
      const entry = fetched[id];
      if (entry?.status === "error" || entry?.status === "unconfigured") runFetch(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey, fetched, runFetch]);

  const items = savedIds
    .map((id) => catalogMap.get(id) ?? (fetched[id]?.status === "ok" ? fetched[id]?.data : null))
    .filter((o): o is MockOpportunity => !!o);

  if (savedIds.length === 0) return { items, status: "empty", retry };

  const anyFailed = missingIds.some(
    (id) => fetched[id]?.status === "error" || fetched[id]?.status === "unconfigured",
  );
  if (anyFailed) return { items, status: "error", retry };

  const anyLoading = missingIds.some((id) => !fetched[id] || fetched[id]?.status === "loading");
  if (anyLoading) return { items, status: "loading", retry };

  return { items, status: "ok", retry };
}
