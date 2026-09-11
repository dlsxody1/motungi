/**
 * ExploreListLayout — `/explore` 목록 전용 ItemList JSON-LD 레이아웃 (M-096).
 *
 * 서버 컴포넌트(async 함수)라 RTL이 곧바로 마운트할 수 없다 — 함수를 직접 호출해
 * 반환된 엘리먼트를 render()에 넘긴다. supabase 모킹은 opportunities.test.ts와 동일 패턴.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state } = vi.hoisted(() => ({
  state: { client: null as null | { from: ReturnType<typeof vi.fn> } },
}));

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return state.client;
  },
}));

import ExploreListLayout from "./layout";

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

function row(over: Record<string, unknown>) {
  return {
    id: "op-1",
    source: "seoul_culture",
    category: "culture",
    external_id: null,
    title: "망원동 동네 전시",
    summary: "요약",
    dong_name: "망원동",
    lat: 37.55,
    lng: 126.9,
    cost_krw: 0,
    difficulty: 0.2,
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

beforeEach(() => {
  state.client = null;
});
afterEach(() => cleanup());

describe("ExploreListLayout", () => {
  it("supabase 미설정(로컬)이면 스크립트 없이 children만 렌더한다", async () => {
    state.client = null;
    const element = await ExploreListLayout({ children: <p>목록 본문</p> });
    const { container } = render(element);

    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect(screen.getByText("목록 본문")).toBeInTheDocument();
  });

  it("활동이 있으면 ItemList JSON-LD 스크립트 + children을 함께 렌더한다", async () => {
    const client = makeClient({
      data: [row({ id: "op-1", title: "망원동 동네 전시" }), row({ id: "op-2", title: "성수동 재즈 공연" })],
      error: null,
    });
    state.client = client;

    const element = await ExploreListLayout({ children: <p>목록 본문</p> });
    const { container } = render(element);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const json = JSON.parse(script!.innerHTML);
    expect(json["@type"]).toBe("ItemList");
    expect(json.itemListElement).toHaveLength(2);
    expect(json.itemListElement[0].name).toBe("망원동 동네 전시");
    expect(screen.getByText("목록 본문")).toBeInTheDocument();
  });

  it("조회 결과가 비어 있으면 스크립트를 내보내지 않는다(빈 ItemList 금지)", async () => {
    const client = makeClient({ data: [], error: null });
    state.client = client;

    const element = await ExploreListLayout({ children: <p>목록 본문</p> });
    const { container } = render(element);

    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it("조회 실패면 스크립트를 내보내지 않는다", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });
    state.client = client;

    const element = await ExploreListLayout({ children: <p>목록 본문</p> });
    const { container } = render(element);

    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
