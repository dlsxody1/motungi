/**
 * 60초 진단 — "퇴근하고 뭐하지?" 여가 큐레이션용.
 * Q1(관심사)·Q2(시간대) 선택 즉시 자동 진행, Q3(에너지)는 명시적 CTA.
 */

import type { OpportunityCategory } from "./types";

/** 관심 활동 축. 카테고리와 1:1로 매핑돼 fit 스코어에 직접 반영된다. */
export type Interest = OpportunityCategory;

/** 퇴근 후 가용 시간대 */
export type TimeSlot = "weekday_evening" | "weekend" | "flexible";

/** 체력/활동 강도 성향 */
export type Energy = "drained" | "moderate" | "active"; // 방전형 / 보통 / 활동형

export interface DiagnosisAnswers {
  /** 관심 카테고리(다중 선택). 최소 1개. */
  interests: Interest[];
  timeSlot: TimeSlot;
  energy: Energy;
}

/** 진단 문항 정의 (UI가 참조). label 등 표시 문구는 앱단에서 확정. */
export const DIAGNOSIS_STEPS = [
  { key: "interests", autoAdvance: false }, // 다중선택 → 명시적 다음
  { key: "timeSlot", autoAdvance: true },
  { key: "energy", autoAdvance: false },
] as const;

export type DiagnosisStepKey = (typeof DIAGNOSIS_STEPS)[number]["key"];

export function isDiagnosisComplete(
  partial: Partial<DiagnosisAnswers>,
): partial is DiagnosisAnswers {
  return (
    partial.interests != null &&
    partial.interests.length > 0 &&
    partial.timeSlot != null &&
    partial.energy != null
  );
}
