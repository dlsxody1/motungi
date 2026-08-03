/**
 * useSavedOpportunities — 저장 항목을 id 조회로 해소하는지 검증.
 * 회귀 방지 대상: 예전엔 300건 카탈로그를 훑어서, 창 밖(507건 중 207건)에 있는
 * 저장 항목이 보관함에서 조용히 사라졌다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
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

function seed(savedIds: string[], catalog: MockOpportunity[]) {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog,
    catalogStatus: catalog.length > 0 ? "ok" : "idle",
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
    seed([], []);
    const { result } = renderHook(() => useSavedOpportunities());
    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe("empty");
    expect(mockedById).not.toHaveBeenCalled();
  });

  it("스토어 카탈로그에 이미 있으면 재조회하지 않는다", async () => {
    const inCatalog = makePick("op-1", "망원동 전시");
    seed(["op-1"], [inCatalog]);

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.items).toEqual([inCatalog]);
    expect(mockedById).not.toHaveBeenCalled();
  });

  // 이 훅이 존재하는 이유. 카탈로그에 없는 저장 항목이 사라지면 안 된다.
  it("카탈로그에 없는 저장 항목도 id 조회로 반드시 가져온다", async () => {
    const outOfWindow = makePick("op-999", "300건 창 밖 활동");
    seed(["op-999"], []);
    mockedById.mockResolvedValue({ data: outOfWindow, status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(mockedById).toHaveBeenCalledWith("op-999");
    expect(result.current.items).toEqual([outOfWindow]);
  });

  it("저장 순서를 보존한다(카탈로그 항목과 조회 항목이 섞여도)", async () => {
    const cached = makePick("op-1", "카탈로그에 있음");
    const fetched = makePick("op-2", "조회로 가져옴");
    seed(["op-2", "op-1"], [cached]);
    mockedById.mockResolvedValue({ data: fetched, status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.items.map((o) => o.id)).toEqual(["op-2", "op-1"]);
  });

  it("삭제된 활동(empty)은 조용히 건너뛴다 — 에러로 취급하지 않는다", async () => {
    seed(["op-gone"], []);
    mockedById.mockResolvedValue({ data: null, status: "empty" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(mockedById).toHaveBeenCalled());
    expect(result.current.items).toEqual([]);
    expect(result.current.status).not.toBe("error");
  });

  it("조회 실패면 error 상태를 노출한다(조용히 감추지 않는다)", async () => {
    seed(["op-1"], []);
    mockedById.mockResolvedValue({ data: null, status: "error" });

    const { result } = renderHook(() => useSavedOpportunities());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
