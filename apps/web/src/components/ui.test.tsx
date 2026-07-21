/**
 * ui.tsx 공용 프리미티브 계약 검증.
 * 각 프리미티브가 핵심 props(preset/variant/size/disabled/onClick/active/tone 등)를
 * 실제 DOM(태그·클래스·이벤트)에 올바르게 반영하는지 RTL로 확인한다.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// globals:false 설정이라 자동 cleanup이 등록되지 않는다 → 렌더 누적 방지를 위해 수동 정리.
afterEach(() => cleanup());
import { Button, Card, Chip, InfoBox, Logo, MobileScreen, SafeBottom, SafeTop, Tag, Txt, text } from "./ui";

describe("Txt", () => {
  it("기본값: p 태그 + body1 프리셋 클래스를 적용한다", () => {
    render(<Txt>본문</Txt>);
    const el = screen.getByText("본문");
    expect(el.tagName).toBe("P");
    // body1 프리셋의 대표 클래스가 붙어야 한다
    expect(el.className).toContain("text-[15px]");
  });

  it("as로 태그를, preset으로 타이포 프리셋을 바꾼다", () => {
    render(
      <Txt as="h1" preset="heading1">
        제목
      </Txt>,
    );
    const el = screen.getByText("제목");
    expect(el.tagName).toBe("H1");
    expect(el.className).toContain(text.heading1.split(" ")[0]);
  });

  it("전달한 className을 프리셋 뒤에 병합한다", () => {
    render(
      <Txt className="text-primary custom-x">라벨</Txt>,
    );
    const el = screen.getByText("라벨");
    expect(el.className).toContain("custom-x");
    // 프리셋도 함께 유지된다
    expect(el.className).toContain("text-[15px]");
  });
});

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

describe("InfoBox", () => {
  it("흰 배경 + 통일 border/shadow, 아이콘·children을 렌더한다", () => {
    render(<InfoBox icon={<svg data-testid="ico" />}>안내 문구</InfoBox>);
    const text = screen.getByText("안내 문구");
    // 박스 자체(children의 부모의 부모)가 흰 배경·border·shadow-card를 갖는다.
    const box = text.parentElement!;
    expect(box.className).toContain("bg-surface");
    expect(box.className).toContain("border-line-alt");
    expect(box.className).toContain("shadow-card");
    // 핑크 틴트 배경이 아니어야 한다(요청 4).
    expect(box.className).not.toContain("bg-tint");
    expect(screen.getByTestId("ico")).toBeInTheDocument();
  });

  it("icon 없이도 children만 렌더한다", () => {
    render(<InfoBox>내용만</InfoBox>);
    expect(screen.getByText("내용만")).toBeInTheDocument();
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

    rerender(<Tag tone="muted">뮤트</Tag>);
    expect(screen.getByText("뮤트").className).toContain("bg-surface-alt");
  });
});

describe("Card", () => {
  it("children을 감싸고 기본 카드 클래스를 유지하며 className을 병합한다", () => {
    render(
      <Card className="p-4 extra-card">
        <span>내용</span>
      </Card>,
    );
    const child = screen.getByText("내용");
    const card = child.parentElement as HTMLElement;
    expect(card.className).toContain("shadow-card");
    expect(card.className).toContain("extra-card");
  });
});

describe("Logo", () => {
  it("모/모퉁이 텍스트를 렌더한다", () => {
    render(<Logo />);
    expect(screen.getByText("모")).toBeInTheDocument();
    expect(screen.getByText(/모퉁이/)).toBeInTheDocument();
  });

  it("size prop을 아이콘 인라인 스타일 픽셀로 반영한다", () => {
    render(<Logo size={40} />);
    const mark = screen.getByText("모");
    expect(mark).toHaveStyle({ width: "40px", height: "40px" });
  });

  it("onDark=true면 아이콘 배경색이 반전된다", () => {
    render(<Logo onDark />);
    // onDark일 때 아이콘 배경은 흰색
    expect(screen.getByText("모")).toHaveStyle({ background: "#ffffff" });
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
