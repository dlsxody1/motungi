/**
 * rowToMock 파생값 검증 — fetchOpportunities(ok) 경로를 통해 DB row가
 * 카드 표시용 MockOpportunity로 어떻게 변환되는지(카테고리별 costLabel/costHeading/
 * costUnit/tone/meta/matchScore)와 Supabase select 쿼리 계약을 확인한다.
 *
 * (opportunities.test.ts는 4가지 CatalogStatus 분기만 다룬다. 이 파일은 파생 로직에 집중.)
 */
import type { OpportunityCategory, OpportunityRow } from "@motungi/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { state } = vi.hoisted(() => ({
  state: { client: null as null | { from: ReturnType<typeof vi.fn> } },
}));

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return state.client;
  },
}));

import { fetchOpportunities } from "./opportunities";

/** select().limit()이 result를 resolve하고, 호출 인자를 검사할 수 있는 mock 클라이언트. */
function makeClient(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ select }));
  return { from, select, limit };
}

/** 최소 필드만 채운 row 팩토리 — 테스트별로 필요한 필드만 override. */
function makeRow(over: Partial<OpportunityRow> & { category: OpportunityCategory }): OpportunityRow {
  return {
    id: "op-x",
    source: "seoul_culture",
    external_id: null,
    title: "제목",
    summary: "요약",
    cost_krw: 0,
    difficulty: null,
    dong_name: "망원동",
    lat: null,
    lng: null,
    cta_url: null,
    deadline: null,
    source_label: null,
    time_start_hour: null,
    time_end_hour: null,
    ...over,
  };
}

/** 단일 row를 ok로 로드해 변환된 첫 항목을 돌려주는 헬퍼. */
async function loadOne(row: OpportunityRow) {
  state.client = makeClient({ data: [row], error: null });
  const result = await fetchOpportunities();
  expect(result.status).toBe("ok");
  return result.data[0]!;
}

beforeEach(() => {
  state.client = null;
});

describe("rowToMock — 비용 표시 파생(costLabel/costHeading/costUnit)", () => {
  it("side_job: 만원 단위 수입 라벨 + '예상 수입' 헤딩 + '월' 단위", async () => {
    const card = await loadOne(makeRow({ category: "side_job", cost_krw: 480_000 }));
    expect(card.costLabel).toBe("+48만 원");
    expect(card.costHeading).toBe("예상 수입");
    expect(card.costUnit).toBe("월");
  });

  it("side_job: 만원 반올림이 0이면 원 단위 그대로 표기한다", async () => {
    const card = await loadOne(makeRow({ category: "side_job", cost_krw: 4_000 }));
    expect(card.costLabel).toBe("4,000원");
  });

  it("side_job: 반올림 경계(4999→0만, 5000→1만)를 확인한다", async () => {
    const low = await loadOne(makeRow({ category: "side_job", cost_krw: 4_999 }));
    expect(low.costLabel).toBe("4,999원");
    const high = await loadOne(makeRow({ category: "side_job", cost_krw: 5_000 }));
    expect(high.costLabel).toBe("+1만 원");
  });

  it("일반 카테고리: 0원이면 '무료'", async () => {
    const card = await loadOne(makeRow({ category: "culture", cost_krw: 0 }));
    expect(card.costLabel).toBe("무료");
    expect(card.costHeading).toBe("참가비");
    expect(card.costUnit).toBe("1인");
  });

  it("일반 카테고리: 유료면 천단위 구분 원화 표기", async () => {
    const card = await loadOne(makeRow({ category: "food", cost_krw: 12_000 }));
    expect(card.costLabel).toBe("₩12,000");
  });

  it("비용 미상(null)이면 '가격 문의'", async () => {
    const card = await loadOne(makeRow({ category: "class", cost_krw: null }));
    expect(card.costLabel).toBe("가격 문의");
  });
});

describe("rowToMock — 라벨/톤/스코어 파생", () => {
  it("categoryLabel은 CATEGORY_LABEL 매핑을 따른다", async () => {
    const card = await loadOne(makeRow({ category: "market" }));
    expect(card.categoryLabel).toBe("마켓·플리마켓");
  });

  it("active 카테고리만 tone이 mint, 나머지는 brand", async () => {
    const active = await loadOne(makeRow({ category: "active" }));
    expect(active.tone).toBe("mint");
    const culture = await loadOne(makeRow({ category: "culture" }));
    expect(culture.tone).toBe("brand");
  });

  it("matchScore는 항상 0으로 초기화된다(스코어링에서 재계산)", async () => {
    const card = await loadOne(makeRow({ category: "culture", cost_krw: 0 }));
    expect(card.matchScore).toBe(0);
  });
});

describe("rowToMock — meta 칩(buildMeta) 파생", () => {
  it("timeWindow와 difficulty가 있으면 시간대·강도 칩이 생성된다", async () => {
    const card = await loadOne(
      makeRow({ category: "culture", time_start_hour: 18, time_end_hour: 21, difficulty: 0.8 }),
    );
    expect(card.meta).toEqual([
      { label: "시간대", value: "18시" },
      { label: "강도", value: "높음" },
    ]);
  });

  it("난이도 경계로 강도 라벨이 낮음/보통/높음으로 나뉜다", async () => {
    const low = await loadOne(makeRow({ category: "active", difficulty: 0.33 }));
    expect(low.meta).toContainEqual({ label: "강도", value: "낮음" });
    const mid = await loadOne(makeRow({ category: "active", difficulty: 0.5 }));
    expect(mid.meta).toContainEqual({ label: "강도", value: "보통" });
  });

  it("시간대/난이도가 모두 없으면 meta는 빈 배열", async () => {
    const card = await loadOne(
      makeRow({ category: "food", time_start_hour: null, time_end_hour: null, difficulty: null }),
    );
    expect(card.meta).toEqual([]);
  });
});

describe("fetchOpportunities — Supabase 쿼리 계약 및 다건 매핑", () => {
  it("opportunities 테이블을 최대 200건, 지정 컬럼으로 조회한다", async () => {
    const client = makeClient({ data: [makeRow({ category: "culture" })], error: null });
    state.client = client;

    await fetchOpportunities();

    expect(client.from).toHaveBeenCalledWith("opportunities");
    const selectedCols = (client.select.mock.calls[0] as unknown as string[])[0];
    expect(selectedCols).toContain("cost_krw");
    expect(selectedCols).toContain("time_start_hour");
    expect(client.limit).toHaveBeenCalledWith(200);
  });

  it("여러 row를 순서를 보존하며 각각 변환한다", async () => {
    state.client = makeClient({
      data: [
        makeRow({ id: "a", category: "side_job", cost_krw: 300_000 }),
        makeRow({ id: "b", category: "culture", cost_krw: 0 }),
      ],
      error: null,
    });

    const result = await fetchOpportunities();

    expect(result.data.map((d) => d.id)).toEqual(["a", "b"]);
    expect(result.data[0]!.costLabel).toBe("+30만 원");
    expect(result.data[1]!.costLabel).toBe("무료");
  });
});
