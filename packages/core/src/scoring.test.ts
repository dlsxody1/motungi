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

  it("distance: 집이 회사보다 가까운 반대 방향도 min 적용", () => {
    const twoAnchors: UserAnchors = {
      home: here, // 가깝다(활동 위치와 동일 좌표)
      work: { point: { lat: 37.7, lng: 127.1 } }, // 멀다
    };
    const scored = scoreOpportunity(opp({ location: here }), answers, twoAnchors);
    // home 좌표가 활동 위치와 완전히 같으므로 거리 0km → 만점
    expect(scored.breakdown.distance).toBe(1);
  });

  it("distance: work 없이 home만 있어도 계산된다(하위호환)", () => {
    const homeOnly: UserAnchors = { home: here };
    const scored = scoreOpportunity(opp({ location: here }), answers, homeOnly);
    expect(scored.breakdown.distance).toBe(1);
  });

  it("distance: home 없이 work만 있어도 계산된다(하위호환)", () => {
    const workOnly: UserAnchors = { work: here };
    const scored = scoreOpportunity(opp({ location: here }), answers, workOnly);
    expect(scored.breakdown.distance).toBe(1);
  });

  it("distance: 앵커도 활동 좌표도 없으면 중립값 0.5", () => {
    const noAnchors: UserAnchors = {};
    const scored = scoreOpportunity(opp({}), answers, noAnchors);
    expect(scored.breakdown.distance).toBe(0.5);
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

  it("time: 퇴근후 코어(18~22시)와 완전히 일치하면 만점(1)", () => {
    const exact = scoreOpportunity(
      opp({ timeWindow: { startHour: 18, endHour: 22 } }),
      answers,
      anchors,
    );
    // overlapHours = min(22,22) - max(18,18) = 4, ratio = 4/4 = 1
    expect(exact.breakdown.time).toBe(1);
  });

  it("time: 전혀 겹치지 않으면 정확히 0", () => {
    const noOverlap = scoreOpportunity(
      opp({ timeWindow: { startHour: 9, endHour: 11 } }),
      answers,
      anchors,
    );
    // overlapHours = max(0, min(22,11) - max(18,9)) = max(0, -7) = 0
    expect(noOverlap.breakdown.time).toBe(0);
  });

  it("time: 부분 겹침은 겹친 시간 비율로 계산된다", () => {
    const partial = scoreOpportunity(
      opp({ timeWindow: { startHour: 21, endHour: 23 } }),
      answers,
      anchors,
    );
    // overlapHours = min(22,23) - max(18,21) = 22 - 21 = 1, ratio = 1 / (22-18) = 0.25
    expect(partial.breakdown.time).toBe(0.25);
  });

  it("time: timeWindow가 없으면 중립값 0.5", () => {
    const noWindow = scoreOpportunity(opp({}), answers, anchors);
    expect(noWindow.breakdown.time).toBe(0.5);
  });

  it("cost: 무료가 유료보다 높다", () => {
    const free = scoreOpportunity(opp({ costKrw: 0 }), answers, anchors);
    const paid = scoreOpportunity(opp({ costKrw: 40_000 }), answers, anchors);
    expect(free.breakdown.cost).toBeGreaterThan(paid.breakdown.cost);
  });

  it("cost: 무료(0원)는 정확히 만점(1)", () => {
    const free = scoreOpportunity(opp({ costKrw: 0 }), answers, anchors);
    expect(free.breakdown.cost).toBe(1);
  });

  it("cost: COST_CEILING_KRW(50,000원) 이상이면 정확히 0", () => {
    const atCeiling = scoreOpportunity(opp({ costKrw: 50_000 }), answers, anchors);
    const overCeiling = scoreOpportunity(opp({ costKrw: 120_000 }), answers, anchors);
    expect(atCeiling.breakdown.cost).toBe(0);
    expect(overCeiling.breakdown.cost).toBe(0);
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
