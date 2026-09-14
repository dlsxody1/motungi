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
const renderCounts = { map: 0, course: 0, thumbnail: 0, mobile: 0, desktop: 0 };

/**
 * 모바일·데스크톱 트리 각각의 렌더 횟수.
 *
 * 파일만 나누고 `memo`를 빼먹어도 화면은 똑같이 동작하므로 다른 테스트로는 잡히지 않는다.
 * 경계가 진짜 걸렸는지는 각 트리의 렌더 수를 직접 세는 수밖에 없다.
 *
 * ⚠️ 여기서 **counter를 memo로 감싸면 안 된다.** 그러면 실제 파일에 memo가 없어도
 * 이 래퍼가 대신 막아줘서 테스트가 통과해버린다(실제로 memo를 벗겨보고 확인했다).
 * 원본을 그대로 통과시켜 **파일 자신의 memo**가 유일한 경계가 되게 한다.
 */
vi.mock("@/components/opportunity-why", async () => {
  const actual = await vi.importActual<typeof import("@/components/opportunity-why")>(
    "@/components/opportunity-why",
  );
  const { createElement } = await import("react");
  return {
    // memo를 덧씌우지 않는다 — 원본 컴포넌트를 그대로 부르고 렌더 횟수만 센다.
    // 각 트리가 정확히 하나씩 들고 있어 "그 트리가 다시 그려졌나"의 대리 지표가 된다.
    OpportunityWhy: (props: Parameters<typeof actual.OpportunityWhy>[0]) => {
      if (props.variant === "mobile") renderCounts.mobile++;
      else renderCounts.desktop++;
      return createElement(actual.OpportunityWhy, props);
    },
  };
});

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
  renderCounts.mobile = 0;
  renderCounts.desktop = 0;
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

  /**
   * 두 트리를 파일로 나눈 것만으로는 아무것도 보장되지 않는다 — `memo`를 빼먹어도 화면은
   * 똑같이 동작한다. 경계가 진짜 걸렸는지 보려면 **한쪽 트리에만 영향이 있는 변화**를 줘야 한다.
   *
   * 지렛대는 `homeDong`이다(데스크톱 셸의 동네 표시에만 쓰이고 모바일 트리는 받지도 않는다).
   * 이 값이 바뀌면 데스크톱은 갱신돼야 하고 **모바일은 그대로여야** 한다.
   * memo가 없으면 부모가 다시 렌더될 때 모바일도 따라 돌아 이 단언이 깨진다.
   *
   * (저장 토글로는 이걸 측정할 수 없다 — `saved`가 실제로 바뀌어 양쪽 다 갱신되는 게
   *  정상이라 memo 유무와 무관하게 통과한다. 실제로 memo를 벗겨보고 확인했다.)
   */
  it("데스크톱에만 영향 있는 변화는 모바일 트리를 다시 그리지 않는다", async () => {
    render(<OpportunityDetail id="op-1" initial={PICK} />);
    await waitFor(() => expect(renderCounts.map).toBeGreaterThan(0));
    const before = { mobile: renderCounts.mobile, desktop: renderCounts.desktop };

    act(() => {
      useAppStore.setState({ anchors: { home: { dongName: "합정동" } } });
    });

    // 데스크톱은 새 dongName을 받아 갱신된다.
    expect(renderCounts.desktop).toBeGreaterThan(before.desktop);
    // 모바일은 homeDong을 쓰지도 않는다 — memo 경계가 여기서 막아야 한다.
    expect(renderCounts.mobile).toBe(before.mobile);
  });

  /**
   * 격리가 "영영 안 그림"이 되면 그것도 버그다 — 저장하면 버튼 상태는 실제로 바뀌어야 한다.
   * 위 렌더 수 단언만 있으면 자식을 통째로 얼려놔도 통과해버린다.
   */
  it("저장하면 두 트리의 버튼 상태가 실제로 바뀐다", async () => {
    render(<OpportunityDetail id="op-1" initial={PICK} />);
    await waitFor(() => expect(renderCounts.map).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole("button", { name: "저장하기" })[0]!);

    // 모바일은 aria-label이 "저장 취소"로, 데스크톱은 라벨이 "저장됨"으로 바뀐다.
    expect(screen.getAllByRole("button", { name: "저장 취소" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("저장됨").length).toBeGreaterThan(0);
  });
});
