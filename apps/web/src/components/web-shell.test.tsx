/**
 * web-shell 데스크탑 셸 테스트 — DesktopShell/TopNav/WebLogo/WebContainer의
 * 렌더 계약을 검증한다.
 *  - DesktopShell: children 본문 노출 + 헤더(네비)/푸터 구조, footer prop 토글
 *  - TopNav: 4개 네비 항목, variant(marketing/app)별 우측 액션, active 하이라이트,
 *            dongName/userName 파생값(동네 라벨·아바타 첫 글자) 엣지케이스
 * next/link는 jsdom에서 <a>로 렌더되고, next/navigation은 vitest.setup.ts에서 mock된다.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DesktopShell, TopNav, WebContainer, WebLogo } from "./web-shell";

// globals:false 설정이라 RTL 자동 cleanup 이 등록되지 않는다. 렌더 누적을 막기 위해 수동 정리.
afterEach(() => cleanup());

const NAV = [
  { label: "홈", href: "/" },
  { label: "탐색", href: "/explore" },
  { label: "동네 리포트", href: "/report" },
  { label: "보관함", href: "/saved" },
];

describe("WebLogo", () => {
  it("홈으로 가는 링크와 워드마크를 렌더한다", () => {
    render(<WebLogo />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
    expect(within(link).getByText("Corner")).toBeInTheDocument();
    expect(within(link).getByText(/모퉁이/)).toBeInTheDocument();
  });

  it("onDark 이면 워드마크가 흰색 텍스트 클래스를 갖는다", () => {
    render(<WebLogo onDark />);
    const wordmark = screen.getByText(/모퉁이/);
    expect(wordmark.className).toContain("text-white");
    expect(wordmark.className).not.toContain("text-ink-dark");
  });

  it("기본(onDark 미지정)이면 어두운 텍스트 클래스를 갖는다", () => {
    render(<WebLogo />);
    const wordmark = screen.getByText(/모퉁이/);
    expect(wordmark.className).toContain("text-ink-dark");
    expect(wordmark.className).not.toContain("text-white");
  });
});

describe("TopNav — 공통 네비", () => {
  it("4개 네비 항목을 각각의 라벨과 href로 렌더한다", () => {
    render(<TopNav />);
    const nav = screen.getByRole("navigation");
    for (const { label, href } of NAV) {
      const link = within(nav).getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("헤더(banner) 랜드마크와 nav 랜드마크를 렌더한다", () => {
    render(<TopNav />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("active 항목만 ink-dark, 나머지는 nav-link 색상을 갖는다", () => {
    render(<TopNav active="explore" />);
    const nav = screen.getByRole("navigation");
    for (const { label } of NAV) {
      const link = within(nav).getByRole("link", { name: label });
      if (label === "탐색") {
        expect(link.className).toContain("text-ink-dark");
        expect(link.className).not.toContain("text-nav-link");
      } else {
        expect(link.className).toContain("text-nav-link");
      }
    }
  });

  it("active 미지정이면 네비 항목 중 활성(ink-dark 단독)인 것이 없다", () => {
    render(<TopNav />);
    const nav = screen.getByRole("navigation");
    const navLinks = within(nav).getAllByRole("link");
    for (const link of navLinks) {
      expect(link.className).toContain("text-nav-link");
    }
  });
});

describe("TopNav — variant='app' (기본)", () => {
  it("동네 pill · 보관함 · 마이 액션을 렌더하고 마케팅 CTA는 없다", () => {
    render(<TopNav />);
    expect(screen.getByRole("link", { name: "동네 변경" })).toHaveAttribute("href", "/location");
    expect(screen.getByRole("link", { name: "마이" })).toHaveAttribute("href", "/my");
    // 보관함은 네비 항목(텍스트)과 우측 북마크 아이콘(aria-label) 두 곳에서 /saved 로 연결된다.
    const savedLinks = screen.getAllByRole("link", { name: "보관함" });
    expect(savedLinks).toHaveLength(2);
    for (const l of savedLinks) expect(l).toHaveAttribute("href", "/saved");
    // 우측 북마크 액션은 아이콘만(텍스트 없음) 렌더된다.
    const bookmark = savedLinks.find((l) => l.textContent === "");
    expect(bookmark).toBeDefined();
    expect(bookmark?.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("시작하기")).not.toBeInTheDocument();
    expect(screen.queryByText("로그인")).not.toBeInTheDocument();
  });

  it("dongName 이 있으면 pill 에 해당 동네명을, 없으면 '동네 설정' 을 표기한다", () => {
    const { unmount } = render(<TopNav dongName="망원동" />);
    expect(within(screen.getByRole("link", { name: "동네 변경" })).getByText("망원동")).toBeInTheDocument();
    unmount();

    render(<TopNav />);
    expect(within(screen.getByRole("link", { name: "동네 변경" })).getByText("동네 설정")).toBeInTheDocument();
  });

  it("userName 첫 글자를 아바타에 렌더하고, 없으면 '게'(게스트)로 폴백한다", () => {
    const { unmount } = render(<TopNav userName="철수" />);
    expect(within(screen.getByRole("link", { name: "마이" })).getByText("철")).toBeInTheDocument();
    unmount();

    render(<TopNav />);
    expect(within(screen.getByRole("link", { name: "마이" })).getByText("게")).toBeInTheDocument();
  });

  it("빈 문자열 userName 은 falsy 이므로 '게'로 폴백한다", () => {
    render(<TopNav userName="" />);
    expect(within(screen.getByRole("link", { name: "마이" })).getByText("게")).toBeInTheDocument();
  });
});

describe("TopNav — variant='marketing'", () => {
  it("검색 버튼 · 로그인 · 시작하기 CTA를 렌더하고 앱 액션은 없다", () => {
    render(<TopNav variant="marketing" />);
    expect(screen.getByRole("button", { name: "검색" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/report");
    expect(screen.getByRole("link", { name: "시작하기" })).toHaveAttribute("href", "/location");
    expect(screen.queryByRole("link", { name: "동네 변경" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "마이" })).not.toBeInTheDocument();
  });

  it("마케팅 variant 에서는 dongName 을 무시한다", () => {
    render(<TopNav variant="marketing" dongName="망원동" />);
    expect(screen.queryByText("망원동")).not.toBeInTheDocument();
  });
});

describe("DesktopShell", () => {
  it("children 을 main 본문에 렌더하고 헤더·푸터로 감싼다", () => {
    render(
      <DesktopShell>
        <p>본문 콘텐츠</p>
      </DesktopShell>,
    );
    const main = screen.getByRole("main");
    expect(within(main).getByText("본문 콘텐츠")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("footer=false 이면 푸터를 렌더하지 않는다", () => {
    render(
      <DesktopShell footer={false}>
        <p>본문</p>
      </DesktopShell>,
    );
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    // 헤더/본문은 그대로 유지
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("본문")).toBeInTheDocument();
  });

  it("active·variant·dongName·userName 을 TopNav 로 전달한다", () => {
    render(
      <DesktopShell active="report" dongName="합정동" userName="영희">
        <span>x</span>
      </DesktopShell>,
    );
    const nav = screen.getByRole("navigation");
    const reportLink = within(nav).getByRole("link", { name: "동네 리포트" });
    expect(reportLink.className).toContain("text-ink-dark");
    expect(within(screen.getByRole("link", { name: "동네 변경" })).getByText("합정동")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "마이" })).getByText("영")).toBeInTheDocument();
  });
});

describe("WebContainer", () => {
  it("children 을 렌더하고 max-w 컨테이너 + 추가 className 을 병합한다", () => {
    render(
      <WebContainer className="py-10">
        <p>안쪽</p>
      </WebContainer>,
    );
    const child = screen.getByText("안쪽");
    const container = child.parentElement as HTMLElement;
    expect(container.className).toContain("max-w-[1280px]");
    expect(container.className).toContain("mx-auto");
    expect(container.className).toContain("py-10");
  });

  it("className 미지정이어도 렌더된다", () => {
    render(
      <WebContainer>
        <p>기본</p>
      </WebContainer>,
    );
    expect(screen.getByText("기본")).toBeInTheDocument();
  });
});
