"use client";

import { useQuery } from "@tanstack/react-query";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { fetchOpportunityById } from "@/data/opportunities";
import { queryKeys } from "@/lib/query";

/** 단건 상세 로드 상태. idle/loading은 스피너, error/empty는 "없음" 화면. */
export type OpportunityLoadStatus = "idle" | "loading" | "ok" | "empty" | "error" | "unconfigured";

export interface OpportunityView {
  opportunity: MockOpportunity | null;
  status: OpportunityLoadStatus;
}

/**
 * 상세 페이지용 단건 로드. 카탈로그 전량을 받지 않는다.
 *
 * 예전엔 "스토어 catalog에 있으면 재사용, 없으면 조회"를 손으로 갈랐다. 그런데 catalog는
 * 앵커 반경 목록이라, 반경 밖 활동(공유링크·보관함)은 항상 조회로 떨어졌고 같은 id를
 * 보관함과 상세가 각각 따로 받았다. 이제 둘 다 queryKeys.opportunity(id)를 공유하므로
 * 한 번 받은 건 두 화면이 같이 쓴다 — 재사용 판단이 캐시의 일이지 우리 일이 아니다.
 */
export function useOpportunity(id: string | null): OpportunityView {
  const { data, isPending, isError } = useQuery({
    // enabled가 false면 실행되지 않으므로 이 키는 쓰이지 않는다.
    queryKey: queryKeys.opportunity(id ?? ""),
    queryFn: () => fetchOpportunityById(id ?? ""),
    enabled: id != null,
  });

  // id가 아예 없으면 조회할 대상이 없다 → "없음"으로.
  if (id == null) return { opportunity: null, status: "empty" };
  if (isError) return { opportunity: null, status: "error" };
  if (isPending || !data) return { opportunity: null, status: "loading" };
  return { opportunity: data.data, status: mapStatus(data.status, data.data) };
}

/** core CatalogStatus + 데이터 유무 → 화면용 상태. ok인데 데이터 없으면 empty로 정규화. */
function mapStatus(s: CatalogStatus, data: MockOpportunity | null): OpportunityLoadStatus {
  if (s === "ok") return data ? "ok" : "empty";
  return s;
}
