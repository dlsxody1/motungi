/**
 * useSavedOpportunities: 저장 id를 catalog(반경 창) + 단건 조회로 해소하는지 검증(M-045).
 * - savedIds가 비면 조회 없이 "empty".
 * - catalog에 있는 id는 재조회하지 않는다.
 * - catalog에 없는 id는 fetchOpportunityById로 조회한다.
 * - 응답이 도착 순서와 달라도 결과는 savedIds 순서를 보존한다.
 * - 조회 실패는 "error", retry()는 실패한 id만 다시 조회한다.
 *
 * 모킹은 useOpportunity.test.ts와 동일한 vi.hoisted 컨벤션.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

const { fetchOpportunityByIdMock } = vi.hoisted(() => ({
  fetchOpportunityByIdMock: vi.fn(),
}));

vi.mock("@/data/opportunities", () => ({
  fetchOpportunityById: fetchOpportunityByIdMock,
}));

import { useSavedOpportunities } from "./useSavedOpportunities";

function pick(id: string, title = `활동 ${id}`): MockOpportunity {
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

beforeEach(() => {
  fetchOpportunityByIdMock.mockReset();
});

describe("useSavedOpportunities", () => {
  it("savedIds가 비면 조회 없이 empty를 반환한다", async () => {
    const { result } = renderHook(() => useSavedOpportunities([], []));

    await Promise.resolve();
    expect(fetchOpportunityByIdMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("empty");
    expect(result.current.items).toEqual([]);
  });

  it("catalog에 있는 id는 재조회 없이 그대로 쓴다", async () => {
    const catalog = [pick("op-1"), pick("op-2")];

    const { result } = renderHook(() => useSavedOpportunities(["op-2"], catalog));

    await Promise.resolve();
    expect(fetchOpportunityByIdMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("ok");
    expect(result.current.items.map((o) => o.id)).toEqual(["op-2"]);
  });

  it("catalog에 없는 id는 fetchOpportunityById로 단건 조회한다", async () => {
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: pick("op-9"), status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities(["op-9"], []));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchOpportunityByIdMock).toHaveBeenCalledTimes(1);
    expect(fetchOpportunityByIdMock).toHaveBeenCalledWith("op-9");
    expect(result.current.items.map((o) => o.id)).toEqual(["op-9"]);
  });

  it("응답이 도착 순서와 달라도 결과는 savedIds 순서를 보존한다", async () => {
    let resolveA!: (r: { data: MockOpportunity | null; status: string }) => void;
    let resolveB!: (r: { data: MockOpportunity | null; status: string }) => void;
    fetchOpportunityByIdMock.mockImplementation((id: string) => {
      if (id === "op-a") return new Promise((res) => (resolveA = res));
      return new Promise((res) => (resolveB = res));
    });

    const { result } = renderHook(() => useSavedOpportunities(["op-a", "op-b"], []));

    // 나중 id(op-b)가 먼저 응답으로 도착해도 최종 순서는 savedIds 순서(a, b)를 따른다.
    resolveB({ data: pick("op-b"), status: "ok" });
    await waitFor(() => {
      expect(result.current.items.some((o) => o.id === "op-b")).toBe(true);
    });
    resolveA({ data: pick("op-a"), status: "ok" });
    await waitFor(() => {
      expect(result.current.status).toBe("ok");
    });

    expect(result.current.items.map((o) => o.id)).toEqual(["op-a", "op-b"]);
  });

  it("조회 실패면 status가 error가 되고, retry()는 실패한 id만 다시 조회한다", async () => {
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: null, status: "error" });

    const { result } = renderHook(() => useSavedOpportunities(["op-1"], []));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(fetchOpportunityByIdMock).toHaveBeenCalledTimes(1);

    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: pick("op-1"), status: "ok" });
    result.current.retry();

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchOpportunityByIdMock).toHaveBeenCalledTimes(2);
    expect(result.current.items.map((o) => o.id)).toEqual(["op-1"]);
  });
});
