/**
 * useTrailRoute(M-084) — 소비처(opportunity-detail.render-isolation.test.tsx,
 * venue-map.test.tsx)가 전부 이 훅을 vi.mock으로 대체하고 있어, 훅 자체의 세 분기
 * (!res.ok / malformed points / fetch 에러)가 테스트 하에 한 번도 실행된 적이 없었다.
 * useWhyReasons.test.ts와 동일 관례(전역 fetch stub + reportError mock)로 직접 검증한다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTrailRoute } from "./useTrailRoute";

vi.mock("@/lib/api-error", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-error")>("@/lib/api-error");
  return { ...actual, reportError: vi.fn() };
});

import { reportError } from "@/lib/api-error";
const mockedReportError = vi.mocked(reportError);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// M-108 로딩 상태 노트: 이 훅은 `useQuery`의 `data`만 꺼내 `data ?? null`로 반환한다
// (isPending/isLoading은 destructure하지 않는다) — 그래서 반환 타입 `[[lat,lng],...] | null`은
// 최초 렌더(요청 진행 중)·!res.ok·points 없음·fetch reject가 전부 동일한 null로 수렴한다.
// 호출부(지도 카드)가 보기엔 "로딩 중"과 "폴리라인 없음"이 구분되지 않는 것이 의도(우아한
// 열화, 지도 자체는 마커만으로 항상 뜬다)이므로, 로딩만 독립적으로 assert하는 4번째 상태
// 테스트는 추가하지 않는다 — mobile(useTrailRoute.test.ts)과 동일한 설계 판단이다.
describe("useTrailRoute — enabled/id 가드", () => {
  it("enabled=false면 네트워크 호출이 발생하지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute("op-1", false));

    expect(result.current).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("id=null이면 enabled=true여도 네트워크 호출이 발생하지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute(null, true));

    expect(result.current).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("useTrailRoute — 응답 처리(마커만으로 우아한 열화)", () => {
  it("!res.ok 응답이면 null을 반환한다(크래시 없음)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("points 필드가 없으면 null을 반환한다", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("points가 빈 배열이면 null을 반환한다", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ points: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("points가 배열이 아니면 null을 반환한다", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ points: "not-an-array" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("정상 응답이면 points 배열을 그대로 반환한다", async () => {
    const points: [number, number][] = [
      [37.55, 126.9],
      [37.56, 126.91],
    ];
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ points }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(result.current).toEqual(points));
  });
});

describe("useTrailRoute — parity(M-108)", () => {
  it("동일 id + 동일 points 응답이면 반환값이 [[lat,lng],...] shape을 그대로 유지한다(parity, mobile과 동일 계약)", async () => {
    const points: [number, number][] = [
      [37.55, 126.9],
      [37.56, 126.91],
    ];
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ points }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(result.current).toEqual(points));
    // mobile(useTrailRoute.test.ts)과 시그니처가 완전히 같다 — 여기서는 그 반환값이 실제로
    // 튜플 배열 shape을 지키는지를 고정한다.
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current?.every((p) => Array.isArray(p) && p.length === 2)).toBe(true);
  });
});

describe("useTrailRoute — fetch 실패(reject/throw)", () => {
  it("fetch가 reject되면 reportError를 호출하고 null을 반환한다(재throw 아님)", async () => {
    const err = new Error("network down");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(mockedReportError).toHaveBeenCalledWith("useTrailRoute", err));
    expect(result.current).toBeNull();
  });
});
