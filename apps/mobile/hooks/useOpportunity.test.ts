import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * useOpportunity 계약 검증 — 상세가 카탈로그 전량 대신 id로 1건만 로드하는지.
 *
 * 회귀 방지 대상: 예전엔 `catalog.find(...) ?? catalog[0]`이라 카탈로그 밖 id로 딥링크하면
 * 엉뚱한 활동을 요청한 것처럼 보여줬다. 이제 못 찾으면 조회하고, 없으면 empty여야 한다.
 *
 * useEnsureCatalog.test와 같은 방식으로 `@/store/useAppStore`와 `@/data/opportunities`를
 * vi.mock으로 우회한다(store는 selector 기반이라 가변 state에 selector를 적용해 흉내).
 */
const { fetchByIdMock, state } = vi.hoisted(() => ({
  fetchByIdMock: vi.fn(),
  state: { catalog: [] as unknown[] },
}));

vi.mock("@/data/opportunities", () => ({
  fetchOpportunityById: fetchByIdMock,
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: unknown) => unknown) => selector({ catalog: state.catalog }),
}));

import type { MockOpportunity, OpportunityResult } from "@/data/opportunities";
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
  fetchByIdMock.mockReset();
  state.catalog = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useOpportunity", () => {
  it("카탈로그에 이미 있으면 재조회 없이 그대로 재사용한다", async () => {
    state.catalog = [pick("op-1"), pick("op-2")];

    const { result } = renderHook(() => useOpportunity("op-2"));

    await Promise.resolve();
    expect(fetchByIdMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("ok");
    expect(result.current.opportunity?.id).toBe("op-2");
  });

  it("카탈로그에 없으면 id로 1건만 조회한다(딥링크 경로)", async () => {
    state.catalog = [pick("op-1")];
    fetchByIdMock.mockResolvedValueOnce({ data: pick("op-9"), status: "ok" });

    const { result } = renderHook(() => useOpportunity("op-9"));

    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(fetchByIdMock).toHaveBeenCalledTimes(1);
    expect(fetchByIdMock).toHaveBeenCalledWith("op-9");
    // 회귀 방지: catalog[0]("op-1")이 아니라 요청한 활동이어야 한다.
    expect(result.current.opportunity?.id).toBe("op-9");
  });

  it("없는 id는 empty로 노출한다(엉뚱한 활동 대체 금지)", async () => {
    state.catalog = [pick("op-1")];
    fetchByIdMock.mockResolvedValueOnce({ data: null, status: "empty" });

    const { result } = renderHook(() => useOpportunity("nope"));

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.opportunity).toBeNull();
  });

  it("id가 없으면 조회하지 않고 empty", async () => {
    const { result } = renderHook(() => useOpportunity(null));

    await Promise.resolve();
    expect(fetchByIdMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("empty");
    expect(result.current.opportunity).toBeNull();
  });

  it("응답 도착 전 언마운트되면 상태를 갱신하지 않는다(cancelled)", async () => {
    let resolveFetch!: (r: OpportunityResult) => void;
    fetchByIdMock.mockReturnValueOnce(
      new Promise<OpportunityResult>((res) => {
        resolveFetch = res;
      }),
    );

    const { result, unmount } = renderHook(() => useOpportunity("op-1"));
    expect(fetchByIdMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("loading");

    unmount();
    resolveFetch({ data: pick("op-1"), status: "ok" });

    await Promise.resolve();
    await Promise.resolve();
    // 언마운트 후이므로 마지막으로 렌더된 상태는 loading에 머문다(setState 미발생).
    expect(result.current.status).toBe("loading");
  });
});
