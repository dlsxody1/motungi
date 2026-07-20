import { describe, expect, it } from "vitest";
import { draftToAnswers, isDiagnosisComplete } from "./diagnosis";

describe("draftToAnswers — M-012", () => {
  it("완전하고 유효한 draft는 올바른 DiagnosisAnswers를 반환한다", () => {
    const draft = { 0: "culture", 1: "weekday_evening", 2: "moderate" };
    const result = draftToAnswers(draft);
    expect(result).toEqual({
      interests: ["culture"],
      timeSlot: "weekday_evening",
      energy: "moderate",
    });
  });

  it("interests가 [undefined]로 새지 않는다: Q1 미선택", () => {
    const draft = { 1: "weekend", 2: "active" };
    const result = draftToAnswers(draft);
    expect(result).toBeNull();
  });

  it("interests가 [undefined]로 새지 않는다: draft[0]이 undefined", () => {
    const draft = { 0: undefined, 1: "weekend", 2: "active" };
    const result = draftToAnswers(draft);
    expect(result).toBeNull();
  });

  it("draft[0]이 유효하지 않은 카테고리 문자열이면 null", () => {
    const draft = { 0: "not-a-real-category", 1: "weekend", 2: "active" };
    expect(draftToAnswers(draft)).toBeNull();
  });

  it("timeSlot이 유효하지 않으면 null", () => {
    const draft = { 0: "culture", 1: "midnight", 2: "active" };
    expect(draftToAnswers(draft)).toBeNull();
  });

  it("energy가 유효하지 않으면 null", () => {
    const draft = { 0: "culture", 1: "weekend", 2: "hyperactive" };
    expect(draftToAnswers(draft)).toBeNull();
  });

  it("빈 draft는 null", () => {
    expect(draftToAnswers({})).toBeNull();
  });

  it("Q3(energy)만 빠져도 null", () => {
    const draft = { 0: "food", 1: "flexible" };
    expect(draftToAnswers(draft)).toBeNull();
  });

  it("모든 카테고리 값에 대해 왕복 변환된다", () => {
    for (const interest of ["culture", "active", "side_job", "class", "food", "market"] as const) {
      const draft = { 0: interest, 1: "flexible", 2: "drained" };
      const result = draftToAnswers(draft);
      expect(result).toEqual({ interests: [interest], timeSlot: "flexible", energy: "drained" });
    }
  });

  it("결과가 있으면 항상 isDiagnosisComplete를 통과한다(재사용 일관성)", () => {
    const draft = { 0: "market", 1: "weekend", 2: "active" };
    const result = draftToAnswers(draft);
    expect(result).not.toBeNull();
    expect(isDiagnosisComplete(result!)).toBe(true);
  });
});
