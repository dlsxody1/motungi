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

  // web(useOpportunity.test.ts)과 달리 여기서 promise를 reject시켜 테스트하지 않는다 —
  // 이 훅의 fetch effect엔 catch가 없어서, fetchOpportunityById가 실제로 reject하면
  // unhandled rejection이 될 뿐 상태가 절대 갱신되지 않는다("loading"에 영원히 멈춤, 실버그
  // 아님 — 실제로 이 앱의 fetchOpportunityById는 core catalog.ts에서 에러를 내부적으로 잡아
  // {data:null, status:"error"}로 resolve하는 계약이라 reject 자체가 일어나지 않는다).
  // 그래서 "error"는 이 훅의 mapStatus가 처리하는 resolve-with-status:"error" 경로로 검증한다.
  it("fetchOpportunityById가 status:'error'로 응답하면 error로 노출한다", async () => {
    state.catalog = [];
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: null, status: "error" });

    const { result } = renderHook(() => useOpportunity("op-err"));

    await waitFor(() => {
      expect(result.current.status).toBe("error");
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

  // 시그니처 차이는 의도된 것이다(M-108 결정, backlog 참조): web의 useOpportunity(id, initial?)는
  // SSR이 이미 조회해둔 1건을 initialData로 캐시에 선시딩해 같은 id 재조회를 건너뛰지만,
  // mobile useOpportunity(id)에는 그 두 번째 인자가 없다(react-query 캐시 자체가 없어
  // 선시딩할 대상도 없다). 버그가 아니라 파라미터 목록이 의도적으로 갈라진 것이며,
  // 반환 shape({opportunity, status})은 아래 parity 테스트가 고정하는 대로 web과 동일하다.
  it("동일 id·동일 fetch 결과면 {opportunity, status} shape이 고정된다(parity, web과 동일 계약, M-108)", async () => {
    state.catalog = [];
    const expected = pick("op-9");
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: expected, status: "ok" });

    const { result } = renderHook(() => useOpportunity("op-9"));

    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });
    // 반환 객체의 키 자체가 web(useOpportunity.test.ts)의 반환값과 동일해야 한다 —
    // 여기서 지키는 건 "이 훅이 뭘 반환하는가"이지 "인자를 몇 개 받는가"가 아니다.
    expect(Object.keys(result.current).sort()).toEqual(["opportunity", "status"]);
    expect(result.current).toEqual({ opportunity: expected, status: "ok" });
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
