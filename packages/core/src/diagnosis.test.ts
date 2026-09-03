import { describe, expect, it } from "vitest";
import { draftToAnswers, isDiagnosisComplete, isValidDiagnosisAnswers } from "./diagnosis";

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

describe("draftToAnswers — M-049 Q1 다중선택", () => {
  it("2개 선택하면 둘 다 interests에 담긴다", () => {
    const draft = { 0: ["culture", "active"], 1: "weekday_evening", 2: "moderate" };
    const result = draftToAnswers(draft);
    expect(result).toEqual({
      interests: ["culture", "active"],
      timeSlot: "weekday_evening",
      energy: "moderate",
    });
  });

  it("전체 카테고리를 선택하면 6개 모두 담긴다", () => {
    const all = ["culture", "active", "side_job", "class", "food", "market"];
    const draft = { 0: all, 1: "weekend", 2: "active" };
    const result = draftToAnswers(draft);
    expect(result?.interests).toEqual(all);
  });

  it("0개 선택(빈 배열)이면 null", () => {
    const draft = { 0: [], 1: "weekend", 2: "active" };
    expect(draftToAnswers(draft)).toBeNull();
  });

  it("유효하지 않은 값이 섞여도 유효한 것만 걸러 남긴다", () => {
    const draft = { 0: ["culture", "not-a-real-category", "active"], 1: "weekend", 2: "active" };
    const result = draftToAnswers(draft);
    expect(result?.interests).toEqual(["culture", "active"]);
  });

  it("배열 전체가 무효값이면 null(0개 취급)", () => {
    const draft = { 0: ["not-real", "also-not-real"], 1: "weekend", 2: "active" };
    expect(draftToAnswers(draft)).toBeNull();
  });

  it("중복 선택은 한 번만 담긴다", () => {
    const draft = { 0: ["culture", "culture", "active"], 1: "weekend", 2: "active" };
    const result = draftToAnswers(draft);
    expect(result?.interests).toEqual(["culture", "active"]);
  });

  it("기존 단일 문자열 draft[0]도 하위호환으로 계속 통과한다", () => {
    const draft = { 0: "culture", 1: "weekday_evening", 2: "moderate" };
    const result = draftToAnswers(draft);
    expect(result).toEqual({
      interests: ["culture"],
      timeSlot: "weekday_evening",
      energy: "moderate",
    });
  });
});

describe("isValidDiagnosisAnswers — M-070", () => {
  it("완전하고 유효한 answers는 true다", () => {
    expect(
      isValidDiagnosisAnswers({
        interests: ["culture", "active"],
        timeSlot: "weekday_evening",
        energy: "moderate",
      }),
    ).toBe(true);
  });

  it("null/undefined/객체가 아닌 값은 false다", () => {
    expect(isValidDiagnosisAnswers(null)).toBe(false);
    expect(isValidDiagnosisAnswers(undefined)).toBe(false);
    expect(isValidDiagnosisAnswers("culture")).toBe(false);
    expect(isValidDiagnosisAnswers(42)).toBe(false);
  });

  it("interests가 배열이 아닌 구버전 스키마(M-049 이전 단일 string)는 크래시 없이 false다", () => {
    expect(
      isValidDiagnosisAnswers({
        interests: "culture",
        timeSlot: "weekday_evening",
        energy: "moderate",
      }),
    ).toBe(false);
  });

  it("interests가 빈 배열이면 false다", () => {
    expect(
      isValidDiagnosisAnswers({ interests: [], timeSlot: "weekday_evening", energy: "moderate" }),
    ).toBe(false);
  });

  it("interests에 유효하지 않은 카테고리가 섞이면 false다", () => {
    expect(
      isValidDiagnosisAnswers({
        interests: ["culture", "not_a_category"],
        timeSlot: "weekday_evening",
        energy: "moderate",
      }),
    ).toBe(false);
  });

  it("timeSlot·energy가 유효 멤버십을 벗어나면 false다", () => {
    expect(
      isValidDiagnosisAnswers({ interests: ["culture"], timeSlot: "evening", energy: "moderate" }),
    ).toBe(false);
    expect(
      isValidDiagnosisAnswers({ interests: ["culture"], timeSlot: "weekday_evening", energy: "low" }),
    ).toBe(false);
  });

  it("필드가 누락되면 false다", () => {
    expect(isValidDiagnosisAnswers({})).toBe(false);
    expect(isValidDiagnosisAnswers({ interests: ["culture"] })).toBe(false);
  });
});
