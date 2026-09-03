/**
 * geo.ts(reverseGeocode / searchNeighborhoods) 계약 테스트.
 *
 * 두 함수 모두 실패를 예외로 던지지 않고 null/[]로 삼킨다 — 호출부가 기존 선택으로
 * 폴백하기 위해서다. 다만 "예상된 폴백"(!res.ok, AbortError)과 "진짜 에러"를
 * reportError 호출 여부로 구분해 고정한다. 조용히 망가지면(reportError가 과다/과소
 * 호출되면) 아무것도 안 깨진 것처럼 보이므로 테스트로 잡아둔다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reportError = vi.fn();
vi.mock("@/lib/api-error", () => ({
  reportError: (...args: unknown[]) => reportError(...args),
}));

import { reverseGeocode, searchNeighborhoods } from "./geo";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  reportError.mockClear();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("reverseGeocode", () => {
  it("성공하면 admCode/dongName을 반환하고 /api/geo를 좌표로 호출한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ admCode: "11", dongName: "역삼동" }),
    });

    const result = await reverseGeocode(37.5006, 127.0364);

    expect(result).toEqual({ admCode: "11", dongName: "역삼동" });
    expect(mockFetch).toHaveBeenCalledWith("/api/geo?lat=37.5006&lng=127.0364");
  });

  it("응답이 !res.ok면 null을 반환하고 reportError는 부르지 않는다(기대된 폴백)", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const result = await reverseGeocode(37.5006, 127.0364);

    expect(result).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("응답에 dongName이 없으면 null을 반환한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ admCode: "11" }),
    });

    const result = await reverseGeocode(37.5006, 127.0364);

    expect(result).toBeNull();
  });

  it("네트워크 에러 등 예외가 나면 null을 반환하고 reportError로 남긴다", async () => {
    const err = new Error("network down");
    mockFetch.mockRejectedValue(err);

    const result = await reverseGeocode(37.5006, 127.0364);

    expect(result).toBeNull();
    expect(reportError).toHaveBeenCalledWith("lib/geo:reverseGeocode", err);
  });
});

describe("searchNeighborhoods", () => {
  it("검색어가 공백뿐이면 빈 배열을 반환하고 fetch를 호출하지 않는다", async () => {
    const result = await searchNeighborhoods("   ");

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("성공하면 items를 반환하고 검색어를 encodeURIComponent로 인코딩한다", async () => {
    const items = [
      { admCode: "1111051500", dongName: "망원동", sigungu: "서울 마포구", lat: 37.5556, lng: 126.9019 },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items }),
    });

    const result = await searchNeighborhoods("망원 1동");

    expect(result).toEqual(items);
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/neighborhoods?q=${encodeURIComponent("망원 1동")}`,
      { signal: undefined },
    );
  });

  it("응답이 !res.ok면 빈 배열을 반환한다", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const result = await searchNeighborhoods("망원동");

    expect(result).toEqual([]);
  });

  it("items 키가 없으면(?? []) 빈 배열을 반환한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await searchNeighborhoods("망원동");

    expect(result).toEqual([]);
  });

  it("AbortError는 취소가 정상 동작이라 빈 배열만 반환하고 reportError는 부르지 않는다", async () => {
    mockFetch.mockRejectedValue(new DOMException("aborted", "AbortError"));

    const result = await searchNeighborhoods("망원동");

    expect(result).toEqual([]);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("AbortError가 아닌 예외는 빈 배열을 반환하고 reportError로 남긴다", async () => {
    const err = new TypeError("network");
    mockFetch.mockRejectedValue(err);

    const result = await searchNeighborhoods("망원동");

    expect(result).toEqual([]);
    expect(reportError).toHaveBeenCalledWith("lib/geo:searchNeighborhoods", err);
  });
});
