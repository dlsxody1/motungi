"use client";

import { useEffect } from "react";
import { fetchOpportunities } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** 리포트가 그리는 카드 수(원픽 1 + 함께 최대 5). */
const REPORT_SIZE = 6;

/**
 * 리포트 fallback 로드 — 진단 없이 /report로 직접 진입했을 때만 동작한다.
 *
 * 정상 경로(/diagnosis→/loading→/report)에선 /loading이 이미 관심 카테고리로 30건을 받아
 * 스코어링해 results에 top 6을 저장한다. 그래서 리포트는 catalog를 아예 읽지 않는다.
 * 그럼에도 예전엔 useEnsureCatalog(300건 무필터)를 호출해, 300건을 받아 파싱·가드필터한 뒤
 * 전량 버렸다. 리포트가 실제로 필요한 건 6건이다.
 *
 * 그래서 여기선 results가 비었을 때만, 딱 6건만 받는다.
 */
export function useReportFallback() {
  const results = useAppStore((s) => s.results);
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const setCatalog = useAppStore((s) => s.setCatalog);
  const needsFallback = results.length === 0 && catalogStatus === "idle";

  useEffect(() => {
    if (!needsFallback) return;
    let cancelled = false;
    void (async () => {
      // today는 래퍼가 주입 → 마감 지난 활동은 서버에서 제외된다.
      const { data, status } = await fetchOpportunities({ limit: REPORT_SIZE });
      if (!cancelled) setCatalog(data, status);
    })();
    return () => {
      cancelled = true;
    };
  }, [needsFallback, setCatalog]);
}
