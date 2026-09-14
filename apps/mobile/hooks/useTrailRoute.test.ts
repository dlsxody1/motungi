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

// M-108 로딩 상태 노트: 이 훅은 로딩을 별도 플래그로 노출하지 않는다. 반환 타입은
// `[[lat,lng],...] | null` 하나뿐이고, 초기 렌더(useState(null))·fetch 진행 중·오리진
// 미설정·네트워크 실패·points 없음이 전부 같은 값 null로 수렴한다(우아한 열화가 설계
// 의도 — 위 파일 상단 주석 "실패는 전부 null" 참조). 즉 "로딩 중" 렌더와 "빈/에러"
// 렌더가 호출부 입장에서 구분 불가능하므로, 로딩만 따로 assert하는 4번째 상태 테스트는
// 추가하지 않는다 — 추가해봐야 아래 empty 계열 테스트와 동일한 단언을 반복할 뿐이다.
// 빠뜨린 게 아니라 반환 shape 자체가 그렇게 설계됐다는 사실을 남겨둔다(QA M-108 fix round).
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

  it("동일 id + 동일 points 응답이면 반환값이 [[lat,lng],...] shape을 그대로 유지한다(parity, web과 동일 계약, M-108)", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    const points: [number, number][] = [
      [37.55, 126.9],
      [37.56, 126.91],
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ points }),
    } as Response);

    const { result } = renderHook(() => useTrailRoute("op-1", true));

    await waitFor(() => expect(result.current).toEqual(points));
    // web(useTrailRoute.test.ts)과 시그니처((id, enabled) => [[lat,lng],...] | null)가 완전히
    // 같다 — 여기서는 그 반환값이 실제로 튜플 배열 shape을 지키는지를 고정한다.
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current?.every((p) => Array.isArray(p) && p.length === 2)).toBe(true);
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
