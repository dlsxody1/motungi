/**
 * useSavedOpportunities: 저장 id를 catalog(반경 창) + 벌크 조회로 해소하는지 검증(M-045/M-075).
 * - savedIds가 비면 조회 없이 "empty".
 * - catalog에 있는 id는 재조회하지 않는다.
 * - catalog에 없는 id들은 fetchOpportunitiesByIds로 **한 번에** 조회한다(N+1 아님, M-075).
 * - 응답 순서와 무관하게 결과는 savedIds 순서를 보존한다.
 * - 조회 실패는 "error", retry()는 아직 못 받은(=catalog 밖) id만 다시 조회한다.
 *
 * 모킹은 useOpportunity.test.ts와 동일한 vi.hoisted 컨벤션.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

const { fetchOpportunitiesByIdsMock } = vi.hoisted(() => ({
  fetchOpportunitiesByIdsMock: vi.fn(),
}));

vi.mock("@/data/opportunities", () => ({
  fetchOpportunitiesByIds: fetchOpportunitiesByIdsMock,
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
  fetchOpportunitiesByIdsMock.mockReset();
});

describe("useSavedOpportunities", () => {
  it("savedIds가 비면 조회 없이 empty를 반환한다", async () => {
    const { result } = renderHook(() => useSavedOpportunities([], []));

    await Promise.resolve();
    expect(fetchOpportunitiesByIdsMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("empty");
    expect(result.current.items).toEqual([]);
  });

  it("catalog에 있는 id는 재조회 없이 그대로 쓴다", async () => {
    const catalog = [pick("op-1"), pick("op-2")];

    const { result } = renderHook(() => useSavedOpportunities(["op-2"], catalog));

    await Promise.resolve();
    expect(fetchOpportunitiesByIdsMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("ok");
    expect(result.current.items.map((o) => o.id)).toEqual(["op-2"]);
  });

  it("catalog에 없는 id는 fetchOpportunitiesByIds로 벌크 조회한다", async () => {
    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({ data: [pick("op-9")], status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities(["op-9"], []));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchOpportunitiesByIdsMock).toHaveBeenCalledTimes(1);
    expect(fetchOpportunitiesByIdsMock).toHaveBeenCalledWith(["op-9"]);
    expect(result.current.items.map((o) => o.id)).toEqual(["op-9"]);
  });

  it("catalog 창 밖 저장 항목이 10건 이상이어도 네트워크 조회는 1회뿐이다(N+1 회귀 방지, M-075)", async () => {
    const missing = Array.from({ length: 12 }, (_, i) => `op-${i}`);
    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({
      data: missing.map((id) => pick(id)),
      status: "ok",
    });

    const { result } = renderHook(() => useSavedOpportunities(missing, []));

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchOpportunitiesByIdsMock).toHaveBeenCalledTimes(1);
    expect(fetchOpportunitiesByIdsMock).toHaveBeenCalledWith(missing);
    expect(result.current.items).toHaveLength(12);
  });

  it("응답이 savedIds와 다른 순서로 와도 결과는 savedIds 순서를 보존한다", async () => {
    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({
      data: [pick("op-b"), pick("op-a")],
      status: "ok",
    });

    const { result } = renderHook(() => useSavedOpportunities(["op-a", "op-b"], []));

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.items.map((o) => o.id)).toEqual(["op-a", "op-b"]);
  });

  it("삭제된 활동(응답에 id 없음)은 조용히 건너뛴다", async () => {
    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({ data: [pick("op-a")], status: "ok" });

    const { result } = renderHook(() => useSavedOpportunities(["op-a", "op-deleted"], []));

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.items.map((o) => o.id)).toEqual(["op-a"]);
  });

  it("조회 실패면 status가 error가 되고, retry()는 catalog 밖 id만 다시 벌크 조회한다", async () => {
    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({ data: [], status: "error" });

    const { result } = renderHook(() => useSavedOpportunities(["op-1", "op-2"], []));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(fetchOpportunitiesByIdsMock).toHaveBeenCalledTimes(1);

    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({
      data: [pick("op-1"), pick("op-2")],
      status: "ok",
    });
    result.current.retry();

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchOpportunitiesByIdsMock).toHaveBeenCalledTimes(2);
    expect(fetchOpportunitiesByIdsMock).toHaveBeenLastCalledWith(["op-1", "op-2"]);
    expect(result.current.items.map((o) => o.id)).toEqual(["op-1", "op-2"]);
  });

  it("catalog로 이미 해소된 id는 실패 후 retry에도 재요청 대상에 들어가지 않는다", async () => {
    const catalog = [pick("op-cached")];
    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({ data: [], status: "error" });

    const { result } = renderHook(() => useSavedOpportunities(["op-cached", "op-missing"], catalog));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(fetchOpportunitiesByIdsMock).toHaveBeenCalledWith(["op-missing"]);

    fetchOpportunitiesByIdsMock.mockResolvedValueOnce({ data: [pick("op-missing")], status: "ok" });
    result.current.retry();

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchOpportunitiesByIdsMock).toHaveBeenLastCalledWith(["op-missing"]);
    expect(result.current.items.map((o) => o.id)).toEqual(["op-cached", "op-missing"]);
  });
});
