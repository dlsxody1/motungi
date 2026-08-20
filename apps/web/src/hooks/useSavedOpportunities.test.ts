/**
 * useSavedOpportunities — 저장 항목을 단일 벌크 쿼리(.in("id", ids))로 해소하는지 검증.
 * 회귀 방지 대상: 예전엔 300건 카탈로그를 훑어서, 창 밖(507건 중 207건)에 있는
 * 저장 항목이 보관함에서 조용히 사라졌다.
 *
 * M-064: 저장 건수만큼 fetchOpportunityById를 N번 부르던 useQueries를
 * fetchOpportunitiesByIds 단일 쿼리로 바꿨다 — mock 대상도 그에 맞춘다.
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
  fetchOpportunitiesByIds: vi.fn(),
  fetchOpportunityById: vi.fn(),
}));

import { fetchOpportunitiesByIds, fetchOpportunityById } from "@/data/opportunities";
const mockedByIds = vi.mocked(fetchOpportunitiesByIds);
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
  mockedByIds.mockReset();
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
    expect(mockedByIds).not.toHaveBeenCalled();
  });

  // 이 훅이 존재하는 이유. 반경 목록에 없는 저장 항목이 사라지면 안 된다.
  it("반경 목록 밖의 저장 항목도 id 조회로 반드시 가져온다", async () => {
    const outOfWindow = makePick("op-999", "300건 창 밖 활동");
    seed(["op-999"]);
    mockedByIds.mockResolvedValue({ data: [outOfWindow], status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(mockedByIds).toHaveBeenCalledWith(["op-999"]);
    expect(result.current.items).toEqual([outOfWindow]);
  });

  // 벌크 응답은 DB가 돌려주는 순서(요청 순서와 무관)로 올 수 있다 — 저장 순서(savedIds)로
  // 되돌리는 건 훅의 책임이다. (이전엔 "응답이 늦게 도착한 순서" 시나리오였지만, 이제
  // 요청이 하나뿐이라 "벌크 응답 자체가 뒤섞인 순서로 온다"로 시나리오가 바뀌었다.)
  it("저장 순서를 보존한다 — 벌크 응답 순서가 뒤섞여 와도", async () => {
    const first = makePick("op-2", "먼저 저장");
    const second = makePick("op-1", "나중 저장");
    seed(["op-2", "op-1"]);
    // 응답은 op-1, op-2 순(저장 순서와 반대)으로 온다.
    mockedByIds.mockResolvedValue({ data: [second, first], status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.items.map((o) => o.id)).toEqual(["op-2", "op-1"]);
  });

  it("삭제된 활동(empty)은 조용히 건너뛴다 — 에러로 취급하지 않는다", async () => {
    seed(["op-gone"]);
    // 벌크 응답에 삭제된 id가 아예 없다(또는 data가 빈 배열) — 존재하지 않는 것으로 취급.
    mockedByIds.mockResolvedValue({ data: [], status: "empty" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(mockedByIds).toHaveBeenCalled());
    expect(result.current.items).toEqual([]);
    expect(result.current.status).not.toBe("error");
  });

  it("조회 실패면 error 상태를 노출한다(조용히 감추지 않는다)", async () => {
    seed(["op-1"]);
    mockedByIds.mockResolvedValue({ data: [], status: "error" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  /**
   * 상세와 보관함이 같은 queryKey(opportunity/:id)를 공유하는지 — 예전엔 각자 따로 받았다.
   * 캐시 공유가 이제 "재조회 안 함"의 유일한 근거이므로 여기서 못 박는다.
   *
   * M-064로 이 보장이 더 강해졌다: 예전엔 상세가 "캐시에 있으면 재사용"해서 여전히
   * fetchOpportunityById를 1번은 호출했지만(캐시 히트), 이제 보관함의 벌크 조회 queryFn이
   * 응답 즉시 상세 캐시 슬롯을 직접 시딩하므로 상세는 **아예 조회를 시도조차 하지 않는다**
   * (fetchOpportunityById 호출 0회). 커버리지가 준 게 아니라 더 엄격해진 단언이다.
   *
   * 전역 셋업(vitest.setup.ts)은 렌더마다 새 QueryClient를 준다(테스트 간 캐시 누수 방지).
   * 캐시 공유 자체가 검증 대상인 여기서만 클라이언트를 직접 만들어 두 훅에 물린다.
   */
  it("같은 캐시를 쓰면 상세와 보관함이 같은 id를 두 번 받지 않는다", async () => {
    const pick = makePick("op-1", "망원동 전시");
    seed(["op-1"]);
    mockedByIds.mockResolvedValue({ data: [pick], status: "ok" });

    // staleTime은 production(lib/query.tsx)과 맞춘다 — 0이면 마운트마다 즉시 stale이라
    // 캐시가 있어도 다시 받는다. 재사용을 만드는 건 캐시 존재가 아니라 staleTime이다.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const saved = renderHook(() => useSavedOpportunities(), { wrapper });
    await waitFor(() => expect(saved.result.current.status).toBe("ok"));
    expect(mockedByIds).toHaveBeenCalledTimes(1);

    // 상세 화면이 같은 활동을 연다 — 보관함 벌크 조회가 이미 상세 캐시 슬롯을 시딩해뒀으므로
    // 상세는 조회를 시도조차 하지 않아야 한다(0회, 캐시 히트로 인한 1회조차 아님).
    const detail = renderHook(() => useOpportunity("op-1"), { wrapper });
    await waitFor(() => expect(detail.result.current.status).toBe("ok"));
    expect(detail.result.current.opportunity?.id).toBe("op-1");
    expect(mockedById).toHaveBeenCalledTimes(0);
  });
});
