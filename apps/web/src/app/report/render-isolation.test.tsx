/**
 * 리포트 렌더 격리 회귀 테스트.
 *
 * 막으려는 것: 리포트는 `savedIds`(쓰기 빈도가 가장 높은 슬라이스)를 구독한다.
 * 원픽 북마크를 한 번 누르면 페이지가 다시 렌더되는데, `md:hidden`은 CSS라
 * 모바일·데스크톱 트리가 **둘 다 마운트**돼 있어 아래 "함께 보면 좋아요" 카드가
 * 양쪽에서 전부 다시 그려졌다. 원픽을 저장하는 것과 관련 목록은 아무 상관이 없다.
 *
 * 세는 건 "관련 카드가 몇 번 렌더됐나"다 — 구현이 아니라 결과를 검증한다.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

vi.mock("@/hooks/useReportFallback", () => ({
  useReportFallback: () => ({ items: [], status: "ok" as const }),
}));

/** 관련 카드가 실제로 렌더된 횟수. memo가 걸리면 북마크를 눌러도 늘지 않는다. */
const renderCounts = { related: 0 };

vi.mock("@/components/report-related-card", async () => {
  const actual = await vi.importActual<typeof import("@/components/report-related-card")>(
    "@/components/report-related-card",
  );
  const { memo } = await import("react");
  return {
    ReportRelatedCard: memo((props: Parameters<typeof actual.ReportRelatedCard>[0]) => {
      renderCounts.related++;
      return <actual.ReportRelatedCard {...props} />;
    }),
  };
});

import ReportPage from "./page";

function makePick(id: string, title: string): MockOpportunity {
  return {
    id,
    source: "seoul_culture",
    category: "culture",
    title,
    summary: "요약",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 80,
    meta: [],
    tone: "brand",
  } as MockOpportunity;
}

beforeEach(() => {
  useAppStore.setState({
    anchors: {},
    answers: null,
    // 원픽 1 + 관련 3
    results: [
      makePick("op-1", "망원동 전시"),
      makePick("op-2", "합정 재즈"),
      makePick("op-3", "연남 마켓"),
      makePick("op-4", "성산 산책"),
    ],
    savedIds: [],
    user: null,
  });
  renderCounts.related = 0;
});

afterEach(() => cleanup());

describe("리포트 렌더 격리", () => {
  it("원픽 북마크를 눌러도 관련 카드는 다시 그려지지 않는다", () => {
    render(<ReportPage />);
    const baseline = renderCounts.related;
    expect(baseline).toBeGreaterThan(0); // 최초 렌더는 됐다

    fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

    // 저장 상태가 실제로 바뀌었는지 먼저 확인 — 아무 일도 안 일어났으면 이 테스트는 무의미하다.
    expect(useAppStore.getState().savedIds).toContain("op-1");
    // 그런데 관련 카드는 한 번도 다시 렌더되지 않아야 한다.
    expect(renderCounts.related).toBe(baseline);
  });

  /**
   * 격리가 "영영 안 그림"이 되면 그것도 버그다 — 데이터가 바뀌면 반드시 따라와야 한다.
   */
  it("추천 목록이 바뀌면 관련 카드는 갱신된다", () => {
    render(<ReportPage />);
    const before = renderCounts.related;

    // React 이벤트 밖의 setState라 act로 감싸야 렌더가 실제로 흘러간다.
    act(() => {
      useAppStore.setState({
        results: [makePick("op-1", "망원동 전시"), makePick("op-9", "새로 들어온 활동")],
      });
    });

    expect(renderCounts.related).toBeGreaterThan(before);
    expect(screen.getAllByText("새로 들어온 활동").length).toBeGreaterThan(0);
  });
});
