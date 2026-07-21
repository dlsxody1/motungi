import { describe, expect, it } from "vitest";
import type { DiagnosisAnswers } from "./diagnosis";
import type { Opportunity } from "./types";
import {
  buildMeta,
  deadlineLabel,
  decodeHtmlEntities,
  diagnosisSummaryChips,
  displayNameOf,
  ENERGY_LABEL,
  type OpportunityRow,
  rowToOpportunity,
  timeRangeLabel,
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

  // M-006: side_job은 costKrw가 벌이 성격 → '참가비/무료' 문구 금지, '예상 수입'으로.
  it("side_job은 '참가비' 대신 '예상 수입' 문구를 쓴다", () => {
    const r = whyReasons(opp({ category: "side_job", costKrw: 480_000 }), answers);
    const joined = r.join(" ");
    expect(joined).toContain("예상 수입");
    expect(joined).toContain("+48만 원");
    expect(joined).not.toContain("참가비");
  });

  it("side_job엔 '무료/참가비 없이' 문구를 붙이지 않는다(costKrw 0)", () => {
    const r = whyReasons(opp({ category: "side_job", costKrw: 0 }), answers);
    expect(r.join(" ")).not.toContain("참가비");
    expect(r.some((x) => x.includes("그냥 가면"))).toBe(false);
  });
});

describe("diagnosisSummaryChips — side_job 수입 톤(M-006)", () => {
  it("side_job 유료는 '가성비 중심'이 아니라 '용돈벌이'", () => {
    const chips = diagnosisSummaryChips(answers, opp({ category: "side_job", costKrw: 300_000 }));
    expect(chips).toContain("용돈벌이");
    expect(chips).not.toContain("가성비 중심");
  });

  it("일반 카테고리 유료는 여전히 '가성비 중심'", () => {
    const chips = diagnosisSummaryChips(answers, opp({ category: "culture", costKrw: 12000 }));
    expect(chips).toContain("가성비 중심");
  });
});

// M-007: DB row → Opportunity 변환의 부분 필드 분기(좌표/시간대는 쌍이 다 있어야 생성).
describe("decodeHtmlEntities", () => {
  it("단일·이중 이스케이프를 모두 원문으로 되돌린다", () => {
    expect(decodeHtmlEntities("&lt;a&gt;")).toBe("<a>");
    expect(decodeHtmlEntities("&amp;lt;a&amp;gt;")).toBe("<a>");
    expect(decodeHtmlEntities("A &amp;amp; B")).toBe("A & B");
  });
  it("순수 텍스트엔 무영향(멱등)", () => {
    expect(decodeHtmlEntities("동물의 세계 展")).toBe("동물의 세계 展");
    expect(decodeHtmlEntities("")).toBe("");
  });
});

describe("rowToOpportunity — 부분 필드", () => {
  function row(over: Partial<OpportunityRow> = {}): OpportunityRow {
    return {
      id: "r1",
      source: "seoul_culture",
      category: "culture",
      external_id: null,
      title: "t",
      summary: "s",
      cost_krw: null,
      difficulty: null,
      dong_name: null,
      lat: null,
      lng: null,
      cta_url: null,
      image_url: null,
      deadline: null,
      source_label: null,
      time_start_hour: null,
      time_end_hour: null,
      ...over,
    };
  }

  it("title·summary의 이중 이스케이프 엔티티를 디코드한다(#3)", () => {
    const o = rowToOpportunity(
      row({
        title: "쥬세뻬 비탈레 원화전 &amp;lt;동물의 세계&amp;gt;",
        summary: "&amp;quot;몬도 아니말레&amp;quot; 展",
      }),
    );
    expect(o.title).toBe("쥬세뻬 비탈레 원화전 <동물의 세계>");
    expect(o.summary).toBe('"몬도 아니말레" 展');
  });

  it("lat만/lng만 있으면 point는 undefined(둘 다 있어야 좌표)", () => {
    expect(rowToOpportunity(row({ lat: 37.5 })).location?.point).toBeUndefined();
    expect(rowToOpportunity(row({ lng: 127 })).location?.point).toBeUndefined();
  });

  it("lat·lng 둘 다 있으면 point를 생성한다", () => {
    expect(rowToOpportunity(row({ lat: 37.5, lng: 127 })).location?.point).toEqual({
      lat: 37.5,
      lng: 127,
    });
  });

  it("time_start만/time_end만 있으면 timeWindow는 undefined(둘 다 있어야)", () => {
    expect(rowToOpportunity(row({ time_start_hour: 18 })).timeWindow).toBeUndefined();
    expect(rowToOpportunity(row({ time_end_hour: 22 })).timeWindow).toBeUndefined();
  });

  it("time_start·time_end 둘 다 있으면 timeWindow를 생성한다", () => {
    expect(rowToOpportunity(row({ time_start_hour: 18, time_end_hour: 22 })).timeWindow).toEqual({
      startHour: 18,
      endHour: 22,
    });
  });

  it("null 필드는 undefined로 정규화한다(cost_krw/difficulty/dong_name)", () => {
    const o = rowToOpportunity(row());
    expect(o.costKrw).toBeUndefined();
    expect(o.difficulty).toBeUndefined();
    expect(o.location?.dongName).toBeUndefined();
  });
});

describe("timeRangeLabel", () => {
  it("timeWindow 없으면 null", () => {
    expect(timeRangeLabel(undefined)).toBeNull();
  });

  it("시작=종료면 단일 시각 '14시'", () => {
    expect(timeRangeLabel({ startHour: 14, endHour: 14 })).toBe("14시");
  });

  it("시작≠종료면 범위 '14–16시'", () => {
    expect(timeRangeLabel({ startHour: 14, endHour: 16 })).toBe("14–16시");
  });
});

describe("buildMeta — 시간대는 범위로", () => {
  it("timeWindow가 범위면 '시간대: 14–16시'", () => {
    const meta = buildMeta(opp({ timeWindow: { startHour: 14, endHour: 16 } }));
    expect(meta).toContainEqual({ label: "시간대", value: "14–16시" });
  });
});

describe("deadlineLabel", () => {
  it("deadline 없으면 null", () => {
    expect(deadlineLabel(undefined, "2026-07-21")).toBeNull();
  });

  it("미래 마감이면 D-day 양수·past=false·한글 날짜", () => {
    expect(deadlineLabel("2026-07-24", "2026-07-21")).toEqual({
      date: "7월 24일",
      dday: 3,
      past: false,
    });
  });

  it("오늘 마감이면 D-day 0", () => {
    expect(deadlineLabel("2026-07-21", "2026-07-21")).toMatchObject({ dday: 0, past: false });
  });

  it("지난 마감이면 past=true·음수 D-day", () => {
    expect(deadlineLabel("2026-07-19", "2026-07-21")).toMatchObject({ dday: -2, past: true });
  });

  it("타임존 무관하게 UTC 자정 기준 일수차만 센다(월경계)", () => {
    expect(deadlineLabel("2026-08-01", "2026-07-31")).toMatchObject({ dday: 1, date: "8월 1일" });
  });
});
