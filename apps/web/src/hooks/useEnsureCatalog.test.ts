/**
 * useEnsureCatalog: /api/opportunities를 호출해 카탈로그를 돌려주고,
 * 좌표가 그대로면 재요청하지 않는지 검증한다.
 *
 * 반경 사다리(5→10→20km)는 이 훅이 아니라 **서버(Route Handler)가 소유**한다 —
 * 그쪽 검증은 src/app/api/opportunities/route.test.ts에 있다.
 * 여기서 보는 것은 "요청을 언제 보내고/안 보내고, 응답을 어떻게 화면에 넘기는가"다.
 *
 * 캐시가 스토어가 아니라 react-query로 옮겼으므로(M: 서버상태 분리) 단언 대상도
 * `useAppStore.getState().catalog`가 아니라 **훅 반환값**이다 — 화면이 실제로 보는 것.
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

/** 클라이언트 상태를 초기화한다(앵커 잔여로 다음 테스트가 오염되지 않게). */
function resetStore() {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: [],
    user: null,
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  resetStore();
});

afterEach(() => {
  // globals:false라 testing-library 자동 cleanup이 없으므로 수동으로 언마운트한다.
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("useEnsureCatalog", () => {
  it("/api/opportunities를 호출하고 결과를 돌려준다", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([PICK]));

    const { result } = renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[0]![0])).toContain("/api/opportunities");
    expect(result.current.catalog).toEqual([PICK]);
  });

  it("조회가 끝나기 전에는 idle이다 — 화면이 '없음'을 띄우면 거짓말이 된다", async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    const { result } = renderHook(() => useEnsureCatalog());

    expect(result.current.status).toBe("idle");
    expect(result.current.catalog).toEqual([]);
  });

  it("앵커가 있으면 좌표를 쿼리로 넘긴다(사다리는 서버가 돈다 — 요청은 1회)", async () => {
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
    const work = { dongName: "판교동", point: { lat: 37.3948, lng: 127.1112 } };
    useAppStore.setState({ anchors: { work } });
    mockFetch.mockResolvedValue(jsonOk([PICK]));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(String(mockFetch.mock.calls[0]![0])).toContain("lat=37.3948");
  });

  it("앵커가 없으면 좌표 없이 부른다", async () => {
    mockFetch.mockResolvedValue(jsonOk([PICK]));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(String(mockFetch.mock.calls[0]![0])).not.toContain("lat=");
  });

  it("빈 결과(empty)도 상태 그대로 전달한다", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([], "empty"));

    const { result } = renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.catalog).toEqual([]);
  });

  it("503(미설정)은 unconfigured로 옮긴다 — 에러와 구분해야 안내 문구가 달라진다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    const { result } = renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(result.current.status).toBe("unconfigured"));
  });

  it("네트워크 실패는 error로 떨어뜨린다(화면이 무한 로딩에 갇히지 않게)", async () => {
    mockFetch.mockRejectedValue(new TypeError("network"));

    const { result } = renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("성공한 뒤 리렌더돼도 다시 호출하지 않는다", async () => {
    mockFetch.mockResolvedValueOnce(jsonOk([PICK]));

    const { result, rerender } = renderHook(() => useEnsureCatalog());
    await waitFor(() => expect(result.current.status).toBe("ok"));

    rerender();
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("요청에 abort signal을 넘긴다 — 언마운트 시 실제로 끊기게", async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    const { unmount } = renderHook(() => useEnsureCatalog());
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const init = mockFetch.mock.calls[0]![1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    unmount();
  });

  it("동네를 바꾸면(좌표 변경) 이미 로드됐어도 다시 조회한다", async () => {
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
