/**
 * useTrailRoute(M-052) 계약 검증. 패턴은 useWhyReasons.test.ts와 동일 —
 * EXPO_PUBLIC_WEB_ORIGIN을 함수 내부에서 매 호출 시 읽으므로 테스트마다
 * process.env를 직접 세팅해 오리진 없음/있음 두 경로를 모두 고정한다.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTrailRoute } from "./useTrailRoute";

const originalOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  delete process.env.EXPO_PUBLIC_WEB_ORIGIN;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalOrigin === undefined) delete process.env.EXPO_PUBLIC_WEB_ORIGIN;
  else process.env.EXPO_PUBLIC_WEB_ORIGIN = originalOrigin;
});

describe("useTrailRoute", () => {
  it("WEB_ORIGIN 미설정이면 fetch 없이 null을 반환한다", async () => {
    const { result } = renderHook(() => useTrailRoute("o-1", true));
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it("enabled=false면 fetch하지 않는다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    const { result } = renderHook(() => useTrailRoute("o-1", false));
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it("id가 null이면 fetch하지 않는다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    const { result } = renderHook(() => useTrailRoute(null, true));
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it("200 OK + points가 있으면 좌표 배열을 반환한다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    const points: [number, number][] = [
      [37.5, 127.0],
      [37.51, 127.01],
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ points }),
    } as Response);

    const { result } = renderHook(() => useTrailRoute("o-1", true));

    await waitFor(() => expect(result.current).toEqual(points));
    expect(fetch).toHaveBeenCalledWith(
      "http://test.local/api/trail-route?id=o-1",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("non-OK 응답이면 null을 반환한다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    const { result } = renderHook(() => useTrailRoute("o-1", true));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current).toBeNull();
  });

  it("points가 비어 있으면 null을 반환한다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ points: [] }) } as Response);

    const { result } = renderHook(() => useTrailRoute("o-1", true));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current).toBeNull();
  });

  it("네트워크 실패면 null을 반환하고 던지지 않는다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useTrailRoute("o-1", true));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current).toBeNull();
  });
});
