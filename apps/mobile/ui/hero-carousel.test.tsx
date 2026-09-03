/**
 * HeroCarousel(RN) 카드 접근성 스모크(M-073).
 *
 * components.test.tsx의 Button 테스트 idiom(getByRole("button", { name })) 을 따른다 —
 * 카드 전체가 button role로 노출되고, 접근 가능한 이름에 활동 제목이 포함되는지만 본다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

vi.mock("expo-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { HeroCarousel } from "./hero-carousel";

function makeOpp(overrides: Partial<MockOpportunity> & { id: string; title: string }): MockOpportunity {
  return {
    source: "seoul_culture",
    category: "culture",
    summary: "요약 문구",
    categoryLabel: "문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 0,
    meta: [],
    tone: "brand",
    ...overrides,
  };
}

describe("HeroCarousel", () => {
  it("카드가 button role로 노출되고 접근 가능한 이름에 활동 제목이 포함된다(M-073)", () => {
    render(
      <HeroCarousel
        items={[makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /망원 한강 러닝 클래스/ }),
    ).toBeInTheDocument();
  });

  it("items가 비어있으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<HeroCarousel items={[]} />);
    expect(container.querySelector('[role="button"]')).toBeNull();
  });
});
