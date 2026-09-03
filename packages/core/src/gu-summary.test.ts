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
