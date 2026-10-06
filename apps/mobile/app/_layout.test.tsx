/** 루트 레이아웃의 ErrorBoundary export(M-125) — 웹 error.tsx와 같은 카피, retry·홈 동작. */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock("expo-router", () => ({ router: { replace: replaceMock }, Stack: () => null }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("@/lib/auth", () => ({ initAuthListener: () => () => {} }));
vi.mock("@/ui/splash", () => ({ Splash: () => null }));

import { ErrorBoundary } from "./_layout";

describe("ErrorBoundary (_layout)", () => {
  beforeEach(() => replaceMock.mockClear());

  it("alert 역할로 에러 카피와 두 버튼을 보여준다", () => {
    render(<ErrorBoundary error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("문제가 생겼어요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "홈으로" })).toBeTruthy();
  });

  it("'다시 시도'는 retry()를, '홈으로'는 router.replace('/')를 호출한다", () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    render(<ErrorBoundary error={new Error("boom")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(replaceMock).toHaveBeenCalledWith("/");
  });
});
