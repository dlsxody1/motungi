/**
 * ExploreLoading(라우트 loading.tsx) 스모크 테스트.
 *
 * md:hidden은 CSS라 jsdom에선 모바일·데스크톱 두 분기가 동시에 DOM에 존재한다
 * (web-shell.test.tsx와 동일 전제). 여기서 확인하는 건 두 분기 모두
 * page.tsx의 isLoading 분기(explore/page.tsx)와 같은 a11y 표기
 * (aria-busy="true" + aria-live="polite" + sr-only 안내문)를 갖는지,
 * 그리고 스켈레톤 자리표시자가 실제로 깔리는지다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ExploreLoading from "./loading";

afterEach(() => cleanup());

describe("ExploreLoading", () => {
  it("모바일·데스크톱 두 분기 모두 aria-busy/aria-live 로딩 표기를 갖는다", () => {
    const { container } = render(<ExploreLoading />);
    const busyRegions = container.querySelectorAll('[aria-busy="true"]');
    expect(busyRegions).toHaveLength(2);
    for (const region of busyRegions) {
      expect(region).toHaveAttribute("aria-live", "polite");
    }
    // explore/page.tsx의 isLoading 분기와 동일한 스크린리더 안내문.
    expect(screen.getAllByText("활동을 불러오는 중")).toHaveLength(2);
  });

  it("스켈레톤 자리표시자를 렌더한다(빈 화면 플래시 방지)", () => {
    const { container } = render(<ExploreLoading />);
    // Skeleton 프리미티브는 aria-hidden + animate-pulse div로 렌더된다.
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("페이지 고유 헤더(검색·필터·타이틀) 크롬 없이 목록 자리만 렌더한다", () => {
    render(<ExploreLoading />);
    // 검색창·정렬 select·h1 타이틀은 page.tsx 고유 크롬이지 목록 자리표시자가
    // 대신할 몫이 아니다. (DesktopShell이 제공하는 사이트 공통 TopNav 링크는
    // 셸의 일부라 여기 검증 대상이 아니다.)
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "정렬" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
