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

/**
 * "지금 열리는 활동" 포스터 열 섹션을 잡는다.
 * jsdom엔 WebGL이 없어 히어로 3D 링이 HeroCarousel로 폴백하므로, 같은 활동 제목이
 * 히어로에도 렌더된다 → 제목 단언은 반드시 이 섹션 안으로 좁혀야 한다.
 */
function posterSection(): HTMLElement {
  const heading = screen.getByText(/지금 이 순간에도/);
  const section = heading.closest("section");
  if (!section) throw new Error("포스터 열 섹션을 찾지 못했다");
  return section;
}

/**
 * 갈래(카테고리) 리스트를 잡는다.
 * 랜딩엔 <ul>이 여러 개(포스터 열 등) 있어 getByRole("list")는 첫 번째를 집어버린다 —
 * 갈래 라벨에서 <ul>을 거슬러 올라가 좁힌다.
 */
function categorySection(): HTMLElement {
  const first = screen.getByText("공연·연주");
  const list = first.closest("ul");
  if (!list) throw new Error("갈래 리스트를 찾지 못했다");
  return list;
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

  it("카테고리: 문화·여가 갈래 6종을 예시와 함께 렌더한다", () => {
    render(<WebLanding />);

    const categoryList = categorySection();

    // 라벨 — 실제 적재된 콘텐츠가 있는 갈래만. 지어낸 갈래를 광고하지 않는다.
    for (const label of [
      "공연·연주",
      "전시·예술",
      "연극·뮤지컬",
      "강좌·워크숍",
      "걷기 코스",
      "축제·영화",
    ]) {
      expect(within(categoryList).getByText(label)).toBeInTheDocument();
    }

    // 예시 카피는 opportunities에 실재하는 제목에서 온 것이어야 한다.
    expect(within(categoryList).getByText("정기연주회, 실내악, 오페라 워크숍")).toBeInTheDocument();
    expect(within(categoryList).getByText("서해랑길, DMZ 평화의 길")).toBeInTheDocument();

    // 리스트 항목은 정확히 6개
    expect(within(categoryList).getAllByRole("listitem")).toHaveLength(6);
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

  it("실데이터가 없으면 '지금 열리는 활동' 섹션을 아예 렌더하지 않는다", () => {
    // 빈 DB에서 가짜 활동을 지어내지 않는다 — 섹션 자체가 사라진다.
    render(<WebLanding />);
    expect(screen.queryByText(/지금 이 순간에도/)).not.toBeInTheDocument();
    // 카피 섹션(정적)은 그대로 남는다.
    expect(screen.getByText("하이퍼로컬")).toBeInTheDocument();
  });

  it("heroPicks(≥4)를 주면 실제 활동을 제목·상세링크와 함께 렌더한다", () => {
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

    // 실 활동 섹션이 뜨고, 실제 제목이 노출된다.
    // jsdom엔 WebGL이 없어 히어로 3D 링은 캐러셀로 폴백한다 → 같은 제목이 히어로에도 있다.
    // 그래서 포스터 열 섹션으로 범위를 좁혀 단언한다.
    const section = posterSection();
    expect(screen.getByText(/지금 이 순간에도/)).toBeInTheDocument();
    expect(within(section).getByText("안도 타다오 건축을 읽다")).toBeInTheDocument();

    // 카드는 우리 사이트 내부 활동 상세(/opportunity?id=…)로 연결된다.
    const link = within(section).getByText("안도 타다오 건축을 읽다").closest("a");
    expect(link).toHaveAttribute("href", "/opportunity?id=a");

    // 전체 보기는 탐색으로.
    expect(screen.getByRole("link", { name: /전체 보기/ })).toHaveAttribute("href", "/explore");
  });

  it("실데이터가 4개 미만이면 '지금 열리는 활동' 섹션을 숨긴다", () => {
    render(<WebLanding heroPicks={[makeItem({ id: "a" })]} />);
    expect(screen.queryByText(/지금 이 순간에도/)).not.toBeInTheDocument();
  });

  it("이미지 없는 활동은 포스터 열에서 제외된다(빈 카드 방지)", () => {
    const picks = [
      makeItem({ id: "a", title: "포스터 있는 공연" }),
      makeItem({ id: "b", title: "포스터 있는 전시" }),
      makeItem({ id: "c", title: "포스터 있는 강연" }),
      makeItem({ id: "d", title: "포스터 있는 연주회" }),
      makeItem({ id: "e", title: "포스터 없는 러닝크루", imageUrl: undefined }),
    ];
    render(<WebLanding heroPicks={picks} />);

    const section = posterSection();
    expect(within(section).getByText("포스터 있는 공연")).toBeInTheDocument();
    // 이미지 없는 활동은 어디에도(히어로 폴백 포함) 포스터 카드로 서지 않는다.
    expect(within(section).queryByText("포스터 없는 러닝크루")).not.toBeInTheDocument();
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
