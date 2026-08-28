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
 * draft는 DIAGNOSIS_STEPS 순서(0=interests·1=timeSlot·2=energy)의 문항 인덱스를 키로 갖는다.
 * Q1(interests, M-049부터 다중선택)은 draft[0]에 문자열 배열을 받는다 — 유효한 카테고리만
 * 걸러 남기고(순서 보존, 중복 제거), 0개면 미선택으로 취급해 null을 반환한다. 기존 단일
 * 문자열 draft[0](하위호환)도 받아 [interest] 하나로 감싼다. Q2·Q3는 여전히 단일 문자열이다.
 * 완료되지 않았거나 유효하지 않은 값이 있으면 null을 반환한다.
 */
export function draftToAnswers(
  draft: Record<number, string | string[] | undefined>,
): DiagnosisAnswers | null {
  const interestRaw = draft[0];
  const timeSlotRaw = draft[1];
  const energyRaw = draft[2];

  const interestCandidates: string[] = Array.isArray(interestRaw)
    ? interestRaw
    : interestRaw != null
      ? [interestRaw]
      : [];
  const interests = Array.from(
    new Set(interestCandidates.filter((v): v is Interest => VALID_INTERESTS.has(v as Interest))),
  );
  const timeSlot =
    typeof timeSlotRaw === "string" && VALID_TIME_SLOTS.has(timeSlotRaw as TimeSlot)
      ? (timeSlotRaw as TimeSlot)
      : undefined;
  const energy =
    typeof energyRaw === "string" && VALID_ENERGIES.has(energyRaw as Energy)
      ? (energyRaw as Energy)
      : undefined;

  const candidate: Partial<DiagnosisAnswers> = {
    interests: interests.length > 0 ? interests : undefined,
    timeSlot,
    energy,
  };

  return isDiagnosisComplete(candidate) ? candidate : null;
}
