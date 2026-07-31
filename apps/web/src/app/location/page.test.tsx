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

/**
 * navigator.permissions.query 모킹.
 * 카드 클릭 → 권한 프롬프트 사이에 설명 다이얼로그가 끼는 건 **아직 안 물어본(prompt)**
 * 경우뿐이다. 이미 허용한 재방문자는 설명 없이 바로 조회되므로, 기존 geo 플로우 테스트는
 * "granted"로 두고 프롬프트 경로만 별도 describe에서 검증한다.
 */
function mockPermission(state: PermissionState) {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query: vi.fn().mockResolvedValue({ state }) },
  });
}

beforeEach(() => {
  useAppStore.setState({ anchors: {} });
  mockPermission("granted");
  // jsdom은 <dialog>.showModal을 구현하지 않아 open 속성 토글로 대체한다.
  // 닫힌 dialog의 내용은 DOM엔 남지만 접근성 트리에서 빠지므로, 열림 여부는
  // getByText가 아니라 **role 쿼리**로 판정해야 한다.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  }
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

    // 배너가 역삼동으로 갱신되고(확인용), 아직 이동하지 않는다.
    await waitFor(() => {
      expect(screen.getAllByText(/역삼동/).length).toBeGreaterThan(0);
    });
    expect(push).not.toHaveBeenCalled();

    // 시작 버튼도 역삼동으로 라벨이 바뀐다.
    expect(screen.getAllByRole("button", { name: /역삼동으로 시작하기/ }).length).toBeGreaterThan(0);
  });

  it("확인 후 '시작하기'를 눌러야 앵커 저장 + /diagnosis 이동", async () => {
    const push = mockRouter();
    mockGeolocationSuccess(37.4952, 127.0373);
    vi.spyOn(geo, "reverseGeocode").mockResolvedValue({ admCode: "1168064000", dongName: "역삼1동" });

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.click(screen.getAllByRole("button", { name: /현재 위치로 찾기/ })[0]!);
    await waitFor(() => expect(screen.getAllByText(/역삼동/).length).toBeGreaterThan(0));

    await user.click(screen.getAllByRole("button", { name: /역삼동으로 시작하기/ })[0]!);

    expect(push).toHaveBeenCalledWith("/diagnosis");
    const anchor = useAppStore.getState().anchors.home;
    expect(anchor?.dongName).toBe("역삼동");
    expect(anchor?.point).toEqual({ lat: 37.4952, lng: 127.0373 });
  });
});

describe("LocationPage — 검색 드롭다운(요청 2)", () => {
  it("검색어를 입력하면 결과가 드롭다운으로 펼쳐지고, 선택하면 시작 버튼에 반영된다", async () => {
    mockRouter();
    vi.spyOn(geo, "searchNeighborhoods").mockResolvedValue([
      { admCode: "SEO-강남구-역삼1동", dongName: "역삼동", sigungu: "강남구", lat: 37.5, lng: 127.03 },
    ]);

    const user = userEvent.setup();
    render(<LocationPage />);

    await user.type(screen.getAllByLabelText("동네 또는 구 검색")[0]!, "역삼");

    // 드롭다운 옵션이 뜬다(디바운스 300ms 이후).
    await waitFor(
      () => expect(screen.getAllByRole("option").length).toBeGreaterThan(0),
      { timeout: 1500 },
    );
    // 옵션(li) 안의 실제 클릭 대상은 내부 button — 그걸 눌러 choose가 발화한다.
    await user.click(within(screen.getAllByRole("option")[0]!).getByRole("button"));

    // 선택 후 시작 버튼 라벨이 역삼동으로 바뀐다(별도 확인 배너 없이).
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /역삼동으로 시작하기/ }).length,
      ).toBeGreaterThan(0),
    );
  });

  it("1글자(음절 미만)로는 검색 요청을 보내지 않는다(요청 3 · 요청 절감)", async () => {
    mockRouter();
    const search = vi.spyOn(geo, "searchNeighborhoods").mockResolvedValue([]);

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.type(screen.getAllByLabelText("동네 또는 구 검색")[0]!, "역");

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
      expect(screen.getAllByText(/역삼동으로 설정됨/).length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText(/다시 찾기/).length).toBeGreaterThan(0);
  });
});

describe("LocationPage — 권한 프롬프트 전 설명 단계", () => {
  it("아직 안 물어본(prompt) 상태면 바로 조회하지 않고 설명 다이얼로그를 먼저 띄운다", async () => {
    mockRouter();
    mockPermission("prompt");
    const getCurrentPosition = mockGeolocationSuccess(37.4952, 127.0373);

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.click(screen.getAllByRole("button", { name: /현재 위치로 찾기/ })[0]!);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "위치 허용하고 찾기" })).toBeInTheDocument(),
    );
    // 설명을 보기도 전에 브라우저 권한 프롬프트가 뜨면 안 된다.
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "위치 허용하고 찾기" }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("이미 허용한(granted) 상태면 설명 없이 바로 조회한다", async () => {
    mockRouter();
    mockPermission("granted");
    const getCurrentPosition = mockGeolocationSuccess(37.4952, 127.0373);

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.click(screen.getAllByRole("button", { name: /현재 위치로 찾기/ })[0]!);

    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: "위치 허용하고 찾기" })).not.toBeInTheDocument();
  });

  it("거부된(denied) 상태면 조회를 시도하지 않고 복구 방법을 안내한다", async () => {
    mockRouter();
    mockPermission("denied");
    const getCurrentPosition = mockGeolocationSuccess(37.4952, 127.0373);

    const user = userEvent.setup();
    render(<LocationPage />);
    await user.click(screen.getAllByRole("button", { name: /현재 위치로 찾기/ })[0]!);

    // 거부 상태에서 getCurrentPosition을 부르면 프롬프트도 안 뜨고 조용히 실패한다.
    await waitFor(() => expect(screen.getAllByText(/위치 권한이 꺼져 있어요/).length).toBeGreaterThan(0));
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
