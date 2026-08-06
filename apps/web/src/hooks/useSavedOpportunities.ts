"use client";

import { useQueries } from "@tanstack/react-query";
import type { MockOpportunity } from "@/data/opportunities";
import { fetchOpportunityById } from "@/data/opportunities";
import { queryKeys } from "@/lib/query";
import { useAppStore } from "@/store/useAppStore";

/** 보관함 로드 상태. loading은 스켈레톤, error는 재시도 안내. */
export type SavedLoadStatus = "loading" | "ok" | "empty" | "error";

export interface SavedView {
  items: MockOpportunity[];
  status: SavedLoadStatus;
  /** 실패한 조회를 다시 시도한다. status가 "error"일 때만 의미가 있다. */
  retry: () => void;
}

/**
 * 보관함 항목을 저장 id로 직접 해소한다.
 *
 * 이전에는 useEnsureCatalog(300건 무필터)를 받아 `savedIds.map(id => catalog.find(...))`로
 * 훑었다. 그 결과 **저장해둔 활동이 300건 창 밖이면 보관함에서 조용히 사라졌다**
 * (실측: live 507건 중 207건이 실종 대상). 성능이 아니라 정합성 버그였다.
 *
 * 그래서 목록 조회 대신 id별 조회를 쓴다. 키가 useOpportunity와 같으므로 상세에서 본
 * 활동은 보관함에서 다시 받지 않는다(반대도 마찬가지).
 *
 * 마감이 지난 활동도 그대로 보여준다. fetchOpportunityById는 마감 필터가 없고,
 * 저장 목록에서 "지난 것 숨김"은 오히려 혼란이다(catalog.ts 단건조회 주석과 동일한 판단).
 *
 * ponytail: 저장 건수만큼 요청. 수십 건을 넘기면 .in("id", ids) 단일 조회로 승격.
 */
export function useSavedOpportunities(): SavedView {
  const savedIds = useAppStore((s) => s.savedIds);

  const results = useQueries({
    queries: savedIds.map((id) => ({
      queryKey: queryKeys.opportunity(id),
      queryFn: () => fetchOpportunityById(id),
    })),
  });

  // 저장 순서를 유지한 채 해소한다. 아직 못 받은 id는 자리를 비워둔다(로딩 중).
  const items = results
    .map((r) => r.data?.data)
    .filter((o): o is MockOpportunity => !!o);

  // 조회 실패는 에러로, "없음"(삭제된 활동)은 조용히 건너뛴다.
  const failed = results.some(
    (r) => r.isError || r.data?.status === "error" || r.data?.status === "unconfigured",
  );
  const retry = () => {
    for (const r of results) if (r.isError || r.data?.status === "error") void r.refetch();
  };

  if (savedIds.length === 0) return { items, status: "empty", retry };
  if (failed) return { items, status: "error", retry };
  if (results.some((r) => r.isPending)) return { items, status: "loading", retry };
  return { items, status: "ok", retry };
}
