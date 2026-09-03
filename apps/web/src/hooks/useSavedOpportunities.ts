"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatalogResult, MockOpportunity } from "@/data/opportunities";
import { fetchOpportunitiesByIds } from "@/data/opportunities";
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
 * 그래서 목록 조회 대신 id 집합을 하나의 쿼리(.in("id", ids))로 해소한다. 예전엔 저장
 * 건수만큼 useQueries로 N개 요청을 각각 보냈는데(id별 queryKeys.opportunity 공유),
 * 이제 벌크 요청 하나로 묶고 응답을 받는 즉시 queryFn 안에서 각 항목을 개별 상세 캐시
 * 슬롯(queryKeys.opportunity(id))에 직접 시딩한다 — 그래서 상세에서 같은 활동을 열어도
 * 다시 받지 않는다(반대도 마찬가지: 캐시 공유 자체는 useOpportunity가 읽는 쪽).
 *
 * 마감이 지난 활동도 그대로 보여준다. fetchOpportunitiesByIds는 near/카테고리/마감
 * 필터가 없고, 저장 목록에서 "지난 것 숨김"은 오히려 혼란이다(catalog.ts 단건조회
 * 주석과 동일한 판단).
 */
export function useSavedOpportunities(): SavedView {
  const savedIds = useAppStore((s) => s.savedIds);
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.savedOpportunities(savedIds),
    queryFn: async (): Promise<CatalogResult> => {
      const result = await fetchOpportunitiesByIds(savedIds);
      // 상세 캐시 선시딩. queryFn은 실제 fetch가 일어날 때만(캐시 히트 시엔 재실행되지 않음)
      // 딱 한 번 돌므로, 별도 useEffect/의존성 배열 없이 "응답 도착 시 1회"가 자연히 보장된다.
      for (const item of result.data) {
        queryClient.setQueryData(queryKeys.opportunity(item.id), { data: item, status: "ok" });
      }
      return result;
    },
    enabled: savedIds.length > 0,
  });

  // 저장 순서를 보존한다 — 벌크 응답이 어떤 순서로 오든 savedIds 순서로 되돌린다.
  // 삭제된 활동(응답에 id가 없음)은 조용히 건너뛴다(에러 아님).
  const byId = new Map((data?.data ?? []).map((o) => [o.id, o] as const));
  const items = savedIds
    .map((id) => byId.get(id))
    .filter((o): o is MockOpportunity => !!o);

  // 조회 실패는 에러로 노출한다. "없음"(삭제된 활동)은 위에서 이미 조용히 걸러졌다.
  const failed = isError || data?.status === "error" || data?.status === "unconfigured";
  const retry = () => void refetch();

  if (savedIds.length === 0) return { items, status: "empty", retry };
  if (failed) return { items, status: "error", retry };
  if (isPending) return { items, status: "loading", retry };
  return { items, status: "ok", retry };
}
