"use client";

import { useQuery } from "@tanstack/react-query";
import {
  buildWhyReasonsPrompt,
  scoreOpportunity,
  timeRangeLabel,
  whyReasons,
  type DiagnosisAnswers,
  type UserAnchors,
} from "@motungi/core";
import type { MockOpportunity } from "@/data/opportunities";
import { reportError } from "@/lib/api-error";
import { queryKeys } from "@/lib/query";

export interface WhyReasonsView {
  reasons: string[];
  /** true면 LLM 산문으로 교체된 것, false면 규칙기반(whyReasons) 폴백. */
  isLlm: boolean;
}

/**
 * "왜 맞을까요" 근거(M-044). 규칙기반 whyReasons()를 **즉시** 반환해 페이지를
 * 블로킹하지 않고, react-query가 뒤이어 /api/why-reasons를 호출해 성공하면
 * LLM 산문으로 교체한다. 실패·폴백 응답이면 규칙기반 문구를 그대로 유지한다
 * (에러를 사용자에게 보이지 않는다 — 이미 화면엔 근거가 떠 있다).
 *
 * opp가 null이면(아직 로딩 중) 훅 자체는 항상 호출되지만 쿼리는 비활성화된다
 * (Rules of Hooks — 호출부의 조건부 early return보다 앞에서 훅을 불러야 하므로
 * null을 받아들이는 시그니처로 설계했다).
 */
export function useWhyReasons(
  opp: MockOpportunity | null,
  answers: DiagnosisAnswers | null,
  anchors: UserAnchors,
): WhyReasonsView {
  const fallbackReasons = opp ? whyReasons(opp, answers) : [];
  // 입력은 breakdown뿐 — opp의 원문(description/summary)은 넘기지 않는다(view.ts 문서 참조).
  const breakdown = opp && answers ? scoreOpportunity(opp, answers, anchors).breakdown : null;
  const breakdownKey = breakdown ? JSON.stringify(breakdown) : "no-answers";

  const { data } = useQuery({
    queryKey: queryKeys.whyReasons(opp?.id ?? "none", breakdownKey),
    queryFn: async ({ signal }) => {
      if (!opp || !breakdown) return null;
      try {
        const res = await fetch("/api/why-reasons", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            category: opp.category,
            title: opp.title,
            costHeading: opp.costHeading,
            costLabel: opp.costLabel,
            timeLabel: timeRangeLabel(opp.timeWindow),
            breakdown,
          } satisfies Parameters<typeof buildWhyReasonsPrompt>[0]),
          signal,
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { fallback: boolean; reasons?: string[] };
        return !json.fallback && Array.isArray(json.reasons) && json.reasons.length > 0
          ? json.reasons
          : null;
      } catch (err) {
        // UI는 그대로 — 규칙기반 문구가 이미 렌더돼 있다(의도된 우아한 열화).
        reportError("useWhyReasons", err);
        return null;
      }
    },
    enabled: opp != null && breakdown != null,
  });

  return data ? { reasons: data, isLlm: true } : { reasons: fallbackReasons, isLlm: false };
}
