/**
 * WebLanding(데스크탑 랜딩)이 "문화·여가 컨셉"으로 렌더되는지,
 * 그리고 옛 "부업·수익" 톤(월 수익/부수입/N만원 벌기 등)이 남아있지 않은지 검증한다.
 * next/navigation은 vitest.setup.ts에서 전역 mock되어 있고, next/link는 그대로 <a>로 렌더된다.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { WebLanding } from "./web-landing";

/** 캐러셀용 최소 MockOpportunity 팩토리(화면이 바인딩하는 필드만 채운다). */
function makeItem(over: Partial<MockOpportunity> & { id: string }): MockOpportunity {
  return {
    source: "seoul_culture",
    category: "culture",
    title: "동네 활동",
    summary: "요약",
    location: { dongName: "망원동" },
    imageUrl: "https://culture.seoul.go.kr/img.jpg",
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 0,
    meta: [],
    tone: "brand",
    ...over,
  } as MockOpportunity;
}

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

    // 하이퍼로컬 컨셉은 벤토 셀로 명시된다(히어로 사진 배지 대신)
    expect(screen.getByText("하이퍼로컬")).toBeInTheDocument();
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

  it("가격 표기는 여가 무료 톤 — 폴백 원픽 카드에 '무료'가 노출된다", () => {
    // props 없음 → 캐러셀 폴백(사진 목업). 참가비 무료 톤이 카드에 노출된다.
    render(<WebLanding />);
    expect(screen.getAllByText("무료").length).toBeGreaterThan(0);
  });

  it("heroPicks(≥4)를 주면 실 활동 캐러셀을 렌더한다(제목·링크)", () => {
    const picks = [
      makeItem({
        id: "a",
        title: "안도 타다오 건축을 읽다",
        location: { dongName: "종로구" },
        ctaUrl: "https://culture.seoul.go.kr/event/ando",
      }),
      makeItem({ id: "b", title: "현준희 바이올린 독주회", location: { dongName: "종로구" } }),
      makeItem({ id: "c", title: "모차르트 피아노 협주곡", location: { dongName: "서초구" } }),
      makeItem({ id: "d", title: "김민호 개인전", location: { dongName: "서대문구" } }),
    ];
    render(<WebLanding heroPicks={picks} />);

    // 캐러셀 헤더는 기준 동네(앵커 없으면 기본 망원동)를 명시한다.
    expect(screen.getAllByText("망원동").length).toBeGreaterThan(0);
    expect(screen.getByText(/열리는 활동|골라본 활동/)).toBeInTheDocument();
    // 실 제목이 카드에 노출.
    expect(screen.getByText("안도 타다오 건축을 읽다")).toBeInTheDocument();

    // 카드는 우리 사이트 내부 활동 상세(/opportunity?id=…)로 연결된다.
    const link = screen.getByText("안도 타다오 건축을 읽다").closest("a");
    expect(link).toHaveAttribute("href", "/opportunity?id=a");

    // 목업 폴백(한강 재즈)은 캐러셀이 뜨면 사라진다.
    expect(screen.queryByText(/망원 한강 야간 재즈/)).not.toBeInTheDocument();
  });

  it("heroPicks가 부족하면(<4) 기존 목업으로 폴백한다", () => {
    render(<WebLanding heroPicks={[makeItem({ id: "a" })]} />);
    // 캐러셀 헤더 없음, 사진 목업(한강 재즈) 유지
    expect(screen.queryByText(/열리는 활동|골라본 활동/)).not.toBeInTheDocument();
    expect(screen.getByText(/망원 한강 야간 재즈/)).toBeInTheDocument();
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
