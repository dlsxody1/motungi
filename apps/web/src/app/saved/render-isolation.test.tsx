/**
 * 보관함 렌더 격리 회귀 테스트.
 *
 * 막으려는 것: 이 화면의 주된 행동이 저장 취소인데, `savedIds`는 토글할 때마다
 * 스토어가 새 배열을 만든다. 예전엔 카드가 page 안에 인라인이라 **하나를 지울 때마다
 * 남은 카드가 전부** 다시 그려졌다. `md:hidden`은 CSS라 모바일·데스크톱 트리가
 * 둘 다 마운트돼 있어 그 비용이 두 배였다.
 *
 * 세는 건 "카드가 몇 번 렌더됐나"다 — 구현이 아니라 결과를 검증한다.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

// 보관함 항목은 이제 벌크 id 조회(.in)로 해소된다(M-064).
const fetchOpportunitiesByIds = vi.fn();
vi.mock("@/data/opportunities", () => ({
  fetchOpportunitiesByIds: (ids: string[]) => fetchOpportunitiesByIds(ids),
}));

/** 카드가 실제로 렌더된 횟수. memo가 걸리면 저장 취소를 눌러도 남은 카드는 늘지 않는다. */
const renderCounts = { card: 0 };

vi.mock("@/components/saved-card", async () => {
  const actual = await vi.importActual<typeof import("@/components/saved-card")>(
    "@/components/saved-card",
  );
  const { memo } = await import("react");
  return {
    SavedCard: memo((props: Parameters<typeof actual.SavedCard>[0]) => {
      renderCounts.card++;
      return <actual.SavedCard {...props} />;
    }),
  };
});

import SavedPage from "./page";

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
    matchScore: 0,
    meta: [],
    tone: "brand",
  } as MockOpportunity;
}

const PICKS = [
  makePick("op-1", "망원동 전시"),
  makePick("op-2", "합정 재즈"),
  makePick("op-3", "연남 마켓"),
];

beforeEach(() => {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: PICKS.map((p) => p.id),
    user: null,
  });
  fetchOpportunitiesByIds.mockImplementation(async (ids: string[]) => ({
    data: PICKS.filter((p) => ids.includes(p.id)),
    status: "ok" as const,
  }));
  renderCounts.card = 0;
});

afterEach(() => cleanup());

describe("보관함 렌더 격리", () => {
  it("한 카드를 저장 취소해도 남은 카드는 다시 그려지지 않는다", async () => {
    render(<SavedPage />);
    // 3건이 모두 해소될 때까지 기다린다(id 조회는 비동기).
    await waitFor(() =>
      expect(within(screen.getByTestId("saved-mobile")).getAllByRole("button", { name: "저장 취소" })).toHaveLength(3),
    );
    const baseline = renderCounts.card;

    const mobile = within(screen.getByTestId("saved-mobile"));
    fireEvent.click(mobile.getAllByRole("button", { name: "저장 취소" })[0]!);

    // 실제로 지워졌는지 먼저 확인 — 아무 일도 안 일어났으면 이 테스트는 무의미하다.
    expect(useAppStore.getState().savedIds).not.toContain("op-1");

    /**
     * 지워진 카드 하나는 언마운트되므로 렌더 수가 늘 이유가 없다.
     * 남은 2개가 다시 그려졌다면 그만큼 증가한다 — 그걸 막는 게 이 테스트다.
     * (모바일·데스크톱 두 트리라 회귀 시 +4가 된다.)
     */
    expect(renderCounts.card).toBe(baseline);
  });

  /** 격리가 "영영 안 그림"이 되면 그것도 버그다 — 목록이 실제로 줄어야 한다. */
  it("저장 취소한 카드는 화면에서 사라진다", async () => {
    render(<SavedPage />);
    await waitFor(() =>
      expect(within(screen.getByTestId("saved-mobile")).getAllByRole("button", { name: "저장 취소" })).toHaveLength(3),
    );

    const mobile = within(screen.getByTestId("saved-mobile"));
    fireEvent.click(mobile.getAllByRole("button", { name: "저장 취소" })[0]!);

    await waitFor(() =>
      expect(within(screen.getByTestId("saved-mobile")).getAllByRole("button", { name: "저장 취소" })).toHaveLength(2),
    );
    expect(screen.queryAllByText("망원동 전시")).toHaveLength(0);
  });
});
