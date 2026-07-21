/**
 * LocationPage 핵심 UX 테스트.
 * 요청 1(현재 위치): geo 성공 시 /diagnosis로 바로 넘어가지 않고 확인만 갱신한다.
 * "시작하기"를 눌러야 앵커 저장 + 이동한다.
 */
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as navigation from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import * as geo from "@/lib/geo";
import LocationPage from "./page";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockRouter() {
  const push = vi.fn();
  vi.spyOn(navigation, "useRouter").mockReturnValue({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof navigation.useRouter>);
  return push;
}

/** navigator.geolocation.getCurrentPosition을 성공 좌표로 모킹. */
function mockGeolocationSuccess(lat: number, lng: number) {
  const getCurrentPosition = vi.fn((ok: PositionCallback) => {
    ok({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition);
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

beforeEach(() => {
  useAppStore.setState({ anchors: {} });
});

describe("LocationPage — 현재 위치 피드백(요청 1)", () => {
  it("geo 성공 시 /diagnosis로 넘어가지 않고 확인 배너만 현재 동네로 갱신한다", async () => {
    const push = mockRouter();
    mockGeolocationSuccess(37.4952, 127.0373);
    vi.spyOn(geo, "reverseGeocode").mockResolvedValue({ admCode: "1168064000", dongName: "역삼1동" });

    const user = userEvent.setup();
    render(<LocationPage />);

    // "현재 위치로 찾기"는 모바일·데스크탑 양쪽에 있으니 첫 번째를 클릭.
    await user.click(screen.getAllByRole("button", { name: /현재 위치로 찾기/ })[0]!);

    // 배너가 역삼1동으로 갱신되고(확인용), 아직 이동하지 않는다.
    await waitFor(() => {
      expect(screen.getAllByText(/역삼1동/).length).toBeGreaterThan(0);
    });
    expect(push).not.toHaveBeenCalled();

    // 시작 버튼도 역삼1동으로 라벨이 바뀐다.
    expect(screen.getAllByRole("button", { name: /역삼1동으로 시작하기/ }).length).toBeGreaterThan(0);
  });

  it("확인 후 '시작하기'를 눌러야 앵커 저장 + /diagnosis 이동", async () => {
    const push = mockRouter();
    mockGeolocationSuccess(37.4952, 127.0373);
    vi.spyOn(geo, "reverseGeocode").mockResolvedValue({ admCode: "1168064000", dongName: "역삼1동" });

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.click(screen.getAllByRole("button", { name: /현재 위치로 찾기/ })[0]!);
    await waitFor(() => expect(screen.getAllByText(/역삼1동/).length).toBeGreaterThan(0));

    await user.click(screen.getAllByRole("button", { name: /역삼1동으로 시작하기/ })[0]!);

    expect(push).toHaveBeenCalledWith("/diagnosis");
    const anchor = useAppStore.getState().anchors.home;
    expect(anchor?.dongName).toBe("역삼1동");
    expect(anchor?.point).toEqual({ lat: 37.4952, lng: 127.0373 });
  });
});

describe("LocationPage — 검색 드롭다운(요청 2)", () => {
  it("검색어를 입력하면 결과가 드롭다운으로 펼쳐지고, 선택하면 시작 버튼에 반영된다", async () => {
    mockRouter();
    vi.spyOn(geo, "searchNeighborhoods").mockResolvedValue([
      { admCode: "SEO-강남구-역삼1동", dongName: "역삼1동", sigungu: "강남구", lat: 37.5, lng: 127.03 },
    ]);

    const user = userEvent.setup();
    render(<LocationPage />);

    await user.type(screen.getAllByLabelText("동네 이름 검색")[0]!, "역삼");

    // 드롭다운 옵션이 뜬다(디바운스 300ms 이후).
    await waitFor(
      () => expect(screen.getAllByRole("option").length).toBeGreaterThan(0),
      { timeout: 1500 },
    );
    // 옵션(li) 안의 실제 클릭 대상은 내부 button — 그걸 눌러 choose가 발화한다.
    await user.click(within(screen.getAllByRole("option")[0]!).getByRole("button"));

    // 선택 후 시작 버튼 라벨이 역삼1동으로 바뀐다(별도 확인 배너 없이).
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /역삼1동으로 시작하기/ }).length,
      ).toBeGreaterThan(0),
    );
  });

  it("1글자(음절 미만)로는 검색 요청을 보내지 않는다(요청 3 · 요청 절감)", async () => {
    mockRouter();
    const search = vi.spyOn(geo, "searchNeighborhoods").mockResolvedValue([]);

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.type(screen.getAllByLabelText("동네 이름 검색")[0]!, "역");

    // MIN_QUERY_LEN(2) 미만이면 디바운스 지나도 호출 없음.
    await new Promise((r) => setTimeout(r, 450));
    expect(search).not.toHaveBeenCalled();
  });
});

describe("LocationPage — 위치 카드 상태 흡수(요청 1)", () => {
  it("현재 위치로 잡으면 카드가 '…으로 설정됨' 상태로 바뀌고 '다시 찾기'가 뜬다", async () => {
    mockRouter();
    mockGeolocationSuccess(37.4952, 127.0373);
    vi.spyOn(geo, "reverseGeocode").mockResolvedValue({ admCode: "1168064000", dongName: "역삼1동" });

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.click(screen.getAllByRole("button", { name: /현재 위치로 찾기/ })[0]!);

    // 카드 자체가 선택 동네를 보여준다(별도 확인 배너 없이).
    await waitFor(() =>
      expect(screen.getAllByText(/역삼1동으로 설정됨/).length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText(/다시 찾기/).length).toBeGreaterThan(0);
  });
});
