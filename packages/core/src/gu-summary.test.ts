/**
 * 구(區) 단위 집계 단위 테스트.
 *
 * 여기서 고정하려는 건 **숫자의 정직함**이다. 이 집계 결과는 그대로 산문이 되어
 * 답변 엔진에 인용된다(M-073). 그래서 "환각 금지"가 스타일 문제가 아니라 계약이다 —
 * 세지 않은 걸 세었다고 하거나, 임계 미달 구를 페이지로 만들면 그게 곧 오보다.
 */
import { describe, expect, it } from "vitest";
import type { MockOpportunity } from "./catalog";
import {
  GU_MIN_ACTIVITIES,
  SEOUL_GU,
  guFaqs,
  isSeoulGu,
  summarizeGu,
  summarySentence,
} from "./gu-summary";

/** 최소 형태의 활동 1건. 집계가 보는 필드만 채운다. */
function opp(over: Partial<MockOpportunity> = {}): MockOpportunity {
  return {
    id: "op-1",
    source: "seoul_culture",
    category: "culture",
    title: "동네 전시",
    summary: "",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 90,
    meta: [],
    tone: "brand",
    location: { dongName: "종로구" },
    ...over,
  } as MockOpportunity;
}

describe("isSeoulGu", () => {
  it("서울 25구를 알아본다", () => {
    expect(isSeoulGu("종로구")).toBe(true);
    expect(isSeoulGu("강남구")).toBe(true);
    expect(SEOUL_GU).toHaveLength(25);
  });

  it("시도 접두사가 붙어 있어도 알아본다 — 적재 소스가 표기를 통일하지 않는다", () => {
    // 실측(2026-09-03): 같은 구가 "종로구"와 "서울 종로구"로 분열돼 있다.
    expect(isSeoulGu("서울 종로구")).toBe(true);
    expect(isSeoulGu("서울특별시 마포구")).toBe(true);
  });

  it("경기·인천은 제외한다 — 이번 범위는 서울 구뿐이다", () => {
    expect(isSeoulGu("파주시")).toBe(false);
    expect(isSeoulGu("경기 수원시")).toBe(false);
    expect(isSeoulGu(null)).toBe(false);
    expect(isSeoulGu("")).toBe(false);
  });
});

describe("summarizeGu", () => {
  it("같은 구의 표기 분열을 하나로 합친다", () => {
    // 실측(2026-09-03): "종로구"·"서울 종로구"가 따로 집계되는 정규화 문제가 데이터에 있다.
    // 합쳐서 임계를 넘는지가 핵심 — 분열된 채로면 각각 임계 미달로 전부 사라진다.
    const out = summarizeGu([
      opp({ id: "a", location: { dongName: "종로구" } }),
      opp({ id: "b", location: { dongName: "서울 종로구" } }),
      opp({ id: "c", location: { dongName: "서울특별시 종로구" } }),
      opp({ id: "d", location: { dongName: "서울 종로구" } }),
      opp({ id: "e", location: { dongName: "종로구" } }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.gu).toBe("종로구");
    expect(out[0]!.total).toBe(5);
  });

  it("무료 개수는 costKrw === 0 만 센다 — 비용 미상(null)은 무료가 아니다", () => {
    const out = summarizeGu([
      opp({ id: "a", costKrw: 0 }),
      opp({ id: "b", costKrw: 12000 }),
      opp({ id: "c", costKrw: null as unknown as number }),
      opp({ id: "d", costKrw: 3000 }),
      opp({ id: "e", costKrw: 8000 }),
    ]);
    expect(out[0]!.total).toBe(5);
    expect(out[0]!.freeCount).toBe(1);
  });

  it("임계 미달 구는 아예 내보내지 않는다 — 빈약한 페이지를 만들지 않기 위해", () => {
    const few = Array.from({ length: GU_MIN_ACTIVITIES - 1 }, (_, i) =>
      opp({ id: `x${i}`, location: { dongName: "도봉구" } }),
    );
    expect(summarizeGu(few)).toHaveLength(0);

    const enough = Array.from({ length: GU_MIN_ACTIVITIES }, (_, i) =>
      opp({ id: `y${i}`, location: { dongName: "도봉구" } }),
    );
    expect(summarizeGu(enough)).toHaveLength(1);
  });

  it("서울 밖·동네 정보 없는 활동은 집계에서 빠진다", () => {
    const out = summarizeGu([
      ...Array.from({ length: 5 }, (_, i) => opp({ id: `s${i}` })),
      opp({ id: "gg", location: { dongName: "경기 파주시" } }),
      opp({ id: "none", location: undefined }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.gu).toBe("종로구");
    expect(out[0]!.total).toBe(5);
  });

  it("활동이 많은 구부터 정렬한다", () => {
    const out = summarizeGu([
      ...Array.from({ length: 5 }, (_, i) => opp({ id: `a${i}`, location: { dongName: "중구" } })),
      ...Array.from({ length: 9 }, (_, i) => opp({ id: `b${i}`, location: { dongName: "마포구" } })),
    ]);
    expect(out.map((s) => s.gu)).toEqual(["마포구", "중구"]);
  });

  it("최다 카테고리를 라벨과 함께 준다", () => {
    const out = summarizeGu([
      ...Array.from({ length: 4 }, (_, i) =>
        opp({ id: `c${i}`, category: "active", categoryLabel: "동네 산책·운동" }),
      ),
      opp({ id: "z", category: "culture", categoryLabel: "동네 문화·공연" }),
    ]);
    expect(out[0]!.topCategoryLabel).toBe("동네 산책·운동");
  });

  it("빈 입력에 터지지 않는다", () => {
    expect(summarizeGu([])).toEqual([]);
  });
});

describe("summarySentence", () => {
  it("집계 숫자를 그대로 문장에 옮긴다 — 어떤 수치도 지어내지 않는다", () => {
    const [s] = summarizeGu(
      Array.from({ length: 6 }, (_, i) => opp({ id: `n${i}`, costKrw: i < 2 ? 0 : 5000 })),
    );
    const line = summarySentence(s!);
    expect(line).toContain("종로구");
    expect(line).toContain("6"); // total
    expect(line).toContain("2"); // freeCount
    expect(line).toContain("동네 문화·공연");
  });

  it("무료가 0건이면 무료 문장을 아예 넣지 않는다 — 0건을 자랑하지 않는다", () => {
    const [s] = summarizeGu(
      Array.from({ length: 5 }, (_, i) => opp({ id: `p${i}`, costKrw: 9000 })),
    );
    expect(summarySentence(s!)).not.toContain("무료");
  });

  /**
   * 조사 오류는 사소해 보이지만, 인용됐을 때 문장이 대뜸 기계처럼 읽힌다.
   * 받침 있는 라벨("공연")과 없는 라벨("산책")이 둘 다 자연스러워야 한다.
   */
  it("받침에 맞는 서술격 조사를 붙인다", () => {
    const withBatchim = summarizeGu(
      Array.from({ length: 5 }, (_, i) =>
        opp({ id: `b${i}`, categoryLabel: "동네 문화·공연" }),
      ),
    );
    expect(summarySentence(withBatchim[0]!)).toContain("동네 문화·공연이다");

    // "먹거리"는 받침이 없다 — "먹거리이다"가 되면 어색하다.
    const noBatchim = summarizeGu(
      Array.from({ length: 5 }, (_, i) =>
        opp({ id: `n${i}`, category: "food", categoryLabel: "동네 먹거리" }),
      ),
    );
    expect(summarySentence(noBatchim[0]!)).toContain("동네 먹거리다");
    expect(summarySentence(noBatchim[0]!)).not.toContain("먹거리이다");
  });
});

/**
 * guFaqs — FAQPage로 나갈 Q&A (M-095).
 *
 * 여기서 고정하는 계약은 하나다: **답할 근거가 없으면 질문을 만들지 않는다.**
 * "무료로 뭘 하나요?" → "없습니다"를 구조화 데이터로 내보내는 건 검색에서 들어온
 * 사람에게도, 리치 결과로도 최악이다. 나머지 단언은 전부 "지어내지 않았는가"다.
 */
describe("guFaqs", () => {
  const summary = { gu: "종로구", total: 10, freeCount: 4, topCategoryLabel: "동네 문화·공연" };

  it("무료 활동이 0개면 무료 질문 자체를 만들지 않는다", () => {
    const paid = Array.from({ length: 5 }, (_, i) => opp({ id: `p${i}`, costKrw: 15_000 }));
    const faqs = guFaqs({ ...summary, freeCount: 0 }, paid);

    expect(faqs.some((f) => f.q.includes("무료"))).toBe(false);
    // 카테고리 질문은 집계만으로 답할 수 있으니 남는다 — 빈 배열이 되진 않는다.
    expect(faqs.length).toBeGreaterThan(0);
  });

  it("무료 활동 이름을 실제 카탈로그에서 최대 3개까지 넣는다", () => {
    const free = ["가", "나", "다", "라"].map((t, i) => opp({ id: `f${i}`, title: t, costKrw: 0 }));
    const answer = guFaqs(summary, free).find((f) => f.q.includes("무료"))!.a;

    expect(answer).toContain("가·나·다");
    // 4번째는 넣지 않는다 — 문장이 목록처럼 길어지면 인용되지 않는다.
    expect(answer).not.toContain("라");
    expect(answer).toContain("4개");
  });

  it("시작 시각을 모르는 활동은 '퇴근 후 가능'으로 세지 않는다", () => {
    const items = [
      opp({ id: "t1", timeWindow: { startHour: 19, endHour: 21 } }),
      // 시작 시각 미상 — seoul_culture 상당수가 이 상태다. 모르는 걸 아는 척하지 않는다.
      opp({ id: "t2", timeWindow: undefined }),
      opp({ id: "t3", timeWindow: { startHour: 10, endHour: 12 } }),
    ];
    const answer = guFaqs(summary, items).find((f) => f.q.includes("퇴근"))!.a;

    expect(answer).toContain("1개");
    // 그 사실을 답변이 직접 밝힌다 — 수를 부풀리지 않았음을 독자가 알 수 있게.
    expect(answer).toContain("표기되지 않은");
  });

  it("퇴근 후 활동이 하나도 없으면 그 질문을 만들지 않는다", () => {
    const daytime = [opp({ id: "d1", timeWindow: { startHour: 10, endHour: 12 } })];
    expect(guFaqs(summary, daytime).some((f) => f.q.includes("퇴근"))).toBe(false);
  });

  it("모든 답변이 실제 집계 수치를 쓴다 — 하드코딩된 숫자가 없다", () => {
    const items = Array.from({ length: 3 }, (_, i) => opp({ id: `c${i}`, costKrw: 0 }));
    const faqs = guFaqs({ ...summary, total: 42 }, items);

    expect(faqs.find((f) => f.q.includes("종류"))!.a).toContain("42개");
    // 구 이름이 모든 질문에 들어간다 — 답변 엔진이 맥락 없이 떼어가도 성립해야 한다.
    expect(faqs.every((f) => f.q.includes("종로구"))).toBe(true);
  });

  /**
   * 실측 회귀(강서구, 2026-09-03): 답변이 "가장 많은 갈래는 퇴근후 부업이다.
   * 전시·공연·강좌·운동·산책길을 모아…"였다. 앞 문장의 실측값이 뒤 문장의 하드코딩
   * 목록에 없어서, 한 답변 안에서 자기모순이 났다. 고정 나열을 다시 넣지 못하게 막는다.
   */
  it("갈래를 하드코딩해 나열하지 않는다 — 집계값과 어긋날 수 있다", () => {
    const answer = guFaqs(
      { ...summary, topCategoryLabel: "퇴근후 부업" },
      [opp({ costKrw: 12_000 })],
    ).find((f) => f.q.includes("종류"))!.a;

    expect(answer).toContain("퇴근후 부업이다");
    expect(answer).not.toContain("전시·공연·강좌");
  });

  it("활동이 하나도 없어도 터지지 않고, 집계로 답할 수 있는 질문만 남는다", () => {
    const faqs = guFaqs({ ...summary, freeCount: 0 }, []);
    expect(faqs).toHaveLength(1);
    expect(faqs[0]!.q).toContain("종류");
  });
});
