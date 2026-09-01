/**
 * useOpportunity: 상세 페이지가 카탈로그 전량을 받지 않고 id로 1건만 로드하는지 검증.
 * - fetchOpportunityById로 딱 1건만 조회.
 * - id가 없으면 조회 없이 empty.
 *
 * "이미 받아둔 건 재조회하지 않는다"는 이제 이 훅이 아니라 **캐시(queryKey)의 책임**이다 —
 * 예전엔 스토어 catalog를 뒤져 손으로 갈랐는데, catalog는 앵커 반경 목록이라 반경 밖
 * 활동(공유링크·보관함)은 어차피 항상 조회로 떨어졌다. 캐시 공유 자체의 검증은
 * useSavedOpportunities.test.ts("상세에서 이미 받은 건…")에 있다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import type { MockOpportunity, OpportunityResult } from "@/data/opportunities";
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

beforeEach(() => {
  mockedFetch.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useOpportunity", () => {
  it("id로 1건만 조회한다 — 카탈로그 전량을 받지 않는다", async () => {
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
    mockedFetch.mockResolvedValueOnce({ data: null, status: "empty" });

    const { result } = renderHook(() => useOpportunity("nope"));

    await waitFor(() => {
      expect(result.current.status).toBe("empty");
    });
    expect(result.current.opportunity).toBeNull();
  });

  it("id가 없으면 조회하지 않고 empty", async () => {
    const { result } = renderHook(() => useOpportunity(null));

    await Promise.resolve();
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("empty");
    expect(result.current.opportunity).toBeNull();
  });

  it("initial이 있으면 같은 id를 재조회하지 않는다(SSR 선시딩, M-074)", async () => {
    // 전역 테스트 wrapper(vitest.setup.ts)는 staleTime:0을 강제한다 — 다른 테스트가
    // "조회 없이 통과"하는 걸 막기 위한 의도된 설정이지만, 여기서 그대로 두면 initialData가
    // 즉시 stale로 잡혀 마운트 즉시 백그라운드 refetch가 붙어 이 테스트 자체가 성립하지
    // 않는다. 그래서 이 테스트만 실서비스 QueryProvider(lib/query.tsx)와 같은 staleTime을
    // 가진 클라이언트를 직접 넘겨, "initialData가 신선한 동안 재조회 안 함"을 검증한다.
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(() => useOpportunity("op-9", pick("op-9")), { wrapper });

    expect(result.current.status).toBe("ok");
    expect(result.current.opportunity?.id).toBe("op-9");
    await Promise.resolve();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("initial이 없는 순수 클라이언트 내비게이션은 기존처럼 조회된다", async () => {
    mockedFetch.mockResolvedValueOnce({ data: pick("op-2"), status: "ok" });

    const { result } = renderHook(() => useOpportunity("op-2"));

    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith("op-2");
  });

  it("응답 도착 전 언마운트돼도 터지지 않는다(늦게 온 응답이 죽은 컴포넌트를 갱신하지 않는다)", async () => {
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
    // 언마운트된 훅의 마지막 렌더는 loading에 멈춰 있다 — 구독이 끊겼으므로 갱신되지 않는다.
    expect(result.current.status).toBe("loading");
  });
});
