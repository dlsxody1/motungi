/**
 * useEnsureCatalog: catalogStatus가 "idle"일 때만 /api/opportunities를 호출해
 * 스토어를 시딩하고, 이미 로드/에러 상태면 재요청하지 않는지 검증한다.
 *
 * 반경 사다리(5→10→20km)는 이 훅이 아니라 **서버(Route Handler)가 소유**한다 —
 * 그쪽 검증은 src/app/api/opportunities/route.test.ts에 있다.
 * 여기서 보는 것은 "요청을 언제 보내고/안 보내고, 응답을 어떻게 스토어에 넣는가"다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { useEnsureCatalog } from "./useEnsureCatalog";

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

/** fetch 목 — /api/opportunities 응답을 흉내낸다. */
const mockFetch = vi.fn();

/** ok 응답 헬퍼. */
function jsonOk(items: MockOpportunity[], status = "ok") {
  return {
    ok: true,
    status: 200,
    json: async () => ({ items, status, radiusKm: null }),
  };
}

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
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  // globals:false라 testing-library 자동 cleanup이 없으므로 수동으로 언마운트한다.
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("useEnsureCatalog", () => {
  it("idle 상태면 /api/opportunities를 호출하고 결과로 스토어를 시딩한다", async () => {
    seedStatus("idle");
    mockFetch.mockResolvedValueOnce(jsonOk([PICK]));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("ok");
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]![0])).toContain("/api/opportunities");
    expect(useAppStore.getState().catalog).toEqual([PICK]);
  });

  it("앵커가 있으면 좌표를 쿼리로 넘긴다(사다리는 서버가 돈다 — 요청은 1회)", async () => {
    seedStatus("idle");
    const home = { dongName: "역삼1동", point: { lat: 37.5006, lng: 127.0364 } };
    useAppStore.setState({ anchors: { home } });
    mockFetch.mockResolvedValue(jsonOk([PICK]));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const url = String(mockFetch.mock.calls[0]![0]);
    expect(url).toContain("lat=37.5006");
    expect(url).toContain("lng=127.0364");
  });

  it("집 앵커가 없으면 직장 앵커 좌표를 쓴다", async () => {
    seedStatus("idle");
    const work = { dongName: "판교동", point: { lat: 37.3948, lng: 127.1112 } };
    useAppStore.setState({ anchors: { work } });
    mockFetch.mockResolvedValue(jsonOk([PICK]));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(String(mockFetch.mock.calls[0]![0])).toContain("lat=37.3948");
  });

  it("앵커가 없으면 좌표 없이 부른다", async () => {
    seedStatus("idle");
    mockFetch.mockResolvedValue(jsonOk([PICK]));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(String(mockFetch.mock.calls[0]![0])).not.toContain("lat=");
  });

  it("빈 결과(empty)도 상태 그대로 스토어에 반영한다", async () => {
    seedStatus("idle");
    mockFetch.mockResolvedValueOnce(jsonOk([], "empty"));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("empty");
    });
    expect(useAppStore.getState().catalog).toEqual([]);
  });

  it("503(미설정)은 unconfigured로 옮긴다 — 에러와 구분해야 안내 문구가 달라진다", async () => {
    seedStatus("idle");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("unconfigured");
    });
  });

  it("네트워크 실패는 error로 떨어뜨린다(화면이 무한 로딩에 갇히지 않게)", async () => {
    seedStatus("idle");
    mockFetch.mockRejectedValueOnce(new TypeError("network"));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("error");
    });
  });

  it("이미 로드된(ok) 상태면 재요청하지 않는다", async () => {
    seedStatus("ok");

    renderHook(() => useEnsureCatalog());

    await Promise.resolve();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(useAppStore.getState().catalogStatus).toBe("ok");
  });

  it("에러 상태여도 재시도하지 않는다(무한 재요청 방지)", async () => {
    seedStatus("error");

    renderHook(() => useEnsureCatalog());

    await Promise.resolve();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(useAppStore.getState().catalogStatus).toBe("error");
  });

  it("성공한 뒤(ok로 전이) 리렌더돼도 다시 호출하지 않는다", async () => {
    seedStatus("idle");
    mockFetch.mockResolvedValueOnce(jsonOk([PICK]));

    const { rerender } = renderHook(() => useEnsureCatalog());

    await waitFor(() => {
      expect(useAppStore.getState().catalogStatus).toBe("ok");
    });

    rerender();
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("응답 도착 전 언마운트되면 요청을 abort하고 스토어를 시딩하지 않는다", async () => {
    seedStatus("idle");
    let seenSignal: AbortSignal | undefined;
    let resolveFetch!: (r: unknown) => void;
    mockFetch.mockImplementationOnce((_url: string, init: RequestInit) => {
      seenSignal = init.signal ?? undefined;
      return new Promise((res) => {
        resolveFetch = res;
      });
    });

    const { unmount } = renderHook(() => useEnsureCatalog());
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();
    // 결과만 버리는 게 아니라 실제로 요청이 끊겼는지 본다.
    expect(seenSignal?.aborted).toBe(true);

    resolveFetch(jsonOk([PICK]));
    await Promise.resolve();
    await Promise.resolve();
    expect(useAppStore.getState().catalogStatus).toBe("idle");
    expect(useAppStore.getState().catalog).toEqual([]);
  });

  it("동네를 바꾸면(좌표 변경) 이미 로드됐어도 다시 조회한다", async () => {
    seedStatus("idle");
    const home = { dongName: "역삼1동", point: { lat: 37.5006, lng: 127.0364 } };
    useAppStore.setState({ anchors: { home } });
    mockFetch.mockResolvedValue(jsonOk([PICK]));

    const { rerender } = renderHook(() => useEnsureCatalog());
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // /location에서 다른 동네를 고른 상황 — 이 재조회가 없으면 옛 동네 목록이 그대로 남는다.
    const mangwon = { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } };
    useAppStore.setState({ anchors: { home: mangwon } });
    rerender();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(String(mockFetch.mock.calls[1]![0])).toContain("lat=37.5556");
  });
});
