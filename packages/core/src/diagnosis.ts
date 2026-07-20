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

const VALID_INTERESTS: ReadonlySet<Interest> = new Set([
  "culture",
  "active",
  "side_job",
  "class",
  "food",
  "market",
]);
const VALID_TIME_SLOTS: ReadonlySet<TimeSlot> = new Set([
  "weekday_evening",
  "weekend",
  "flexible",
]);
const VALID_ENERGIES: ReadonlySet<Energy> = new Set(["drained", "moderate", "active"]);

/**
 * 진단 화면(web/mobile)의 draft 상태를 검증된 DiagnosisAnswers로 변환한다.
 * draft는 DIAGNOSIS_STEPS 순서(0=interests·1=timeSlot·2=energy)의 문항 인덱스를 키로,
 * 선택된 옵션 value(string)를 값으로 갖는다(미선택 시 undefined 가능).
 * Q1(interests)은 UI가 단일 선택이라 draft[0]는 문자열 하나지만, DiagnosisAnswers.interests는
 * 배열이므로 값 검증 후에만 [interest]로 감싼다 — 미완료/미검증 값이 배열에 undefined로 섞이지 않는다.
 * 완료되지 않았거나 유효하지 않은 값이 있으면 null을 반환한다.
 */
export function draftToAnswers(
  draft: Record<number, string | undefined>,
): DiagnosisAnswers | null {
  const interestRaw = draft[0];
  const timeSlotRaw = draft[1];
  const energyRaw = draft[2];

  const interest =
    interestRaw != null && VALID_INTERESTS.has(interestRaw as Interest)
      ? (interestRaw as Interest)
      : undefined;
  const timeSlot =
    timeSlotRaw != null && VALID_TIME_SLOTS.has(timeSlotRaw as TimeSlot)
      ? (timeSlotRaw as TimeSlot)
      : undefined;
  const energy =
    energyRaw != null && VALID_ENERGIES.has(energyRaw as Energy)
      ? (energyRaw as Energy)
      : undefined;

  const candidate: Partial<DiagnosisAnswers> = {
    interests: interest != null ? [interest] : undefined,
    timeSlot,
    energy,
  };

  return isDiagnosisComplete(candidate) ? candidate : null;
}
