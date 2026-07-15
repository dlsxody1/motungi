/**
 * WebLanding(데스크탑 랜딩)이 "문화·여가 컨셉"으로 렌더되는지,
 * 그리고 옛 "부업·수익" 톤(월 수익/부수입/N만원 벌기 등)이 남아있지 않은지 검증한다.
 * next/navigation은 vitest.setup.ts에서 전역 mock되어 있고, next/link는 그대로 <a>로 렌더된다.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WebLanding } from "./web-landing";

describe("WebLanding", () => {
  // globals:false 환경이라 RTL 자동 cleanup이 등록되지 않는다 → 수동으로 DOM을 비운다.
  afterEach(() => {
    cleanup();
  });
  it("히어로: 여가 컨셉 헤드라인과 문화·여가 서브카피를 렌더한다", () => {
    render(<WebLanding />);

    const h1 = screen.getByRole("heading", { level: 1 });
    // <br/>로 쪼개진 헤드라인 — textContent로 합쳐서 확인
    expect(h1.textContent).toContain("퇴근하고");
    expect(h1.textContent).toContain("뭐하지");

    // 서브카피는 "문화·여가·활동"을 명시해야 한다(수익/부업이 아니라)
    expect(
      screen.getByText(/문화·여가·활동을 60초 만에 골라드려요/),
    ).toBeInTheDocument();

    // 하이퍼로컬 여가 큐레이션 배지
    expect(screen.getByText("하이퍼로컬 여가 큐레이션")).toBeInTheDocument();
  });

  it("카테고리: 문화·여가 갈래 5종을 예시와 함께 렌더한다", () => {
    render(<WebLanding />);

    const categoryList = screen
      .getByRole("list")
      // 카테고리 섹션의 <ul>만 대상으로 좁힌다
      ;

    // 라벨
    for (const label of [
      "문화·공연",
      "운동·산책",
      "먹거리·마켓",
      "클래스·배움",
      "퇴근후 부업",
    ]) {
      expect(within(categoryList).getByText(label)).toBeInTheDocument();
    }

    // 예시 카피(문화·여가 성격)
    expect(within(categoryList).getByText("한강 야간 재즈, 동네 소극장")).toBeInTheDocument();
    expect(within(categoryList).getByText("경의선숲길, 새벽 러닝 크루")).toBeInTheDocument();

    // 리스트 항목은 정확히 5개
    expect(within(categoryList).getAllByRole("listitem")).toHaveLength(5);
  });

  it("CTA: 위치 검색과 마무리 CTA가 모두 /location으로 연결된다", () => {
    render(<WebLanding />);

    const links = screen.getAllByRole("link");
    const locationLinks = links.filter((a) => a.getAttribute("href") === "/location");

    // 히어로 검색 인풋 + 마무리 CTA = 최소 2개
    expect(locationLinks.length).toBeGreaterThanOrEqual(2);

    // 마무리 CTA 라벨
    expect(
      screen.getByRole("link", { name: /내 동네에서 찾기/ }),
    ).toHaveAttribute("href", "/location");

    // 히어로 검색 버튼 라벨
    expect(screen.getByText("찾기")).toBeInTheDocument();
  });

  it("가격 표기는 여가 무료 톤 — 원픽 카드에 '무료'가 노출된다", () => {
    render(<WebLanding />);

    // 원픽/미니 카드에 '무료'가 여러 번 등장(여가·문화 활동 참가비)
    expect(screen.getAllByText("무료").length).toBeGreaterThan(0);

    // 참가비 라벨
    expect(screen.getByText("참가비")).toBeInTheDocument();
  });

  it("옛 '부업·수익' 톤(월 수익/부수입/N만원 벌기 등)이 남아있지 않다", () => {
    const { container } = render(<WebLanding />);
    const text = container.textContent ?? "";

    // 금전 수익형 카피가 없어야 한다
    expect(text).not.toMatch(/수익/);
    expect(text).not.toMatch(/부수입/);
    expect(text).not.toMatch(/만원/);
    expect(text).not.toMatch(/벌기|벌어|벌 수/);
    expect(text).not.toMatch(/월\s*\d/); // "월 30" 같은 수익 약속
  });
});
