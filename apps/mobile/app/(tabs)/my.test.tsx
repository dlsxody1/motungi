/**
 * MyScreen(D1 · 마이) 렌더 스모크 + accessibilityRole 스윕(M-073).
 *
 * saved.test.tsx/opportunity.test.tsx와 같은 목업 컨벤션 — store는 가변 state +
 * selector 흉내, expo-router/lib/auth는 vi.fn()으로 완전히 우회한다. Alert.alert는
 * react-native-web에서 no-op이므로(react-native-web/dist/exports/Alert) 로그아웃
 * 확인 다이얼로그는 호출 여부만 spy로 검증한다.
 */
import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, signOutMock, state } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  signOutMock: vi.fn(),
  state: {
    anchors: {} as { home?: { dongName?: string } },
    answers: null as unknown,
    savedIds: [] as string[],
    user: null as unknown,
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock("@/lib/auth", () => ({ signOut: signOutMock }));

import MyScreen from "./my";

beforeEach(() => {
  pushMock.mockReset();
  signOutMock.mockReset();
  state.anchors = {};
  state.answers = null;
  state.savedIds = [];
  state.user = null;
});

describe("MyScreen", () => {
  it("재진단 버튼이 button role로 노출되고 누르면 /diagnosis로 이동한다(M-073)", () => {
    render(<MyScreen />);

    const redo = screen.getByText("재진단").closest('[role="button"]');
    expect(redo).not.toBeNull();
    fireEvent.click(redo!);
    expect(pushMock).toHaveBeenCalledWith("/diagnosis");
  });

  it("비로그인 상태의 메뉴 5개 행 전부 button role로 노출된다(M-073)", () => {
    state.user = null;
    render(<MyScreen />);

    for (const label of ["로그인", "보관함", "내 동네 관리", "알림 설정"]) {
      expect(screen.getByText(label).closest('[role="button"]')).not.toBeNull();
    }
    expect(screen.queryByText("로그아웃")).not.toBeInTheDocument();
  });

  it("로그인 상태면 로그인 행 대신 로그아웃 행이 button role로 노출된다(M-073)", () => {
    state.user = { id: "u-1", displayName: "도윤" };
    render(<MyScreen />);

    expect(screen.queryByText("로그인")).not.toBeInTheDocument();
    const logout = screen.getByText("로그아웃").closest('[role="button"]');
    expect(logout).not.toBeNull();

    const alertSpy = vi.spyOn(Alert, "alert");
    fireEvent.click(logout!);
    expect(alertSpy).toHaveBeenCalledWith(
      "로그아웃",
      expect.any(String),
      expect.any(Array),
    );
  });

  it("보관함 행을 누르면 /saved로 이동한다", () => {
    render(<MyScreen />);

    fireEvent.click(screen.getByText("보관함").closest('[role="button"]')!);
    expect(pushMock).toHaveBeenCalledWith("/saved");
  });

  it("내 동네 관리 행을 누르면 /location으로 이동한다", () => {
    render(<MyScreen />);

    fireEvent.click(screen.getByText("내 동네 관리").closest('[role="button"]')!);
    expect(pushMock).toHaveBeenCalledWith("/location");
  });

  it("알림 설정(soon) 행은 disabled 상태를 노출하고 눌러도 이동하지 않는다", () => {
    render(<MyScreen />);

    const soonRow = screen.getByText("알림 설정").closest('[role="button"]')!;
    expect(soonRow).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(soonRow);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
