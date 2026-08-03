/**
 * useOpportunity: 상세 화면이 카탈로그 전량을 받지 않고 id로 1건만 로드하는지 검증.
 * - 스토어 카탈로그에 이미 있으면 재조회 없이 그대로 재사용.
 * - 없으면 fetchOpportunityById로 딱 1건만 조회.
 * - id가 없으면 조회 없이 empty.
 *
 * store(`@/store/useAppStore`)는 useEnsureCatalog.test.ts와 동일한 가변 state 객체 +
 * selector 흉내 컨벤션으로 우회한다. `@/data/opportunities`의 fetchOpportunityById는
 * vi.mock으로 대체한다.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

const { fetchOpportunityByIdMock, state } = vi.hoisted(() => ({
  fetchOpportunityByIdMock: vi.fn(),
  state: { catalog: [] as MockOpportunity[] },
}));

vi.mock("@/data/opportunities", () => ({
  fetchOpportunityById: fetchOpportunityByIdMock,
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: typeof state) => unknown) => selector(state),
}));

import { useOpportunity } from "./useOpportunity";

function pick(id: string): MockOpportunity {
  return {
    id,
    source: "seoul_culture",
    category: "culture",
    title: `활동 ${id}`,
    summary: "요약",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 0,
    meta: [],
    tone: "brand",
  } as MockOpportunity;
}

beforeEach(() => {
  fetchOpportunityByIdMock.mockReset();
  state.catalog = [];
});

describe("useOpportunity", () => {
  it("카탈로그에 이미 있으면 재조회 없이 그대로 재사용한다", async () => {
    state.catalog = [pick("op-1"), pick("op-2")];

    const { result } = renderHook(() => useOpportunity("op-2"));

    await Promise.resolve();
    expect(fetchOpportunityByIdMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("ok");
    expect(result.current.opportunity?.id).toBe("op-2");
  });

  it("카탈로그에 없으면 id로 1건만 조회한다", async () => {
    state.catalog = [];
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: pick("op-9"), status: "ok" });

    const { result } = renderHook(() => useOpportunity("op-9"));

    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(fetchOpportunityByIdMock).toHaveBeenCalledTimes(1);
    expect(fetchOpportunityByIdMock).toHaveBeenCalledWith("op-9");
    expect(result.current.opportunity?.id).toBe("op-9");
  });

  it("없는 id는 empty로 노출한다", async () => {
    state.catalog = [];
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: null, status: "empty" });

    const { result } = renderHook(() => useOpportunity("nope"));

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.opportunity).toBeNull();
  });

  it("id가 없으면 조회하지 않고 empty", async () => {
    state.catalog = [];

    const { result } = renderHook(() => useOpportunity(null));

    await Promise.resolve();
    expect(fetchOpportunityByIdMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("empty");
    expect(result.current.opportunity).toBeNull();
  });

  it("응답 도착 전 언마운트되면 상태를 갱신하지 않는다(cancelled)", async () => {
    state.catalog = [];
    let resolveFetch!: (r: { data: MockOpportunity | null; status: string }) => void;
    fetchOpportunityByIdMock.mockReturnValueOnce(
      new Promise((res) => {
        resolveFetch = res;
      }),
    );

    const { result, unmount } = renderHook(() => useOpportunity("op-1"));
    expect(fetchOpportunityByIdMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("loading");

    unmount();
    resolveFetch({ data: pick("op-1"), status: "ok" });

    await Promise.resolve();
    await Promise.resolve();
    // 언마운트 후이므로 마지막으로 렌더된 상태는 loading에 머문다(setState 미발생).
    expect(result.current.status).toBe("loading");
  });
});
