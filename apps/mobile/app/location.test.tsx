/**
 * LocationScreen(A2 · 위치/동네 설정) 렌더/동작 회귀(M-035).
 *
 * 막으려는 것: 현재위치 흐름(권한→좌표→역지오코딩)과 검색 디바운스(250ms)는
 * 순서·타이밍에 민감한 비동기 로직이다 — 테스트 없이 리팩터하면 조용히 깨지기 쉽다.
 * 이 테스트는 현재(정상) 동작을 고정한다. location.tsx 자체는 건드리지 않는다.
 *
 * 모킹 컨벤션은 hooks/useOpportunity.test.ts · app/diagnosis.test.tsx와 동일하게
 * vi.hoisted + 가변 mock 함수를 쓴다. normalizeDong(@motungi/core)는 순수 로직이라
 * 실제 구현을 그대로 사용한다(다른 테스트들과 동일한 관례).
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, setAnchorMock, requestPermMock, getPositionMock, reverseGeocodeMock, searchNeighborhoodsMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    setAnchorMock: vi.fn(),
    requestPermMock: vi.fn(),
    getPositionMock: vi.fn(),
    reverseGeocodeMock: vi.fn(),
    searchNeighborhoodsMock: vi.fn(),
  }));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: requestPermMock,
  getCurrentPositionAsync: getPositionMock,
}));

vi.mock("@/lib/geo", () => ({
  reverseGeocode: reverseGeocodeMock,
  searchNeighborhoods: searchNeighborhoodsMock,
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: { setAnchor: typeof setAnchorMock }) => unknown) =>
    selector({ setAnchor: setAnchorMock }),
}));

import LocationScreen from "./location";

beforeEach(() => {
  pushMock.mockReset();
  setAnchorMock.mockReset();
  requestPermMock.mockReset();
  getPositionMock.mockReset();
  reverseGeocodeMock.mockReset();
  searchNeighborhoodsMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LocationScreen — 현재 위치로 찾기", () => {
  it("권한 허용 → 좌표 조회 → 역지오코딩 성공 시 선택 동네가 갱신되고 geoError는 뜨지 않는다", async () => {
    requestPermMock.mockResolvedValueOnce({ status: "granted" });
    getPositionMock.mockResolvedValueOnce({
      coords: { latitude: 37.5, longitude: 127.0 },
    });
    reverseGeocodeMock.mockResolvedValueOnce({ admCode: "1168010100", dongName: "역삼1동" });

    render(<LocationScreen />);

    await act(async () => {
      fireEvent.click(screen.getByText("현재 위치로 찾기"));
      // useCurrentLocation 내부 await 체인(권한→좌표→역지오코딩)이 모두 풀리도록 flush.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(requestPermMock).toHaveBeenCalledTimes(1);
    expect(getPositionMock).toHaveBeenCalledTimes(1);
    expect(reverseGeocodeMock).toHaveBeenCalledWith(37.5, 127.0);
    // NAVER 분리동 번호가 normalizeDong으로 제거된 "역삼동"이 배너에 반영된다.
    expect(screen.getByText("역삼동")).toBeInTheDocument();
    expect(screen.queryByText(/위치 권한이 없어요/)).not.toBeInTheDocument();
    expect(screen.queryByText(/위치를 가져오지 못했어요/)).not.toBeInTheDocument();
  });

  it("권한이 거부되면 geoError를 보여주고 좌표 조회는 하지 않는다", async () => {
    requestPermMock.mockResolvedValueOnce({ status: "denied" });

    render(<LocationScreen />);

    await act(async () => {
      fireEvent.click(screen.getByText("현재 위치로 찾기"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(requestPermMock).toHaveBeenCalledTimes(1);
    expect(getPositionMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("위치 권한이 없어요. 아래에서 동네를 직접 골라주세요."),
    ).toBeInTheDocument();
  });

  it("흐름 중 예외가 발생하면 catch되어 geoError를 보여준다", async () => {
    requestPermMock.mockResolvedValueOnce({ status: "granted" });
    getPositionMock.mockRejectedValueOnce(new Error("boom"));

    render(<LocationScreen />);

    await act(async () => {
      fireEvent.click(screen.getByText("현재 위치로 찾기"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByText("위치를 가져오지 못했어요. 아래에서 동네를 직접 골라주세요."),
    ).toBeInTheDocument();
  });
});

describe("LocationScreen — 검색 디바운스", () => {
  it("250ms 전에는 searchNeighborhoods를 호출하지 않고, 경과 후 정확히 1회 호출한다", () => {
    vi.useFakeTimers();
    searchNeighborhoodsMock.mockResolvedValue([]);

    render(<LocationScreen />);
    const input = screen.getByPlaceholderText("동네 또는 구 검색 (예: 역삼동, 강남구)");

    fireEvent.change(input, { target: { value: "역삼" } });

    expect(searchNeighborhoodsMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(searchNeighborhoodsMock).toHaveBeenCalledTimes(1);
    expect(searchNeighborhoodsMock).toHaveBeenCalledWith("역삼");
  });

  it("연속 입력 시 이전 타이머는 취소되고 최종 검색어에 대해서만 호출된다", () => {
    vi.useFakeTimers();
    searchNeighborhoodsMock.mockResolvedValue([]);

    render(<LocationScreen />);
    const input = screen.getByPlaceholderText("동네 또는 구 검색 (예: 역삼동, 강남구)");

    fireEvent.change(input, { target: { value: "역" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "역삼" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "역삼동" } });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(searchNeighborhoodsMock).toHaveBeenCalledTimes(1);
    expect(searchNeighborhoodsMock).toHaveBeenCalledWith("역삼동");
  });

  it("검색어를 지우면 타이머 경과 없이 드롭다운이 닫힌다(결과 초기화)", () => {
    vi.useFakeTimers();
    searchNeighborhoodsMock.mockResolvedValue([
      { admCode: "1", dongName: "역삼동", sigungu: "서울 강남구", lat: 37.5, lng: 127.0 },
    ]);

    render(<LocationScreen />);
    const input = screen.getByPlaceholderText("동네 또는 구 검색 (예: 역삼동, 강남구)");

    fireEvent.change(input, { target: { value: "역삼" } });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // 드롭다운이 검색 중/결과 표시로 열려 있어야 한다.
    expect(screen.queryByText("검색 결과가 없어요.")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });

    // 타이머를 진행하지 않아도 즉시 드롭다운이 닫히고(최근·인기 동네로 복귀) 검색 호출도 늘지 않는다.
    expect(screen.getByText("최근 · 인기 동네")).toBeInTheDocument();
    expect(searchNeighborhoodsMock).toHaveBeenCalledTimes(1);
  });
});
