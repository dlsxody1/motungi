import { describe, expect, it } from "vitest";
import type { DiagnosisAnswers } from "./diagnosis";
import type { Opportunity } from "./types";
import {
  buildMeta,
  buildWhyReasonsPrompt,
  CATEGORY_LABEL,
  deadlineLabel,
  decodeHtmlEntities,
  diagnosisSummaryChips,
  displayNameOf,
  ENERGY_LABEL,
  EXPLORE_CATEGORY_FILTERS,
  normalizeDong,
  normalizeGu,
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

  // 실데이터 표본(2026-09-03): culture_info 제목에 &middot;가 3건 남아 화면에 그대로 떴다.
  it("&middot;를 가운뎃점으로 되돌린다", () => {
    expect(decodeHtmlEntities("산수&amp;middot;격물")).toBe("산수·격물");
    expect(decodeHtmlEntities("미디어&middot;아트")).toBe("미디어·아트");
  });

  // 개별 엔티티를 하나씩 추가하는 대신 수치 참조를 일반 규칙으로 처리한다 —
  // 다음에 나올 &#8226; 류도 코드 수정 없이 풀린다.
  it("수치 참조(10진·16진)를 일반 규칙으로 푼다", () => {
    expect(decodeHtmlEntities("&#39;따옴표&#39;")).toBe("'따옴표'");
    expect(decodeHtmlEntities("&amp;amp;#39;이중&amp;amp;#39;")).toBe("'이중'");
    expect(decodeHtmlEntities("&#x27;16진&#x27;")).toBe("'16진'");
    expect(decodeHtmlEntities("&#8226; 불릿")).toBe("• 불릿");
  });

  it("제어문자 범위는 풀지 않는다 — 널 문자를 화면에 심지 않는다", () => {
    expect(decodeHtmlEntities("&#0;")).toBe("&#0;");
    expect(decodeHtmlEntities("&#31;")).toBe("&#31;");
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
      course_start: null,
      course_end: null,
      course_notes: null,
      duration_min: null,
      is_loop: null,
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

  /**
   * 스코어링 전용 시간창(scoringWindow) — 표시용 timeWindow와 분리한 이유:
   * seoul_culture는 종료시각을 주지 않아 time_end_hour가 null 고정인데(어댑터가 일부러
   * 지어내지 않는다), 표시용과 같은 필드를 쓰면 파싱한 시작시각까지 함께 버려진다.
   * 실측(2026-09-03) 229행이 "시작만 있음"이라 time 축(가중치 0.15)이 통째로 죽어 있었다.
   * 추정 종료시각이 카드에 새면 안 되므로("14–16시" 같은 사실 아닌 표기) 필드를 나눈다.
   */
  it("time_start만 있어도 scoringWindow는 기본 지속시간으로 생성한다", () => {
    const o = rowToOpportunity(row({ time_start_hour: 19 }));
    expect(o.scoringWindow).toEqual({ startHour: 19, endHour: 21 });
    // 표시용은 여전히 없다 — 카드에 추정 시간대가 찍히면 안 된다.
    expect(o.timeWindow).toBeUndefined();
  });

  it("time_end가 실제로 있으면 scoringWindow도 그 실측값을 쓴다", () => {
    const o = rowToOpportunity(row({ time_start_hour: 18, time_end_hour: 22 }));
    expect(o.scoringWindow).toEqual({ startHour: 18, endHour: 22 });
  });

  it("time_start가 없으면 scoringWindow도 없다 — 시작시각까지 지어내지는 않는다", () => {
    expect(rowToOpportunity(row({ time_end_hour: 22 })).scoringWindow).toBeUndefined();
    expect(rowToOpportunity(row()).scoringWindow).toBeUndefined();
  });

  it("자정을 넘기는 시작시각은 24시로 자른다(23시 시작 → 23–24시)", () => {
    expect(rowToOpportunity(row({ time_start_hour: 23 })).scoringWindow).toEqual({
      startHour: 23,
      endHour: 24,
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

describe("normalizeDong — 행정동 → 사용자가 말하는 동네 이름", () => {
  // 규칙은 마이그레이션 0014의 SQL과 반드시 같아야 한다(GPS 결과와 검색 결과 표기 일치).
  it("번호를 뗀다", () => {
    expect(normalizeDong("개포1동")).toBe("개포동");
    expect(normalizeDong("역삼2동")).toBe("역삼동");
    expect(normalizeDong("상계10동")).toBe("상계동");
  });

  it("'제'와 중점 표기도 뗀다", () => {
    expect(normalizeDong("신사제1동")).toBe("신사동");
    expect(normalizeDong("상계3·4동")).toBe("상계동");
    expect(normalizeDong("면목제3·8동")).toBe("면목동");
  });

  it("'가'가 붙은 행정동도 동네 단위로 만든다", () => {
    expect(normalizeDong("금호1가동")).toBe("금호동");
    expect(normalizeDong("금호2·3가동")).toBe("금호동");
    expect(normalizeDong("성수1가제1동")).toBe("성수동");
  });

  it("'본동'은 '동'으로 바꿔 같은 동네로 묶는다", () => {
    expect(normalizeDong("중계본동")).toBe("중계동");
    expect(normalizeDong("일원본동")).toBe("일원동");
  });

  it("번호가 없는 이름은 그대로 둔다", () => {
    expect(normalizeDong("청담동")).toBe("청담동");
    expect(normalizeDong("망원동")).toBe("망원동");
    // 가회동의 '가'는 접미사가 아니라 이름의 일부 — 건드리면 안 된다.
    expect(normalizeDong("가회동")).toBe("가회동");
  });

  it("멱등이다", () => {
    for (const n of ["개포1동", "금호1가동", "중계본동", "청담동"]) {
      expect(normalizeDong(normalizeDong(n))).toBe(normalizeDong(n));
    }
  });
});

describe("normalizeGu — 지역 표기 병합", () => {
  it("null/빈값/공백은 null", () => {
    expect(normalizeGu(null)).toBeNull();
    expect(normalizeGu(undefined)).toBeNull();
    expect(normalizeGu("  ")).toBeNull();
  });

  it("'서울 ' 접두어를 걷어 같은 구로 병합", () => {
    expect(normalizeGu("종로구")).toBe("종로구");
    expect(normalizeGu("서울 종로구")).toBe("종로구");
    expect(normalizeGu("서울특별시 종로구")).toBe("종로구");
  });

  // 앵커 region으로 실제 유입되는 두 형태(히어로 캐러셀 구 매칭의 입력).
  // 검색 결과는 neighborhoods.sigungu 그대로라 bare, 인기 칩은 "서울 마포구" 형태.
  it("앵커 region의 두 유입 형태를 같은 구로 흡수한다", () => {
    expect(normalizeGu("마포구")).toBe("마포구"); // /api/neighborhoods sigungu
    expect(normalizeGu("서울 마포구")).toBe("마포구"); // POPULAR_NEIGHBORHOODS.region
  });

  it("수도권 시/군은 지자체명 유지", () => {
    expect(normalizeGu("경기 김포시")).toBe("김포시");
    expect(normalizeGu("인천 강화군")).toBe("강화군");
  });

  it("접두어만 있으면 그대로(구 없는 행)", () => {
    expect(normalizeGu("서울")).toBe("서울");
  });

  it("멱등 — 두 번 적용해도 동일", () => {
    expect(normalizeGu(normalizeGu("서울 마포구"))).toBe(normalizeGu("서울 마포구"));
  });
});

describe("normalizeDong — 분리동 번호 제거", () => {
  it("번호가 붙은 분리동은 번호를 걷어낸다", () => {
    expect(normalizeDong("역삼1동")).toBe("역삼동");
    expect(normalizeDong("논현2동")).toBe("논현동");
  });

  it("번호가 없으면 그대로", () => {
    expect(normalizeDong("망원동")).toBe("망원동");
  });

  it("멱등 — 두 번 적용해도 동일", () => {
    expect(normalizeDong(normalizeDong("역삼1동"))).toBe(normalizeDong("역삼1동"));
  });
});

describe("buildWhyReasonsPrompt — M-044 LLM 근거 생성 입력(breakdown 전용)", () => {
  const breakdown = { fit: 1, distance: 0.8, time: 0.5, difficulty: 1, cost: 0.5 };

  it("category/title/costHeading/costLabel/breakdown 5축이 프롬프트에 전부 포함된다", () => {
    const prompt = buildWhyReasonsPrompt({
      category: "culture",
      title: "동네 소극장 연극",
      costHeading: "참가비",
      costLabel: "무료",
      timeLabel: "19–21시",
      breakdown,
    });
    expect(prompt).toContain("동네 소극장 연극");
    expect(prompt).toContain("참가비");
    expect(prompt).toContain("무료");
    expect(prompt).toContain("19–21시");
    expect(prompt).toContain("1.00");
    expect(prompt).toContain("0.80");
    expect(prompt).toContain("0.50");
  });

  it("timeLabel이 null이면 시간대 줄 자체가 빠진다(빈 줄로 새지 않음)", () => {
    const prompt = buildWhyReasonsPrompt({
      category: "active",
      title: "한강 러닝",
      costHeading: "참가비",
      costLabel: "무료",
      timeLabel: null,
      breakdown,
    });
    expect(prompt).not.toContain("시간대:");
    expect(prompt.split("\n").some((l) => l.trim() === "")).toBe(false);
  });

  it("raw description/summary는 함수 시그니처에 아예 없다 — 원문을 프롬프트에 주입할 방법이 없다", () => {
    // WhyReasonsPromptInput은 description/summary 필드를 갖지 않는다. 타입 레벨 보장을
    // 런타임에서도 재확인: 입력에 억지로 끼워 넣어도(as any) 출력에 나타나지 않는다.
    const withRawFields = {
      category: "food" as const,
      title: "동네 국밥집",
      costHeading: "참가비",
      costLabel: "₩9,000",
      timeLabel: null,
      breakdown,
      description: "이 집은 미슐랭 3스타이고 백종원이 극찬했다",
      summary: "완전 대박 맛집 실화냐",
    };
    const prompt = buildWhyReasonsPrompt(withRawFields);
    expect(prompt).not.toContain("미슐랭");
    expect(prompt).not.toContain("백종원");
    expect(prompt).not.toContain("대박");
  });

  it("모델에게 점수 밖 사실을 지어내지 말라는 지시가 프롬프트에 포함된다", () => {
    const prompt = buildWhyReasonsPrompt({
      category: "market",
      title: "주말 플리마켓",
      costHeading: "참가비",
      costLabel: "무료",
      timeLabel: null,
      breakdown,
    });
    expect(prompt).toMatch(/지어내지 마세요/);
  });
});

// M-080: web(explore-filters.ts)·mobile(explore.tsx)이 각자 들고 있던 탐색 필터
// taxonomy를 core 단일 출처로 승격. "전체"(category: null) 포함 7개, 순서 고정.
describe("EXPLORE_CATEGORY_FILTERS — 탐색 필터 taxonomy 단일 출처(M-080)", () => {
  it("전체 포함 7개 항목을, web/mobile 원본과 동일한 순서·라벨·카테고리로 갖는다", () => {
    expect(EXPLORE_CATEGORY_FILTERS).toEqual([
      { label: "전체", category: null },
      { label: "문화·공연", category: "culture" },
      { label: "운동·산책", category: "active" },
      { label: "먹거리·마켓", category: "food" },
      { label: "클래스", category: "class" },
      { label: "마켓", category: "market" },
      { label: "부업", category: "side_job" },
    ]);
  });

  it("첫 항목만 category:null('전체'), 나머지는 전부 값이 있다", () => {
    expect(EXPLORE_CATEGORY_FILTERS[0]?.category).toBeNull();
    expect(EXPLORE_CATEGORY_FILTERS.slice(1).every((f) => f.category != null)).toBe(true);
  });

  it("CATEGORY_LABEL(카드 태그용)과는 다른 매핑이다 — 병합하지 않는다", () => {
    // CATEGORY_LABEL은 6개 카테고리 전부(레코드), EXPLORE_CATEGORY_FILTERS는 "전체"를 포함한
    // 7개 배열이고 라벨 문구도 다르다(예: culture → "동네 문화·공연" vs "문화·공연").
    expect(Object.keys(CATEGORY_LABEL)).toHaveLength(6);
    expect(EXPLORE_CATEGORY_FILTERS).toHaveLength(7);
    const cultureFilterLabel = EXPLORE_CATEGORY_FILTERS.find((f) => f.category === "culture")?.label;
    expect(cultureFilterLabel).toBe("문화·공연");
    expect(cultureFilterLabel).not.toBe(CATEGORY_LABEL.culture);
  });
});
