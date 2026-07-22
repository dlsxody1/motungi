/**
 * DiagnosisScreen(60초 진단) 렌더 스모크(M-017).
 *
 * store 우회는 hooks/useEnsureCatalog.test.ts와 동일한 가변 state 컨벤션.
 * draftToAnswers(@motungi/core)는 순수 로직이라 여기서 mocking하지 않고 실제 구현을 그대로 쓴다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, replaceMock, backMock, setAnswersMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  backMock: vi.fn(),
  setAnswersMock: vi.fn(),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, back: backMock }),
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: { setAnswers: typeof setAnswersMock }) => unknown) =>
    selector({ setAnswers: setAnswersMock }),
}));

import DiagnosisScreen from "./diagnosis";

beforeEach(() => {
  pushMock.mockReset();
  replaceMock.mockReset();
  backMock.mockReset();
  setAnswersMock.mockReset();
});

describe("DiagnosisScreen", () => {
  it("Q1을 렌더하고, 선택 전에는 CTA가 비활성, 선택하면 활성화된다", () => {
    render(<DiagnosisScreen />);

    expect(screen.getByText("Q1. 관심사")).toBeInTheDocument();
    expect(screen.getByText("퇴근하고 뭐 하고 싶으세요?")).toBeInTheDocument();
    expect(screen.getByText("문화·공연")).toBeInTheDocument();
    expect(screen.getByText("운동·산책")).toBeInTheDocument();
    expect(screen.getByText("먹거리·마켓")).toBeInTheDocument();
    expect(screen.getByText("가벼운 부업")).toBeInTheDocument();

    const cta = screen.getByText("결과 보기").closest("[aria-disabled]");
    expect(cta).not.toBeNull();
    expect(cta).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(screen.getByText("문화·공연"));

    // react-native-web Pressable은 disabled=false일 때 aria-disabled 속성 자체를 제거한다
    // (React가 false 값의 aria-* 속성을 렌더하지 않음) — 활성화는 속성 부재로 확인한다.
    expect(cta).not.toHaveAttribute("aria-disabled");
  });
});
