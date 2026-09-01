/**
 * 상세 화면 핵심 표시 로직 테스트 (M-082).
 *
 * OpportunityDetail의 유일한 기존 테스트(opportunity-detail.render-isolation.test.tsx)는
 * 리렌더 횟수만 검증하고 deadline이 없는 fixture를 쓴다 — DdayPill·hasLink=false·
 * isWeekendOuting은 실행된 적이 없었다. 여기서 그 세 갈래를 직접 렌더해 검증한다.
 *
 * 시스템 시간을 고정한다 — DdayPill의 톤·텍스트는 deadline과 "오늘"의 상대 거리로
 * 갈린다. 고정하지 않으면 fixture의 dday가 테스트 실행 시각마다 달라진다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

// initial prop이 항상 우선(o = initial ?? fetched)이므로 훅 자체는 idle로 고정해도
// 무방하다 — render-isolation.test.tsx와 동일한 관례.
vi.mock("@/hooks/useOpportunity", () => ({
  useOpportunity: () => ({ opportunity: null, status: "idle" as const }),
}));
vi.mock("@/hooks/useTrailRoute", () => ({ useTrailRoute: () => null }));
vi.mock("@/components/venue-map", () => ({ VenueMap: () => null }));
vi.mock("@/components/course-guide", () => ({ CourseGuide: () => null }));

import { OpportunityDetail } from "./opportunity-detail";

const NOW = "2026-08-15T00:00:00Z";

function pick(overrides: Partial<MockOpportunity> = {}): MockOpportunity {
  return {
    id: "op-1",
    source: "seoul_culture",
    category: "culture",
    title: "망원동 정오 재즈 공연",
    summary: "망원동 · 소극장",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 88,
    meta: [],
    tone: "brand",
    location: { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } },
    ...overrides,
  } as unknown as MockOpportunity;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: [],
    user: null,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DdayPill 톤·텍스트", () => {
  it("지난 마감이면 '마감'을 표시한다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ deadline: "2026-08-10" })} />);
    // "마감"은 dt 라벨("마감")과 DdayPill(span) 둘 다에 쓰인다 — pill(span)만 골라낸다.
    const pills = screen.getAllByText("마감").filter((el) => el.tagName === "SPAN");
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0]).toHaveClass("bg-gray-100");
  });

  it("D-3 이내면 강조 톤으로 'D-N'을 표시한다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ deadline: "2026-08-17" })} />);
    const pills = screen.getAllByText("D-2");
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0]).toHaveClass("bg-primary");
  });

  it("여유 있는 마감이면 은은한 톤으로 'D-N'을 표시한다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ deadline: "2026-08-31" })} />);
    const pills = screen.getAllByText("D-16");
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0]).toHaveClass("bg-tint");
  });
});

describe("hasLink=false", () => {
  it("ctaUrl이 없으면 모바일·데스크탑 모두 '링크 준비 중'을 렌더한다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ ctaUrl: undefined })} />);
    expect(screen.getAllByText("링크 준비 중")).toHaveLength(2);
    expect(screen.queryByText("보러 가기")).not.toBeInTheDocument();
  });

  it("ctaUrl이 '#'이면 마찬가지로 '링크 준비 중'을 렌더한다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ ctaUrl: "#" })} />);
    expect(screen.getAllByText("링크 준비 중")).toHaveLength(2);
  });

  it("ctaUrl이 있으면 '보러 가기' 링크를 렌더한다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ ctaUrl: "https://example.com/event" })} />);
    expect(screen.getAllByText("보러 가기").length).toBeGreaterThan(0);
    expect(screen.queryByText("링크 준비 중")).not.toBeInTheDocument();
  });
});

describe("주말 나들이 배지", () => {
  it("isWeekendOuting=true(source=trail)면 배지가 렌더된다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ source: "trail" })} />);
    expect(screen.getAllByText("주말 나들이").length).toBeGreaterThan(0);
  });

  it("isWeekendOuting=false면 배지가 렌더되지 않는다", () => {
    render(<OpportunityDetail id="op-1" initial={pick({ source: "seoul_culture", durationMin: 60 })} />);
    expect(screen.queryByText("주말 나들이")).not.toBeInTheDocument();
  });
});
