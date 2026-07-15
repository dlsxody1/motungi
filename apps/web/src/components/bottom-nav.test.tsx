/**
 * BottomNav 컴포넌트 테스트 — 4개 탭(홈·탐색·보관함·마이) 렌더와
 * `active` prop에 따른 활성 상태 표시(색상/굵기)를 검증한다.
 * next/link는 jsdom에서 <a>로 렌더되고, next/navigation은 vitest.setup.ts에서 mock된다.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BottomNav } from "./bottom-nav";

// vitest globals:false → 자동 cleanup이 등록되지 않으므로 수동으로 DOM을 비운다.
afterEach(cleanup);

const TABS = [
  { label: "홈", href: "/report" },
  { label: "탐색", href: "/explore" },
  { label: "보관함", href: "/saved" },
  { label: "마이", href: "/my" },
];

/** 라벨 텍스트로 해당 탭의 <a> 링크 엘리먼트를 찾는다. */
function linkForLabel(label: string): HTMLAnchorElement {
  const span = screen.getByText(label);
  const link = span.closest("a");
  if (!link) throw new Error(`link for label "${label}" not found`);
  return link as HTMLAnchorElement;
}

describe("BottomNav", () => {
  it("4개 탭을 각각의 라벨과 href로 렌더한다", () => {
    render(<BottomNav active="home" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);

    for (const { label, href } of TABS) {
      expect(linkForLabel(label)).toHaveAttribute("href", href);
    }
  });

  it("nav 랜드마크로 감싸져 있다", () => {
    render(<BottomNav active="explore" />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it.each([
    ["home" as const, "홈"],
    ["explore" as const, "탐색"],
    ["saved" as const, "보관함"],
    ["my" as const, "마이"],
  ])("active=%s 이면 해당 탭만 활성(primary/bold) 스타일을 갖는다", (active, activeLabel) => {
    render(<BottomNav active={active} />);

    for (const { label } of TABS) {
      const link = linkForLabel(label);
      const span = within(link).getByText(label);
      if (label === activeLabel) {
        expect(link.className).toContain("text-primary");
        expect(link.className).not.toContain("text-muted");
        expect(span.className).toContain("font-bold");
        expect(span.className).not.toContain("font-medium");
      } else {
        expect(link.className).toContain("text-muted");
        expect(link.className).not.toContain("text-primary");
        expect(span.className).toContain("font-medium");
        expect(span.className).not.toContain("font-bold");
      }
    }
  });

  it("정확히 하나의 탭만 활성화된다 (활성 링크는 단 1개)", () => {
    render(<BottomNav active="saved" />);

    const links = screen.getAllByRole("link");
    const activeLinks = links.filter((l) => l.className.includes("text-primary"));
    expect(activeLinks).toHaveLength(1);
    expect(within(activeLinks[0]!).getByText("보관함")).toBeInTheDocument();
  });

  it("각 탭은 아이콘(svg)과 텍스트 라벨을 함께 렌더한다", () => {
    const { container } = render(<BottomNav active="home" />);

    // 탭 4개 → svg 아이콘 4개
    expect(container.querySelectorAll("svg")).toHaveLength(4);

    for (const { label } of TABS) {
      const link = linkForLabel(label);
      expect(link.querySelector("svg")).not.toBeNull();
    }
  });
});
