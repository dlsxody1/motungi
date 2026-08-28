import { useEffect, useState } from "react";
import {
  scoreOpportunity,
  timeRangeLabel,
  whyReasons,
  type DiagnosisAnswers,
  type UserAnchors,
  type WhyReasonsPromptInput,
} from "@motungi/core";
import type { MockOpportunity } from "@/data/opportunities";

export interface WhyReasonsView {
  reasons: string[];
  /** true면 LLM 산문으로 교체된 것, false면 규칙기반(whyReasons) 폴백. */
  isLlm: boolean;
}

/**
 * "왜 맞을까요" 근거의 모바일판(M-055). 웹 useWhyReasons.ts와 동일 계약 — 규칙기반
 * whyReasons()를 즉시 반환해 화면을 블로킹하지 않고, 웹 오리진의 /api/why-reasons가
 * 성공하면 LLM 산문으로 교체한다. 모바일엔 react-query가 없으므로(M-045 notes와 동일한
 * 제약) plain useState/useEffect로 재구현한다 — apps/mobile/lib/geo.ts와 같은
 * "상대경로 /api가 없으니 EXPO_PUBLIC_WEB_ORIGIN 경유" 패턴을 재사용한다.
 *
 * WEB_ORIGIN은 함수 내부에서 매 호출 시 읽는다(geo.ts는 모듈 top-level에서 캡처하지만,
 * 여기선 원본/폴백 두 경로 모두를 테스트로 고정하기 위해 의도적으로 다르게 뒀다 — Expo
 * 번들러가 EXPO_PUBLIC_*을 빌드타임에 정적 치환하므로 런타임 동작은 동일하다).
 */
export function useWhyReasons(
  opp: MockOpportunity | null,
  answers: DiagnosisAnswers | null,
  anchors: UserAnchors,
): WhyReasonsView {
  const fallbackReasons = opp ? whyReasons(opp, answers) : [];
  const breakdown = opp && answers ? scoreOpportunity(opp, answers, anchors).breakdown : null;

  const [llmReasons, setLlmReasons] = useState<string[] | null>(null);

  const oppId = opp?.id ?? null;
  const breakdownKey = breakdown ? JSON.stringify(breakdown) : null;

  useEffect(() => {
    setLlmReasons(null);

    const webOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN;
    if (!opp || !breakdown || !webOrigin) return;

    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`${webOrigin}/api/why-reasons`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            category: opp.category,
            title: opp.title,
            costHeading: opp.costHeading,
            costLabel: opp.costLabel,
            timeLabel: timeRangeLabel(opp.timeWindow),
            breakdown,
          } satisfies WhyReasonsPromptInput),
          signal: controller.signal,
        });
        if (cancelled || !res.ok) return;
        const json = (await res.json()) as { fallback: boolean; reasons?: string[] };
        if (!cancelled && !json.fallback && Array.isArray(json.reasons) && json.reasons.length > 0) {
          setLlmReasons(json.reasons);
        }
      } catch {
        // 화면은 이미 규칙기반 문구를 렌더하고 있다 — 우아한 열화, 에러 노출 없음.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppId, breakdownKey]);

  return llmReasons ? { reasons: llmReasons, isLlm: true } : { reasons: fallbackReasons, isLlm: false };
}
