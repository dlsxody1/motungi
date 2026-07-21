/**
 * useOpportunity: 상세 페이지가 카탈로그 전량을 받지 않고 id로 1건만 로드하는지 검증.
 * - 스토어 카탈로그에 이미 있으면 재조회 없이 그대로 재사용.
 * - 없으면 fetchOpportunityById로 딱 1건만 조회.
 * - id가 없으면 조회 없이 empty.
 * fetchOpportunityById는 vi.mock으로 대체하고, 실제 zustand 스토어를 사용한다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity, OpportunityResult } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { useOpportunity } from "./useOpportunity";

vi.mock("@/data/opportunities", () => ({
  fetchOpportunityById: vi.fn(),
}));

import { fetchOpportunityById } from "@/data/opportunities";
const mockedFetch = vi.mocked(fetchOpportunityById);

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

/** 카탈로그만 덮어써 이전 테스트 잔여 상태를 제거한다. */
function seedCatalog(catalog: MockOpportunity[]) {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog,
    catalogStatus: catalog.length ? "ok" : "idle",
    savedIds: [],
    user: null,
  });
}

beforeEach(() => {
  mockedFetch.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useOpportunity", () => {
  it("카탈로그에 이미 있으면 재조회 없이 그대로 재사용한다", async () => {
    seedCatalog([pick("op-1"), pick("op-2")]);

    const { result } = renderHook(() => useOpportunity("op-2"));

    await Promise.resolve();
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("ok");
    expect(result.current.opportunity?.id).toBe("op-2");
  });

  it("카탈로그에 없으면 id로 1건만 조회한다", async () => {
    seedCatalog([]);
    mockedFetch.mockResolvedValueOnce({ data: pick("op-9"), status: "ok" });

    const { result } = renderHook(() => useOpportunity("op-9"));

    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith("op-9");
    expect(result.current.opportunity?.id).toBe("op-9");
  });

  it("없는 id는 empty로 노출한다", async () => {
    seedCatalog([]);
    mockedFetch.mockResolvedValueOnce({ data: null, status: "empty" });

    const { result } = renderHook(() => useOpportunity("nope"));

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.opportunity).toBeNull();
  });

  it("id가 없으면 조회하지 않고 empty", async () => {
    seedCatalog([]);

    const { result } = renderHook(() => useOpportunity(null));

    await Promise.resolve();
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("empty");
    expect(result.current.opportunity).toBeNull();
  });

  it("응답 도착 전 언마운트되면 상태를 갱신하지 않는다(cancelled)", async () => {
    seedCatalog([]);
    let resolveFetch!: (r: OpportunityResult) => void;
    mockedFetch.mockReturnValueOnce(
      new Promise<OpportunityResult>((res) => {
        resolveFetch = res;
      }),
    );

    const { result, unmount } = renderHook(() => useOpportunity("op-1"));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("loading");

    unmount();
    resolveFetch({ data: pick("op-1"), status: "ok" });

    await Promise.resolve();
    await Promise.resolve();
    // 언마운트 후이므로 마지막으로 렌더된 상태는 loading에 머문다(setState 미발생).
    expect(result.current.status).toBe("loading");
  });
});
