import { describe, expect, it } from "vitest";
import type { DiagnosisAnswers } from "./diagnosis";
import type { Opportunity } from "./types";
import {
  diagnosisSummaryChips,
  displayNameOf,
  ENERGY_LABEL,
  TIMESLOT_LABEL,
  whyReasons,
} from "./view";

const answers: DiagnosisAnswers = {
  interests: ["culture"],
  timeSlot: "weekday_evening",
  energy: "drained",
};

function opp(over: Partial<Opportunity>): Opportunity {
  return {
    id: over.id ?? "x",
    source: "seoul_culture",
    category: over.category ?? "culture",
    title: over.title ?? "t",
    summary: over.summary ?? "s",
    ...over,
  };
}

describe("displayNameOf", () => {
  it("uses displayName when present", () => {
    expect(displayNameOf({ displayName: "도윤" })).toBe("도윤");
  });
  it("falls back to 회원 when logged in without name", () => {
    expect(displayNameOf({})).toBe("회원");
  });
  it("falls back to 게스트 when null/undefined", () => {
    expect(displayNameOf(null)).toBe("게스트");
    expect(displayNameOf(undefined)).toBe("게스트");
  });
});

describe("diagnosisSummaryChips", () => {
  it("returns [] when answers is null", () => {
    expect(diagnosisSummaryChips(null)).toEqual([]);
    expect(diagnosisSummaryChips(undefined)).toEqual([]);
  });
  it("maps interest/timeslot/energy + default free cost chip", () => {
    expect(diagnosisSummaryChips(answers)).toEqual([
      "동네 문화·공연",
      TIMESLOT_LABEL.weekday_evening,
      ENERGY_LABEL.drained,
      "무료 위주",
    ]);
  });
  it("shows 가성비 중심 when opp has paid cost", () => {
    const chips = diagnosisSummaryChips(answers, opp({ costKrw: 12000 }));
    expect(chips[3]).toBe("가성비 중심");
  });
  it("shows 무료 위주 when opp cost is 0", () => {
    const chips = diagnosisSummaryChips(answers, opp({ costKrw: 0 }));
    expect(chips[3]).toBe("무료 위주");
  });
  it("skips interest chip when interests empty", () => {
    const chips = diagnosisSummaryChips({ ...answers, interests: [] });
    expect(chips).toEqual([TIMESLOT_LABEL.weekday_evening, ENERGY_LABEL.drained, "무료 위주"]);
  });
});

describe("whyReasons", () => {
  it("never returns empty even with minimal opp and no answers", () => {
    const r = whyReasons(opp({ category: "active" }), null);
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0]).toContain("동네 산책·운동");
  });
  it("caps at 3 reasons", () => {
    const r = whyReasons(
      opp({ category: "culture", difficulty: 0.2, costKrw: 0, timeWindow: { startHour: 19, endHour: 22 } }),
      answers,
    );
    expect(r.length).toBeLessThanOrEqual(3);
  });
  it("adds drained-friendly reason when energy=drained and difficulty low", () => {
    const r = whyReasons(opp({ difficulty: 0.2 }), answers);
    expect(r.some((x) => x.includes("방전형"))).toBe(true);
  });
  it("skips energy reason when difficulty missing", () => {
    const r = whyReasons(opp({}), answers);
    expect(r.some((x) => x.includes("방전형"))).toBe(false);
  });
  it("adds interest-match reason when category in interests", () => {
    const r = whyReasons(opp({ category: "culture" }), answers);
    expect(r.some((x) => x.includes("딱 취향"))).toBe(true);
  });
  it("adds evening reason for late timeWindow", () => {
    const r = whyReasons(opp({ timeWindow: { startHour: 19, endHour: 22 } }), null);
    expect(r.some((x) => x.includes("저녁 시간대"))).toBe(true);
  });
  it("free cost reason when costKrw 0", () => {
    const r = whyReasons(opp({ costKrw: 0 }), null);
    expect(r.some((x) => x.includes("참가비 없이") || x.includes("그냥 가면"))).toBe(true);
  });
  it("paid cost reason uses costLabel when costKrw > 0", () => {
    const r = whyReasons(opp({ costKrw: 12000 }), null);
    expect(r.some((x) => x.includes("참가비") && x.includes("12,000"))).toBe(true);
  });
});
