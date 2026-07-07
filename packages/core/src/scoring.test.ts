import { describe, expect, it } from "vitest";
import type { DiagnosisAnswers } from "./diagnosis";
import { pickTop, scoreOpportunity } from "./scoring";
import type { Location, Opportunity, UserAnchors } from "./types";

const answers: DiagnosisAnswers = {
  interests: ["culture", "active"],
  timeSlot: "weekday_evening",
  energy: "drained",
};

const here: Location = { dongName: "망원동", point: { lat: 37.556, lng: 126.91 } };
const anchors: UserAnchors = { home: here };

function opp(over: Partial<Opportunity>): Opportunity {
  return {
    id: over.id ?? "x",
    source: "seoul_culture",
    category: "culture",
    title: over.title ?? "t",
    summary: "s",
    ...over,
  };
}

describe("pickTop", () => {
  it("상위 N개만, 점수 내림차순으로 반환", () => {
    const near = opp({ id: "near", difficulty: 0.1, costKrw: 0, location: here });
    const far = opp({
      id: "far",
      difficulty: 0.9,
      costKrw: 40_000,
      location: { point: { lat: 37.7, lng: 127.1 } },
    });
    const result = pickTop([far, near], answers, anchors, 3);
    expect(result).toHaveLength(2);
    expect(result[0]?.opportunity.id).toBe("near");
    expect(result[0]!.score).toBeGreaterThan(result[1]!.score);
  });

  it("빈 후보는 빈 결과", () => {
    expect(pickTop([], answers, anchors)).toHaveLength(0);
  });
});

describe("scoreOpportunity 축", () => {
  it("fit: 관심사에 포함된 카테고리가 미포함보다 높다", () => {
    const inInterest = scoreOpportunity(opp({ category: "culture" }), answers, anchors);
    const outInterest = scoreOpportunity(opp({ category: "food" }), answers, anchors);
    expect(inInterest.breakdown.fit).toBeGreaterThan(outInterest.breakdown.fit);
  });

  it("distance: 집·회사 중 가까운 앵커로 거리 산정(min)", () => {
    const twoAnchors: UserAnchors = {
      home: { point: { lat: 37.7, lng: 127.1 } }, // 멀다
      work: here, // 가깝다
    };
    const scored = scoreOpportunity(opp({ location: here }), answers, twoAnchors);
    // work 앵커가 바로 위라 거의 만점
    expect(scored.breakdown.distance).toBeGreaterThan(0.9);
  });

  it("time: 퇴근후 18~22시와 겹치는 시간대가 낮 시간대보다 높다", () => {
    const evening = scoreOpportunity(
      opp({ timeWindow: { startHour: 19, endHour: 21 } }),
      answers,
      anchors,
    );
    const daytime = scoreOpportunity(
      opp({ timeWindow: { startHour: 10, endHour: 12 } }),
      answers,
      anchors,
    );
    expect(evening.breakdown.time).toBeGreaterThan(daytime.breakdown.time);
    expect(daytime.breakdown.time).toBe(0);
  });

  it("cost: 무료가 유료보다 높다", () => {
    const free = scoreOpportunity(opp({ costKrw: 0 }), answers, anchors);
    const paid = scoreOpportunity(opp({ costKrw: 40_000 }), answers, anchors);
    expect(free.breakdown.cost).toBeGreaterThan(paid.breakdown.cost);
  });

  it("cost: side_job은 벌이 성격이라 비용 감점 대상이 아님(중립)", () => {
    const sideJob = scoreOpportunity(
      opp({ category: "side_job", costKrw: 480_000 }),
      { ...answers, interests: ["side_job"] },
      anchors,
    );
    expect(sideJob.breakdown.cost).toBe(0.5);
  });
});
