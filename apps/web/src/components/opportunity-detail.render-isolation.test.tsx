/**
 * 상세 페이지 렌더 격리 회귀 테스트.
 *
 * 막으려는 것: 상세는 `savedIds`를 구독한다 — 북마크를 한 번 누르면 페이지 전체가
 * 다시 렌더됐다. 지도(NAVER SDK)와 코스 안내는 저장 여부와 아무 상관이 없는데도
 * 매번 따라 그려졌고, `md:hidden`은 CSS라 두 트리에서 각각 돌았다.
 *
 * 지도는 렌더 비용을 넘어 **자원 문제**다 — 다시 만들면 maps.Map 인스턴스가 또 생긴다.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

vi.mock("@/hooks/useOpportunity", () => ({
  useOpportunity: () => ({ opportunity: null, status: "idle" as const }),
}));
// 걷기길이 아니면 요청하지 않지만, 훅 자체는 마운트되므로 고정값을 준다.
vi.mock("@/hooks/useTrailRoute", () => ({ useTrailRoute: () => null }));

/**
 * 지도·코스안내가 실제로 렌더된 횟수 + Thumbnail(부모 리렌더의 대리 지표).
 * Thumbnail은 memo가 아니라 부모가 돌면 반드시 같이 돈다.
 */
const renderCounts = { map: 0, course: 0, thumbnail: 0 };

vi.mock("@/components/thumbnail", async () => {
  const actual = await vi.importActual<typeof import("@/components/thumbnail")>(
    "@/components/thumbnail",
  );
  return {
    Thumbnail: (props: Parameters<typeof actual.Thumbnail>[0]) => {
      renderCounts.thumbnail++;
      return <actual.Thumbnail {...props} />;
    },
  };
});

vi.mock("@/components/venue-map", async () => {
  const actual = await vi.importActual<typeof import("@/components/venue-map")>(
    "@/components/venue-map",
  );
  const { memo } = await import("react");
  return {
    VenueMap: memo((props: Parameters<typeof actual.VenueMap>[0]) => {
      renderCounts.map++;
      return <actual.VenueMap {...props} />;
    }),
  };
});

vi.mock("@/components/course-guide", async () => {
  const actual = await vi.importActual<typeof import("@/components/course-guide")>(
    "@/components/course-guide",
  );
  const { memo } = await import("react");
  return {
    CourseGuide: memo((props: Parameters<typeof actual.CourseGuide>[0]) => {
      renderCounts.course++;
      return <actual.CourseGuide {...props} />;
    }),
  };
});

import { OpportunityDetail } from "./opportunity-detail";

const PICK = {
  id: "op-1",
  source: "trail",
  category: "active",
  title: "망원 한강 걷기길",
  summary: "망원동 · 한강공원",
  costKrw: 0,
  difficulty: 0.2,
  categoryLabel: "운동·산책",
  costLabel: "무료",
  costUnit: "1인",
  costHeading: "참가비",
  matchScore: 88,
  meta: [{ label: "난이도", value: "낮음" }],
  tone: "brand",
  location: { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } },
  courseStart: "망원한강공원 입구",
} as unknown as MockOpportunity;

beforeEach(() => {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: [],
    user: null,
  });
  renderCounts.map = 0;
  renderCounts.course = 0;
});

afterEach(() => cleanup());

describe("상세 렌더 격리", () => {
  it("북마크를 눌러도 지도와 코스 안내는 다시 그려지지 않는다", async () => {
    render(<OpportunityDetail id="op-1" initial={PICK} />);
    await waitFor(() => expect(renderCounts.map).toBeGreaterThan(0));
    const baseline = { ...renderCounts };

    // 저장 버튼은 모바일/데스크톱 두 트리에 있다 — 첫 번째를 누른다.
    fireEvent.click(screen.getAllByRole("button", { name: "저장하기" })[0]!);

    // 실제로 저장됐는지 먼저 확인 — 아무 일도 안 일어났으면 이 테스트는 무의미하다.
    expect(useAppStore.getState().savedIds).toContain("op-1");
    expect(renderCounts.map).toBe(baseline.map);
    expect(renderCounts.course).toBe(baseline.course);
  });

  /**
   * 다른 활동을 저장/취소해도 이 페이지는 **아예 리렌더되지 않아야** 한다.
   *
   * 자식 memo로는 이걸 못 잡는다 — 부모가 다시 렌더돼도 memo된 자식은 조용히 넘어가므로
   * 자식 렌더 수만 세면 통과해버린다(실제로 그렇게 새는 걸 놓칠 뻔했다).
   * 그래서 여기서는 **부모 자신의 렌더 횟수**를 센다. 이게 `savedIds` 배열 전체가 아니라
   * 이 활동의 boolean만 구독해야 하는 이유다.
   */
  it("다른 활동의 저장은 이 상세를 아예 리렌더하지 않는다", async () => {
    render(<OpportunityDetail id="op-1" initial={PICK} />);
    await waitFor(() => expect(renderCounts.map).toBeGreaterThan(0));
    // Thumbnail은 memo가 아니므로, 부모가 다시 렌더되면 반드시 같이 렌더된다 →
    // 부모 리렌더의 대리 지표로 쓴다(자식 memo 수만 세면 부모가 새는 걸 못 잡는다).
    const beforeThumb = renderCounts.thumbnail;

    act(() => {
      useAppStore.getState().toggleSaved("완전히-다른-활동");
    });

    // 이 활동의 저장 상태는 그대로다 → 구독 값이 안 바뀌었으므로 부모도 안 돈다.
    expect(useAppStore.getState().savedIds).not.toContain("op-1");
    expect(renderCounts.thumbnail).toBe(beforeThumb);
  });
});
