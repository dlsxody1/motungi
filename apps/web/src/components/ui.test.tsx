/**
 * ui.tsx 공용 프리미티브 계약 검증.
 * 각 프리미티브가 핵심 props(preset/variant/size/disabled/onClick/active/tone 등)를
 * 실제 DOM(태그·클래스·이벤트)에 올바르게 반영하는지 RTL로 확인한다.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// globals:false 설정이라 자동 cleanup이 등록되지 않는다 → 렌더 누적 방지를 위해 수동 정리.
afterEach(() => cleanup());
import { Button, Chip, Logo, MobileScreen, SafeBottom, SafeTop, Tag } from "./ui";

describe("Button", () => {
  it("children을 렌더하고 기본은 primary·lg·block(w-full)이다", () => {
    render(<Button>확인</Button>);
    const btn = screen.getByRole("button", { name: "확인" });
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("h-[52px]"); // lg
    expect(btn.className).toContain("w-full"); // block 기본 true
  });

  it("variant/size에 맞는 클래스를 적용한다", () => {
    render(
      <Button variant="secondary" size="md">
        보조
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "보조" });
    expect(btn.className).toContain("bg-tint"); // secondary
    expect(btn.className).toContain("h-[44px]"); // md
    expect(btn.className).not.toContain("h-[52px]");
  });

  it("ghost variant + block=false → w-full을 붙이지 않는다", () => {
    render(
      <Button variant="ghost" block={false}>
        고스트
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "고스트" });
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).not.toContain("w-full");
  });

  it("onClick 핸들러가 클릭 시 호출된다", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>탭</Button>);
    fireEvent.click(screen.getByRole("button", { name: "탭" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled면 클릭 이벤트가 발생하지 않고 속성이 반영된다", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        비활성
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "비활성" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("type 등 임의의 button 속성을 그대로 전달한다", () => {
    render(<Button type="submit">전송</Button>);
    expect(screen.getByRole("button", { name: "전송" })).toHaveAttribute("type", "submit");
  });
});

describe("Chip", () => {
  it("active=false(기본)는 비활성 스타일, 클릭 콜백을 전달한다", () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>전체</Chip>);
    const chip = screen.getByRole("button", { name: "전체" });
    expect(chip.className).toContain("bg-surface");
    expect(chip.className).not.toContain("bg-primary/8");
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("active=true면 솔리드 브랜드 레드로 채운다(디자인 시스템)", () => {
    render(<Chip active>선택됨</Chip>);
    const chip = screen.getByRole("button", { name: "선택됨" });
    expect(chip.className).toContain("border-primary");
    expect(chip.className).toContain("bg-primary");
    expect(chip.className).toContain("text-white");
    // 옛 흐린 8% 틴트가 아니어야 한다.
    expect(chip.className).not.toContain("bg-primary/8");
  });

  // a11y (M-013): 선택 상태를 aria-pressed로 노출
  it("aria-pressed가 active를 반영한다", () => {
    const { rerender } = render(<Chip active>문화</Chip>);
    expect(screen.getByRole("button", { name: "문화", pressed: true })).toBeInTheDocument();
    rerender(<Chip>문화</Chip>);
    expect(screen.getByRole("button", { name: "문화", pressed: false })).toBeInTheDocument();
  });
});

describe("Tag", () => {
  it("기본 tone은 brand", () => {
    render(<Tag>브랜드</Tag>);
    const el = screen.getByText("브랜드");
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toContain("bg-primary");
  });

  it("tone에 따라 배경 클래스가 달라진다", () => {
    const { rerender } = render(<Tag tone="mint">민트</Tag>);
    expect(screen.getByText("민트").className).toContain("bg-mint");

    // 베이지 폐기(2026-08-06) 후 muted 뱃지는 gray-100 — surface-alt는 호버 전용 톤이라
    // 흰 배경에서 면으로 안 읽힌다.
    rerender(<Tag tone="muted">뮤트</Tag>);
    expect(screen.getByText("뮤트").className).toContain("bg-gray-100");
  });
});

describe("Logo", () => {
  it("앱 아이콘 이미지 + '모퉁이' 워드마크를 렌더한다('Corner' 없음)", () => {
    render(<Logo />);
    const icon = screen.getByAltText("모퉁이");
    expect(icon).toBeInTheDocument();
    expect(screen.getByText("모퉁이")).toBeInTheDocument();
    expect(screen.queryByText(/Corner/)).not.toBeInTheDocument();
  });

  it("size prop을 아이콘 픽셀 크기로 반영한다", () => {
    render(<Logo size={40} />);
    expect(screen.getByAltText("모퉁이")).toHaveStyle({ width: "40px", height: "40px" });
  });
});

describe("MobileScreen / Safe 헬퍼", () => {
  it("MobileScreen이 children을 렌더하고 기본 tone(bg)을 적용한다", () => {
    render(
      <MobileScreen>
        <span>화면내용</span>
      </MobileScreen>,
    );
    const inner = screen.getByText("화면내용").parentElement as HTMLElement;
    expect(inner.className).toContain("bg-bg");
    expect(inner.className).not.toContain("bg-surface ");
  });

  it("tone=surface면 surface 배경을 적용한다", () => {
    render(
      <MobileScreen tone="surface">
        <span>서피스</span>
      </MobileScreen>,
    );
    const inner = screen.getByText("서피스").parentElement as HTMLElement;
    expect(inner.className).toContain("bg-surface");
  });

  it("SafeTop/SafeBottom은 shrink-0 스페이서 div를 렌더한다", () => {
    const { container } = render(
      <>
        <SafeTop />
        <SafeBottom />
      </>,
    );
    const divs = container.querySelectorAll("div.shrink-0");
    expect(divs).toHaveLength(2);
  });
});
