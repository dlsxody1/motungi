import { describe, expect, it } from "vitest";
import type { DiagnosisAnswers } from "./diagnosis";
import {
  DEFAULT_WEIGHTS,
  PREFILTERED_WEIGHTS,
  pickTop,
  scoreAll,
  scoreOpportunity,
} from "./scoring";
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

  it("입력 파생 타입 T를 보존한다(표시 필드가 붙은 항목) — M-012", () => {
    const near = opp({ id: "near", difficulty: 0.1, costKrw: 0, location: here });
    const tagged = { ...near, matchScore: 0, categoryLabel: "문화" };
    const result = pickTop([tagged], answers, anchors, 3);
    // opportunity가 원본 객체(파생 필드 포함)를 그대로 유지 → matchScore 채우기 가능
    expect(result[0]!.opportunity.categoryLabel).toBe("문화");
    expect(Math.round(result[0]!.score * 100)).toBeGreaterThan(0);
  });
});

describe("scoreAll", () => {
  const near = opp({ id: "near", difficulty: 0.1, costKrw: 0, location: here });
  const far = opp({
    id: "far",
    difficulty: 0.9,
    costKrw: 40_000,
    location: { point: { lat: 37.7, lng: 127.1 } },
  });

  it("자르지 않고 후보 전체를 점수 내림차순으로 반환(탐색 랭킹용)", () => {
    const result = scoreAll([far, near], answers, anchors);
    expect(result).toHaveLength(2); // pickTop과 달리 slice 없음
    expect(result[0]?.opportunity.id).toBe("near");
    expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score);
  });

  it("입력 파생 타입 T를 보존한다(표시 필드가 붙은 항목)", () => {
    const tagged = { ...near, matchScore: 0, categoryLabel: "문화" };
    const result = scoreAll([tagged], answers, anchors);
    // opportunity가 원본 객체(파생 필드 포함)를 그대로 유지 → matchScore 채우기 가능
    expect(result[0]!.opportunity.categoryLabel).toBe("문화");
    expect(Math.round(result[0]!.score * 100)).toBeGreaterThan(0);
  });

  it("pickTop은 scoreAll의 상위 N개와 동일하다", () => {
    const all = scoreAll([far, near], answers, anchors);
    const top1 = pickTop([far, near], answers, anchors, 1);
    expect(top1).toHaveLength(1);
    expect(top1[0]!.opportunity.id).toBe(all[0]!.opportunity.id);
  });

  it("빈 후보는 빈 배열", () => {
    expect(scoreAll([], answers, anchors)).toHaveLength(0);
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

  it("time: 부분 겹침은 활동 시간 대비 비율로 계산된다", () => {
    const partial = scoreOpportunity(
      opp({ timeWindow: { startHour: 21, endHour: 23 } }),
      answers,
      anchors,
    );
    // 21–23시 활동(2시간) 중 18–22시 창에 드는 건 21–22시 1시간 → 1/2 = 0.5.
    // 분모가 선호 창 폭(4h)이 아니라 활동 길이(2h)다 — 아래 "time 축 — 활동 길이 기준
    // 겹침" describe 참조(모르는 활동 0.5와 동점이 되던 문제).
    expect(partial.breakdown.time).toBe(0.5);
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

// M-007: difficulty 축은 energy 성향 허용치(tolerance)를 기준으로 감점한다.
describe("scoreOpportunity difficulty 축 — energy tolerance", () => {
  const drained = { ...answers, energy: "drained" as const }; // tolerance 0.3
  const moderate = { ...answers, energy: "moderate" as const }; // 0.6
  const active = { ...answers, energy: "active" as const }; // 1.0

  it("허용치 이내면 만점(1)", () => {
    expect(scoreOpportunity(opp({ difficulty: 0.2 }), drained, anchors).breakdown.difficulty).toBe(1);
    expect(scoreOpportunity(opp({ difficulty: 0.5 }), moderate, anchors).breakdown.difficulty).toBe(1);
  });

  it("경계값(difficulty === tolerance)도 만점(1)", () => {
    expect(scoreOpportunity(opp({ difficulty: 0.3 }), drained, anchors).breakdown.difficulty).toBe(1);
    expect(scoreOpportunity(opp({ difficulty: 0.6 }), moderate, anchors).breakdown.difficulty).toBe(1);
  });

  it("허용치 초과분만큼 정확히 감점(drained tol 0.3, difficulty 0.5 → 0.8)", () => {
    expect(
      scoreOpportunity(opp({ difficulty: 0.5 }), drained, anchors).breakdown.difficulty,
    ).toBeCloseTo(0.8);
  });

  it("초과가 커도 0 밑으로 안 내려간다(clamp)", () => {
    // drained tol 0.3, difficulty 1.0 → 1 - 0.7 = 0.3
    expect(
      scoreOpportunity(opp({ difficulty: 1 }), drained, anchors).breakdown.difficulty,
    ).toBeCloseTo(0.3);
  });

  it("difficulty 정보 없으면 중립(0.5)", () => {
    expect(scoreOpportunity(opp({}), drained, anchors).breakdown.difficulty).toBe(0.5);
  });

  it("active(허용치 1.0)는 최고 난이도도 만점", () => {
    expect(scoreOpportunity(opp({ difficulty: 1 }), active, anchors).breakdown.difficulty).toBe(1);
  });
});

// M-006: time 축이 진단 timeSlot을 반영한다.
describe("scoreOpportunity time 축 — timeSlot 분기", () => {
  const evening = opp({ timeWindow: { startHour: 19, endHour: 21 } });
  const daytime = opp({ timeWindow: { startHour: 13, endHour: 15 } });

  it("weekday_evening: 저녁 활동은 가점, 낮 활동은 0", () => {
    const a = { ...answers, timeSlot: "weekday_evening" as const };
    expect(scoreOpportunity(evening, a, anchors).breakdown.time).toBeGreaterThan(0);
    expect(scoreOpportunity(daytime, a, anchors).breakdown.time).toBe(0);
  });

  it("weekend: 낮 활동도 주말 창(12~22시)과 겹쳐 가점된다", () => {
    const a = { ...answers, timeSlot: "weekend" as const };
    // weekday_evening이면 0이던 낮 활동이 weekend 창에선 > 0.
    expect(scoreOpportunity(daytime, a, anchors).breakdown.time).toBeGreaterThan(0);
  });

  it("weekend: 오전 10~12시는 창 밖이라 0 — 어린이 프로그램 피크 구간을 걷어낸다", () => {
    const a = { ...answers, timeSlot: "weekend" as const };
    const morning = opp({ timeWindow: { startHour: 10, endHour: 12 } });
    expect(scoreOpportunity(morning, a, anchors).breakdown.time).toBe(0);
  });

  it("flexible: 시간 선호 없음 → 활동 시간대와 무관하게 중립(0.5)", () => {
    const a = { ...answers, timeSlot: "flexible" as const };
    expect(scoreOpportunity(evening, a, anchors).breakdown.time).toBe(0.5);
    expect(scoreOpportunity(daytime, a, anchors).breakdown.time).toBe(0.5);
  });
});

/**
 * 사전 필터가 fit을 무력화하는 문제(가중치 0.35가 상수) — PREFILTERED_WEIGHTS로 푼다.
 * 원픽 경로(loading)는 서버에서 관심 카테고리를 이미 걸러 남은 후보가 전부 fit=1.0이다.
 * 탐색(explore)은 전량을 받아 fit이 실제로 변별하므로 기본 가중치를 그대로 쓴다.
 */
describe("PREFILTERED_WEIGHTS — 사전 필터 경로의 가중치", () => {
  it("합이 1이다(기본 가중치와 동일한 정규화)", () => {
    const sum = Object.values(PREFILTERED_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("fit 가중치가 0 — 사전 필터로 이미 상수라 점수에 기여하지 못한다", () => {
    expect(PREFILTERED_WEIGHTS.fit).toBe(0);
  });

  it("죽은 fit 몫이 살아있는 네 축으로 갔다 — 전부 기본보다 커진다", () => {
    for (const axis of ["distance", "time", "difficulty", "cost"] as const) {
      expect(PREFILTERED_WEIGHTS[axis]).toBeGreaterThan(DEFAULT_WEIGHTS[axis]);
    }
  });

  it("같은 카테고리 후보들의 점수 차이가 기본 가중치보다 커진다", () => {
    // 관심 카테고리(culture)로 사전 필터된 상황: 둘 다 fit=1.0이고 거리만 다르다.
    const near = opp({ id: "near", location: here, costKrw: 0, difficulty: 0.1 });
    const far = opp({
      id: "far",
      location: { dongName: "먼동", point: { lat: 37.65, lng: 127.05 } },
      costKrw: 40000,
      difficulty: 0.9,
    });
    const gapDefault =
      scoreOpportunity(near, answers, anchors, DEFAULT_WEIGHTS).score -
      scoreOpportunity(far, answers, anchors, DEFAULT_WEIGHTS).score;
    const gapPrefiltered =
      scoreOpportunity(near, answers, anchors, PREFILTERED_WEIGHTS).score -
      scoreOpportunity(far, answers, anchors, PREFILTERED_WEIGHTS).score;
    // fit이 상수인 상황에서 나머지 축의 변별력이 커져야 한다.
    expect(gapPrefiltered).toBeGreaterThan(gapDefault);
  });

  it("탐색 경로(기본 가중치)는 여전히 fit으로 관심 밖 카테고리를 밀어낸다", () => {
    const interesting = opp({ id: "c", category: "culture", location: here });
    const notInteresting = opp({ id: "j", category: "side_job", location: here });
    const a = scoreOpportunity(interesting, answers, anchors).score;
    const b = scoreOpportunity(notInteresting, answers, anchors).score;
    expect(a).toBeGreaterThan(b);
  });
});

/**
 * time 축의 분모 문제 — 겹침을 "선호 창 폭"으로 나누면 활동이 선호 창보다 짧을 때
 * 만점을 받을 수 없다. 19–21시 활동은 퇴근후 창(18–22시, 4시간)과 2시간 겹쳐 0.5인데,
 * 시간 정보가 **아예 없는** 활동의 중립값도 0.5다 → 아는 것과 모르는 것이 동점이 된다
 * (실측 2026-09-03: 19시시작·20시시작·시간미상이 총점 77로 전부 같았다).
 * 분모를 활동 길이로 바꾸면 "이 활동 시간의 몇 %가 내가 원하는 시간대인가"가 된다.
 */
describe("time 축 — 활동 길이 기준 겹침", () => {
  const eveningAnswers: DiagnosisAnswers = { ...answers, timeSlot: "weekday_evening" };

  it("선호 창 안에 완전히 들어가면 만점 — 모름(0.5)보다 확실히 높다", () => {
    const inside = opp({ timeWindow: { startHour: 19, endHour: 21 } });
    const unknown = opp({});
    const a = scoreOpportunity(inside, eveningAnswers, anchors).breakdown.time;
    const b = scoreOpportunity(unknown, eveningAnswers, anchors).breakdown.time;
    expect(a).toBe(1);
    expect(a).toBeGreaterThan(b);
  });

  it("절반만 걸치면 0.5", () => {
    // 16–20시 활동: 18–22시 창과 18–20시(2시간) 겹침, 활동 길이는 4시간 → 0.5
    const half = opp({ timeWindow: { startHour: 16, endHour: 20 } });
    expect(scoreOpportunity(half, eveningAnswers, anchors).breakdown.time).toBe(0.5);
  });

  it("선호 창 밖이면 0", () => {
    const daytime = opp({ timeWindow: { startHour: 10, endHour: 12 } });
    expect(scoreOpportunity(daytime, eveningAnswers, anchors).breakdown.time).toBe(0);
  });

  it("선호 창보다 긴 활동도 걸친 만큼만 — 종일 행사가 만점이 되지 않는다", () => {
    // 9–21시(12시간) 활동: 18–21시 3시간 겹침 → 0.25
    const allDay = opp({ timeWindow: { startHour: 9, endHour: 21 } });
    expect(scoreOpportunity(allDay, eveningAnswers, anchors).breakdown.time).toBeCloseTo(0.25, 6);
  });

  it("길이가 0인 창은 0으로 나누지 않는다", () => {
    const zero = opp({ timeWindow: { startHour: 19, endHour: 19 } });
    const t = scoreOpportunity(zero, eveningAnswers, anchors).breakdown.time;
    expect(Number.isFinite(t)).toBe(true);
  });
});
