/**
 * 60초 진단 (기획서 §6) — 4문항.
 * Q1~Q3 선택 즉시 자동 진행, Q4는 명시적 CTA.
 */

export type JobGroup =
  | "office" // 사무/기획/마케팅
  | "design"
  | "dev"
  | "service"
  | "etc";

/** 퇴근 후 가용 시간대 */
export type TimeSlot = "weekday_evening" | "weekend" | "flexible";

/** 체력/에너지 성향 */
export type Energy = "drained" | "moderate" | "active"; // 방전형 / 보통 / 활동형

/** 목표 월 수익 구간(원) */
export type IncomeGoal = "under_30" | "30_to_50" | "50_to_100" | "over_100";

export interface DiagnosisAnswers {
  jobGroup: JobGroup;
  timeSlot: TimeSlot;
  energy: Energy;
  incomeGoal: IncomeGoal;
}

/** 진단 문항 정의 (UI가 참조). label 등 표시 문구는 앱단 i18n에서 확정. */
export const DIAGNOSIS_STEPS = [
  { key: "jobGroup", autoAdvance: true },
  { key: "timeSlot", autoAdvance: true },
  { key: "energy", autoAdvance: true },
  { key: "incomeGoal", autoAdvance: false },
] as const;

export type DiagnosisStepKey = (typeof DIAGNOSIS_STEPS)[number]["key"];

export function isDiagnosisComplete(
  partial: Partial<DiagnosisAnswers>,
): partial is DiagnosisAnswers {
  return (
    partial.jobGroup != null &&
    partial.timeSlot != null &&
    partial.energy != null &&
    partial.incomeGoal != null
  );
}
