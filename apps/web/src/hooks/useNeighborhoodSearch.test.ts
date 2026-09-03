/**
 * useNeighborhoodSearch — 디바운스(300ms) + IME(한글) 조합 보류 + 최소 검색어 길이(2자) +
 * enabled 게이트를 검증한다.
 *
 * 왜 이게 중요한가(useNeighborhoodSearch.ts 주석 참조): 한글은 조합 중(자모 단위)에도
 * onChange가 뜬다. 디바운스만 걸고 조합 보류가 없으면 "ㅁ→마→만→망"마다 요청이 나간다.
 * 조합이 끝났는데 그 확정값으로 재검색하지 않으면 마지막 글자가 영영 검색에 반영되지 않는다.
 *
 * 내부 setTimeout 콜백이 async로 searchNeighborhoods를 await하므로, 순수
 * advanceTimersByTime만으로는 그 안의 마이크로태스크가 플러시되지 않는다 —
 * advanceTimersByTimeAsync(+act로 감싸기)로 타이머 발화와 그 뒤 상태 갱신을 함께 처리한다.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeighborhoodSearchResult } from "@/lib/geo";
import { MIN_QUERY_LEN, useNeighborhoodSearch } from "./useNeighborhoodSearch";

vi.mock("@/lib/geo", () => ({
  searchNeighborhoods: vi.fn(),
}));

import { searchNeighborhoods } from "@/lib/geo";
const mockedSearch = vi.mocked(searchNeighborhoods);

/** 훅 내부 DEBOUNCE_MS와 동일. */
const DEBOUNCE_MS = 300;

function pick(dongName: string): NeighborhoodSearchResult {
  return { admCode: "1111051500", dongName, sigungu: "서울 마포구", lat: 37.5556, lng: 126.9019 };
}

/** 타이머를 진행시키고 그 안에서 일어나는 await/상태갱신까지 act로 감싸 플러시한다. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  mockedSearch.mockReset();
  mockedSearch.mockResolvedValue([]);
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useNeighborhoodSearch", () => {
  it("IME 조합 중에는 디바운스가 끝나도 검색하지 않는다", async () => {
    const { result } = renderHook(() => useNeighborhoodSearch());

    act(() => result.current.onCompositionStart());
    act(() => result.current.setQuery("망원"));

    await advance(DEBOUNCE_MS);

    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("onCompositionEnd가 조합 상태를 풀고 확정값으로 재검색을 트리거한다", async () => {
    mockedSearch.mockResolvedValue([pick("망원동")]);
    const { result } = renderHook(() => useNeighborhoodSearch());

    // 조합 중 "망원" — 디바운스가 끝나도 건너뛴다.
    act(() => result.current.onCompositionStart());
    act(() => result.current.setQuery("망원"));
    await advance(DEBOUNCE_MS);
    expect(mockedSearch).not.toHaveBeenCalled();

    // 조합 종료 — 확정값 "망원동"으로 재검색.
    act(() => result.current.onCompositionEnd({ currentTarget: { value: "망원동" } }));
    await advance(DEBOUNCE_MS);

    expect(mockedSearch).toHaveBeenCalledWith("망원동", expect.anything());
    expect(result.current.results).toEqual([pick("망원동")]);
  });

  it("일반(비-IME) 입력은 디바운스(300ms)가 끝나기 전엔 검색하지 않는다", async () => {
    const { result } = renderHook(() => useNeighborhoodSearch());

    act(() => result.current.setQuery("망원동"));

    await advance(DEBOUNCE_MS - 50);
    expect(mockedSearch).not.toHaveBeenCalled();

    await advance(50);
    expect(mockedSearch).toHaveBeenCalledWith("망원동", expect.anything());
  });

  it(`검색어가 MIN_QUERY_LEN(${MIN_QUERY_LEN}자) 미만이면 검색하지 않는다`, async () => {
    const { result } = renderHook(() => useNeighborhoodSearch());

    act(() => result.current.setQuery("망"));

    await advance(DEBOUNCE_MS);

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it("enabled=false면 검색어 길이/타이머와 무관하게 검색하지 않는다", async () => {
    const { result } = renderHook(() => useNeighborhoodSearch(false));

    act(() => result.current.setQuery("망원동"));

    await advance(DEBOUNCE_MS * 2);

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });
});
