"use client";

import { useQuery } from "@tanstack/react-query";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { fetchOpportunities } from "@/data/opportunities";
import { queryKeys } from "@/lib/query";
import { useAppStore } from "@/store/useAppStore";

/** 리포트가 그리는 카드 수(원픽 1 + 함께 최대 5). */
const REPORT_SIZE = 6;

export interface ReportFallbackView {
  items: MockOpportunity[];
  status: CatalogStatus | "idle";
}

/**
 * 리포트 fallback 로드 — 진단 없이 /report로 직접 진입했을 때만 동작한다.
 *
 * 정상 경로(/diagnosis→/loading→/report)에선 /loading이 이미 관심 카테고리로 30건을 받아
 * 스코어링해 results에 top 6을 저장한다. 그래서 리포트는 catalog를 아예 읽지 않는다.
 * 그럼에도 예전엔 useEnsureCatalog(300건 무필터)를 호출해, 300건을 받아 파싱·가드필터한 뒤
 * 전량 버렸다. 리포트가 실제로 필요한 건 6건이다.
 *
 * 그래서 여기선 results가 비었을 때만, 딱 6건만 받는다.
 *
 * 예전엔 이 6건을 전역 catalog에 setCatalog로 **써넣었다**. 그러면 리포트를 직접 열었을 때
 * 탐색 화면의 catalogStatus가 "ok"로 바뀌어, 탐색이 앵커 반경 목록 대신 이 6건을 자기
 * 카탈로그로 착각하고 재조회를 건너뛰었다. 이제 별도 쿼리라 서로를 덮어쓰지 않는다.
 */
export function useReportFallback(): ReportFallbackView {
  const results = useAppStore((s) => s.results);
  const needsFallback = results.length === 0;

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.reportFallback(),
    // today는 래퍼가 주입 → 마감 지난 활동은 서버에서 제외된다.
    queryFn: () => fetchOpportunities({ limit: REPORT_SIZE }),
    enabled: needsFallback,
  });

  // 정상 경로면 조회 자체가 없다 — 리포트는 results를 쓴다.
  if (!needsFallback) return { items: [], status: "ok" };
  if (isError) return { items: [], status: "error" };
  if (isPending || !data) return { items: [], status: "idle" };
  return { items: data.data, status: data.status };
}
