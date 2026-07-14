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

describe("scoreOpportunity 엣지케이스", () => {
  describe("cost: 무료/상한/선형 감쇠 경계", () => {
    it("cost=0(무료)이면 만점", () => {
      const scored = scoreOpportunity(opp({ costKrw: 0 }), answers, anchors);
      expect(scored.breakdown.cost).toBe(1);
    });

    it("cost가 COST_CEILING_KRW(50,000) 이상이면 0점", () => {
      const atCeiling = scoreOpportunity(opp({ costKrw: 50_000 }), answers, anchors);
      const overCeiling = scoreOpportunity(opp({ costKrw: 100_000 }), answers, anchors);
      expect(atCeiling.breakdown.cost).toBe(0);
      expect(overCeiling.breakdown.cost).toBe(0);
    });

    it("cost가 그 사이면 선형 감쇠(예: 25,000원 = 0.5)", () => {
      const scored = scoreOpportunity(opp({ costKrw: 25_000 }), answers, anchors);
      expect(scored.breakdown.cost).toBeCloseTo(0.5, 5);
    });
  });

  describe("time: 퇴근후 윈도우(18~22시) 경계", () => {
    it("endHour=18로 윈도우 시작점과 접하면 겹침 0", () => {
      const scored = scoreOpportunity(
        opp({ timeWindow: { startHour: 15, endHour: 18 } }),
        answers,
        anchors,
      );
      expect(scored.breakdown.time).toBe(0);
    });

    it("18~22시와 완전히 겹치면 만점", () => {
      const scored = scoreOpportunity(
        opp({ timeWindow: { startHour: 18, endHour: 22 } }),
        answers,
        anchors,
      );
      expect(scored.breakdown.time).toBe(1);
    });

    it("부분 겹침(20~23시)이면 겹치는 비율만큼 부분 점수", () => {
      const scored = scoreOpportunity(
        opp({ timeWindow: { startHour: 20, endHour: 23 } }),
        answers,
        anchors,
      );
      // overlap = min(22,23) - max(18,20) = 2h → 2/4 = 0.5
      expect(scored.breakdown.time).toBeCloseTo(0.5, 5);
    });

    it("timeWindow가 없으면(null) 중립 0.5", () => {
      const scored = scoreOpportunity(opp({ timeWindow: undefined }), answers, anchors);
      expect(scored.breakdown.time).toBe(0.5);
    });
  });

  describe("distance: 2앵커 min 거리", () => {
    it("home만 있을 때 home 기준 거리 산정", () => {
      const homeOnly: UserAnchors = { home: here };
      const scored = scoreOpportunity(opp({ location: here }), answers, homeOnly);
      expect(scored.breakdown.distance).toBeGreaterThan(0.9);
    });

    it("work만 있을 때 work 기준 거리 산정", () => {
      const workOnly: UserAnchors = { work: here };
      const scored = scoreOpportunity(opp({ location: here }), answers, workOnly);
      expect(scored.breakdown.distance).toBeGreaterThan(0.9);
    });

    it("둘 다 좌표 없으면 중립 0.5", () => {
      const noAnchors: UserAnchors = {};
      const scored = scoreOpportunity(opp({ location: here }), answers, noAnchors);
      expect(scored.breakdown.distance).toBe(0.5);
    });

    it("target 좌표가 없으면 중립 0.5", () => {
      const scored = scoreOpportunity(opp({ location: undefined }), answers, anchors);
      expect(scored.breakdown.distance).toBe(0.5);
    });

    it("두 앵커 중 실제로 가까운 쪽(min)이 선택된다 — work가 더 가까운 경우", () => {
      const farHome: UserAnchors = {
        home: { point: { lat: 37.7, lng: 127.1 } }, // 멀다
        work: here, // 가깝다
      };
      const nearWork = scoreOpportunity(opp({ location: here }), answers, farHome);

      const farWork: UserAnchors = {
        home: here, // 가깝다
        work: { point: { lat: 37.7, lng: 127.1 } }, // 멀다
      };
      const nearHome = scoreOpportunity(opp({ location: here }), answers, farWork);

      // 어느 쪽이 가깝든 min이 선택되므로 두 결과가 동일하게 높은 점수
      expect(nearWork.breakdown.distance).toBeCloseTo(nearHome.breakdown.distance, 5);
      expect(nearWork.breakdown.distance).toBeGreaterThan(0.9);
    });
  });

  describe("distance: clamp01 경계", () => {
    it("5km 초과 거리는 0으로 클램프된다(음수 방지)", () => {
      // 망원동 기준 약 15km 이상 떨어진 좌표
      const veryFar: UserAnchors = { home: { point: { lat: 37.7, lng: 127.3 } } };
      const scored = scoreOpportunity(opp({ location: here }), answers, veryFar);
      expect(scored.breakdown.distance).toBe(0);
      expect(scored.breakdown.distance).toBeGreaterThanOrEqual(0);
    });

    it("정확히 같은 좌표(거리 0)면 1을 초과하지 않는다", () => {
      const scored = scoreOpportunity(opp({ location: here }), answers, anchors);
      expect(scored.breakdown.distance).toBeLessThanOrEqual(1);
      expect(scored.breakdown.distance).toBe(1);
    });
  });

  describe("difficulty: 에너지별 tolerance 경계", () => {
    it("drained(tolerance=0.3): 정확히 0.3이면 만점, 초과하면 감점", () => {
      const atTolerance = scoreOpportunity(
        opp({ difficulty: 0.3 }),
        { ...answers, energy: "drained" },
        anchors,
      );
      const overTolerance = scoreOpportunity(
        opp({ difficulty: 0.5 }),
        { ...answers, energy: "drained" },
        anchors,
      );
      expect(atTolerance.breakdown.difficulty).toBe(1);
      expect(overTolerance.breakdown.difficulty).toBeCloseTo(0.8, 5);
    });

    it("moderate(tolerance=0.6): 정확히 0.6이면 만점, 초과하면 감점", () => {
      const atTolerance = scoreOpportunity(
        opp({ difficulty: 0.6 }),
        { ...answers, energy: "moderate" },
        anchors,
      );
      const overTolerance = scoreOpportunity(
        opp({ difficulty: 0.9 }),
        { ...answers, energy: "moderate" },
        anchors,
      );
      expect(atTolerance.breakdown.difficulty).toBe(1);
      expect(overTolerance.breakdown.difficulty).toBeCloseTo(0.7, 5);
    });

    it("active(tolerance=1.0): 최고 난이도(1.0)여도 만점(감점 없음)", () => {
      const scored = scoreOpportunity(
        opp({ difficulty: 1.0 }),
        { ...answers, energy: "active" },
        anchors,
      );
      expect(scored.breakdown.difficulty).toBe(1);
    });

    it("difficulty가 없으면(null) 중립 0.5", () => {
      const scored = scoreOpportunity(opp({ difficulty: undefined }), answers, anchors);
      expect(scored.breakdown.difficulty).toBe(0.5);
    });
  });
});
