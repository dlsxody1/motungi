/**
 * Chip 컴포넌트 접근성 스모크(M-031).
 *
 * Chip은 웹의 Chip(aria-pressed, M-013)에 대응하는 모바일 짝인데 accessibilityRole/State가
 * 빠져 있었다 — 스크린리더가 눌러야 하는 컨트롤인지, 지금 선택돼 있는지 알 수 없었다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-router", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

import { Button, Chip } from "./components";

describe("Chip", () => {
  it("접근 가능한 button role과 선택 상태를 노출한다", () => {
    const onPress = vi.fn();
    render(<Chip label="문화·공연" active={false} onPress={onPress} />);

    const chip = screen.getByText("문화·공연").closest('[role="button"]');
    expect(chip).not.toBeNull();
    expect(chip).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByText("문화·공연"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("active=true면 선택 상태가 true로 노출된다", () => {
    render(<Chip label="전체" active={true} onPress={() => {}} />);

    const chip = screen.getByText("전체").closest('[role="button"]');
    expect(chip).toHaveAttribute("aria-selected", "true");
  });
});

describe("Button", () => {
  it("접근 가능한 button role로 노출된다(M-058)", () => {
    const onPress = vi.fn();
    render(<Button label="확인" onPress={onPress} />);

    const btn = screen.getByRole("button", { name: "확인" });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
