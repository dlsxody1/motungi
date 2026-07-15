/**
 * useEnsureCatalog: catalogStatus가 "idle"일 때만 fetchOpportunities를 호출해
 * 스토어를 시딩하고, 이미 로드/에러 상태면 재요청하지 않는지 검증한다.
 * fetchOpportunities는 vi.mock으로 대체하고, 실제 zustand 스토어를 사용한다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogResult, MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { useEnsureCatalog } from "./useEnsureCatalog";

vi.mock("@/data/opportunities", () => ({
  fetchOpportunities: vi.fn(),
}));

// mock된 fetchOpportunities에 타입 있는 핸들을 확보한다.
import { fetchOpportunities } from "@/data/opportunities";
const mockedFetch = vi.mocked(fetchOpportunities);

const PICK: MockOpportunity = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  title: "망원동 동네 전시",
  summary: "소규모 전시",
  costKrw: 0,
  difficulty: 0.2,
  categoryLabel: "동네 문화·공연",
  costLabel: "무료",
  costUnit: "1인",
  costHeading: "참가비",
  matchScore: 92,
  meta: [],
  tone: "brand",
} as MockOpportunity;

/** 데이터 슬라이스를 통째로 덮어써 이전 테스트 잔여 상태를 제거한다. */
function seedStatus(catalogStatus: "idle" | "ok" | "empty" | "error" | "unconfigured") {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog: [],
    catalogStatus,
    savedIds: [],
    user: null,
  });
}

beforeEach(() => {
  mockedFetch.mockReset();
});

afterEach(() => {
  // globals:false라 testing-library 자동 cleanup이 없으므로 수동으로 언마운트한다.
  // (마운트된 훅이 남아 있으면 다음 테스트의 seedStatus가 그 훅의 effect를 재발화시킨다.)
  cleanup();
  vi.clearAllMocks();
});

describe("useEnsureCatalog", () => {
  it("idle 상태면 fetchOpportunities를 호출하고 결과(data,status)로 스토어를 시딩한다", async () => {
    seedStatus("idle");
    const result: CatalogResult = { data: [PICK], status: "ok" };
    mockedFetch.mockResolvedValueOnce(result);

    renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("ok");
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().catalog).toEqual([PICK]);
  });

  it("빈 결과(empty)도 상태 그대로 스토어에 반영한다", async () => {
    seedStatus("idle");
    mockedFetch.mockResolvedValueOnce({ data: [], status: "empty" });

    renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("empty");
    });
    expect(useAppStore.getState().catalog).toEqual([]);
  });

  it("이미 로드된(ok) 상태면 재요청하지 않는다", async () => {
    seedStatus("ok");

    renderHook(() => useEnsureCatalog());

    // 마이크로태스크가 흘러가도 호출이 없어야 한다.
    await Promise.resolve();
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(useAppStore.getState().catalogStatus).toBe("ok");
  });

  it("에러 상태여도 재시도하지 않는다(무한 재요청 방지)", async () => {
    seedStatus("error");

    renderHook(() => useEnsureCatalog());

    await Promise.resolve();
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(useAppStore.getState().catalogStatus).toBe("error");
  });

  it("fetch가 idle에서 성공한 뒤(ok로 전이) 리렌더돼도 다시 호출하지 않는다", async () => {
    seedStatus("idle");
    mockedFetch.mockResolvedValueOnce({ data: [PICK], status: "ok" });

    const { rerender } = renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("ok");
    });

    rerender();
    await Promise.resolve();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it("응답 도착 전 언마운트되면(cancelled) 스토어를 시딩하지 않는다", async () => {
    seedStatus("idle");
    let resolveFetch!: (r: CatalogResult) => void;
    mockedFetch.mockReturnValueOnce(
      new Promise<CatalogResult>((res) => {
        resolveFetch = res;
      }),
    );

    const { unmount } = renderHook(() => useEnsureCatalog());
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    // 응답이 오기 전에 언마운트 → cleanup에서 cancelled=true
    unmount();
    resolveFetch({ data: [PICK], status: "ok" });

    // 마이크로태스크가 흘러가도 idle 그대로여야 한다.
    await Promise.resolve();
    await Promise.resolve();
    expect(useAppStore.getState().catalogStatus).toBe("idle");
    expect(useAppStore.getState().catalog).toEqual([]);
  });
});
