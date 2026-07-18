/**
 * fetchOpportunities()가 Supabase 응답을 4가지 CatalogStatus로 올바르게 매핑하는지 검증.
 * @/lib/supabase가 export하는 클라이언트 자체를 모킹해서 실제 네트워크 호출 없이 테스트한다.
 */
import type { OpportunityRow } from "@motungi/core";
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

/** opportunities.select().limit()가 result를 resolve하는 mock 클라이언트를 만든다. */
function makeClient(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ select }));
  return { from };
}

const ROW: OpportunityRow = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  external_id: null,
  title: "망원동 동네 전시",
  summary: "망원동 갤러리에서 열리는 소규모 전시",
  cost_krw: 0,
  difficulty: 0.2,
  dong_name: "망원동",
  lat: 37.5556,
  lng: 126.9019,
  cta_url: null,
  deadline: null,
  source_label: null,
  time_start_hour: 18,
  time_end_hour: 21,
};

describe("fetchOpportunities", () => {
  beforeEach(() => {
    state.client = null;
  });

  it("데이터가 1건 이상이면 ok 상태로 매핑된 데이터를 반환한다", async () => {
    state.client = makeClient({ data: [ROW], error: null });

    const result = await fetchOpportunities();

    expect(result.status).toBe("ok");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: "op-1",
      title: "망원동 동네 전시",
      categoryLabel: "동네 문화·공연",
      costLabel: "무료",
    });
  });

  it("조회는 성공했지만 0건이면 empty 상태를 반환한다", async () => {
    state.client = makeClient({ data: [], error: null });

    const result = await fetchOpportunities();

    expect(result.status).toBe("empty");
    expect(result.data).toEqual([]);
  });

  it("조회 실패(query error)면 error 상태를 반환한다", async () => {
    state.client = makeClient({ data: null, error: { message: "boom" } });

    const result = await fetchOpportunities();

    expect(result.status).toBe("error");
    expect(result.data).toEqual([]);
  });

  it("Supabase 클라이언트가 없으면(env 미설정) unconfigured 상태를 반환한다", async () => {
    state.client = null;

    const result = await fetchOpportunities();

    expect(result.status).toBe("unconfigured");
    expect(result.data).toEqual([]);
  });

  it("카테고리/소스가 알 수 없는(레거시) 값이면 해당 row를 제외한다", async () => {
    const legacyCategoryRow = { ...ROW, id: "op-legacy-category", category: "subsidy" };
    const legacySourceRow = { ...ROW, id: "op-legacy-source", source: "youth_policy" };
    state.client = makeClient({ data: [ROW, legacyCategoryRow, legacySourceRow], error: null });

    const result = await fetchOpportunities();

    expect(result.status).toBe("ok");
    expect(result.data.map((d) => d.id)).toEqual(["op-1"]);
  });

  it("모든 row가 레거시 값이라 하나도 남지 않으면 empty 상태를 반환한다", async () => {
    const legacyCategoryRow = { ...ROW, id: "op-legacy-category", category: "subsidy" };
    state.client = makeClient({ data: [legacyCategoryRow], error: null });

    const result = await fetchOpportunities();

    expect(result.status).toBe("empty");
    expect(result.data).toEqual([]);
  });
});
