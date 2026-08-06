/**
 * useSavedOpportunities — 저장 항목을 id 조회로 해소하는지 검증.
 * 회귀 방지 대상: 예전엔 300건 카탈로그를 훑어서, 창 밖(507건 중 207건)에 있는
 * 저장 항목이 보관함에서 조용히 사라졌다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { useOpportunity } from "./useOpportunity";
import { useSavedOpportunities } from "./useSavedOpportunities";

vi.mock("@/data/opportunities", () => ({
  fetchOpportunityById: vi.fn(),
}));

import { fetchOpportunityById } from "@/data/opportunities";
const mockedById = vi.mocked(fetchOpportunityById);

function makePick(id: string, title: string): MockOpportunity {
  return {
    id,
    source: "seoul_culture",
    category: "culture",
    title,
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

function seed(savedIds: string[]) {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds,
    user: null,
  });
}

beforeEach(() => {
  mockedById.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useSavedOpportunities", () => {
  it("저장한 게 없으면 조회하지 않고 empty", () => {
    seed([]);
    const { result } = renderHook(() => useSavedOpportunities());
    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe("empty");
    expect(mockedById).not.toHaveBeenCalled();
  });

  // 이 훅이 존재하는 이유. 반경 목록에 없는 저장 항목이 사라지면 안 된다.
  it("반경 목록 밖의 저장 항목도 id 조회로 반드시 가져온다", async () => {
    const outOfWindow = makePick("op-999", "300건 창 밖 활동");
    seed(["op-999"]);
    mockedById.mockResolvedValue({ data: outOfWindow, status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(mockedById).toHaveBeenCalledWith("op-999");
    expect(result.current.items).toEqual([outOfWindow]);
  });

  it("저장 순서를 보존한다 — 응답이 늦게 도착한 순서가 아니라", async () => {
    const first = makePick("op-2", "먼저 저장");
    const second = makePick("op-1", "나중 저장");
    seed(["op-2", "op-1"]);
    // op-1이 먼저 도착해도 목록은 저장 순서(op-2, op-1)를 지켜야 한다.
    mockedById.mockImplementation(async (id: string) => ({
      data: id === "op-2" ? first : second,
      status: "ok" as const,
    }));

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.items.map((o) => o.id)).toEqual(["op-2", "op-1"]);
  });

  it("삭제된 활동(empty)은 조용히 건너뛴다 — 에러로 취급하지 않는다", async () => {
    seed(["op-gone"]);
    mockedById.mockResolvedValue({ data: null, status: "empty" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(mockedById).toHaveBeenCalled());
    expect(result.current.items).toEqual([]);
    expect(result.current.status).not.toBe("error");
  });

  it("조회 실패면 error 상태를 노출한다(조용히 감추지 않는다)", async () => {
    seed(["op-1"]);
    mockedById.mockResolvedValue({ data: null, status: "error" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  /**
   * 상세와 보관함이 같은 queryKey(opportunity/:id)를 공유하는지 — 예전엔 각자 따로 받았다.
   * 캐시 공유가 이제 "재조회 안 함"의 유일한 근거이므로 여기서 못 박는다.
   *
   * 전역 셋업(vitest.setup.ts)은 렌더마다 새 QueryClient를 준다(테스트 간 캐시 누수 방지).
   * 캐시 공유 자체가 검증 대상인 여기서만 클라이언트를 직접 만들어 두 훅에 물린다.
   */
  it("같은 캐시를 쓰면 상세와 보관함이 같은 id를 두 번 받지 않는다", async () => {
    const pick = makePick("op-1", "망원동 전시");
    seed(["op-1"]);
    mockedById.mockResolvedValue({ data: pick, status: "ok" });

    // staleTime은 production(lib/query.tsx)과 맞춘다 — 0이면 마운트마다 즉시 stale이라
    // 캐시가 있어도 다시 받는다. 재사용을 만드는 건 캐시 존재가 아니라 staleTime이다.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const saved = renderHook(() => useSavedOpportunities(), { wrapper });
    await waitFor(() => expect(saved.result.current.status).toBe("ok"));
    expect(mockedById).toHaveBeenCalledTimes(1);

    // 상세 화면이 같은 활동을 연다 — 이미 캐시에 있으므로 조회가 늘지 않아야 한다.
    const detail = renderHook(() => useOpportunity("op-1"), { wrapper });
    await waitFor(() => expect(detail.result.current.status).toBe("ok"));
    expect(detail.result.current.opportunity?.id).toBe("op-1");
    expect(mockedById).toHaveBeenCalledTimes(1);
  });
});
