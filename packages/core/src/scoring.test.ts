import { describe, expect, it } from "vitest";
import type { DiagnosisAnswers } from "./diagnosis";
import { pickTop } from "./scoring";
import type { Location, Opportunity } from "./types";

const answers: DiagnosisAnswers = {
  jobGroup: "office",
  timeSlot: "weekend",
  energy: "drained",
  incomeGoal: "30_to_50",
};

const here: Location = { dongName: "망원동", point: { lat: 37.556, lng: 126.91 } };

function opp(over: Partial<Opportunity>): Opportunity {
  return {
    id: over.id ?? "x",
    source: "affiliate_feed",
    category: "side_job",
    title: over.title ?? "t",
    summary: "s",
    ...over,
  };
}

describe("pickTop", () => {
  it("상위 N개만, 점수 내림차순으로 반환", () => {
    const near = opp({ id: "near", difficulty: 0.1, estimatedIncomeKrw: 500_000, location: here });
    const far = opp({
      id: "far",
      difficulty: 0.9,
      estimatedIncomeKrw: 100_000,
      location: { point: { lat: 37.7, lng: 127.1 } },
    });
    const result = pickTop([far, near], answers, here, 3);
    expect(result).toHaveLength(2);
    expect(result[0]?.opportunity.id).toBe("near");
    expect(result[0]!.score).toBeGreaterThan(result[1]!.score);
  });

  it("빈 후보는 빈 결과", () => {
    expect(pickTop([], answers, here)).toHaveLength(0);
  });
});
