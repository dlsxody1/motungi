/**
 * opportunities.ts는 이제 @motungi/core.catalog을 감싸는 얇은 래퍼다(M-008).
 * 변환/쿼리 시나리오 전체는 packages/core/src/catalog.test.ts로 이관됐으니, 여기서는
 * 이 앱의 "@/lib/supabase" 클라이언트가 core의 fetchOpportunities에 그대로 위임되는지만 확인한다.
 */
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

function makeClient(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const chain: Record<string, unknown> = { limit };
  chain.or = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  const select = vi.fn(() => chain);
  const from = vi.fn(() => ({ select }));
  return { from };
}

beforeEach(() => {
  state.client = null;
});

describe("fetchOpportunities (web 래퍼)", () => {
  it("supabase 클라이언트가 없으면 unconfigured를 core로부터 그대로 위임받는다", async () => {
    state.client = null;

    const result = await fetchOpportunities();

    expect(result).toEqual({ data: [], status: "unconfigured" });
  });

  it("이 앱의 supabase 클라이언트를 core.fetchOpportunities에 그대로 주입한다", async () => {
    const client = makeClient({ data: [], error: null });
    state.client = client;

    const result = await fetchOpportunities();

    expect(client.from).toHaveBeenCalledWith("opportunities");
    expect(result.status).toBe("empty");
  });

  it("today(마감 필터 기준일)를 자동 주입한다 — 지난 이벤트가 서버에서 걸러진다", async () => {
    const client = makeClient({ data: [], error: null });
    state.client = client;
    const chain = client.from().select();

    await fetchOpportunities();

    const orArg = (chain.or as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(orArg).toMatch(/^deadline\.is\.null,deadline\.gte\.\d{4}-\d{2}-\d{2}$/);
  });

  // 레거시 값 필터링·rowToMock 변환 등 쿼리/변환 시나리오는 core로 승격됐다(M-008) —
  // 커버리지는 packages/core/src/catalog.test.ts에 있다. 여기 래퍼 테스트는 위임만 검증한다.
});
