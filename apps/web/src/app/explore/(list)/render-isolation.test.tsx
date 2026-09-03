/**
 * 렌더 격리 회귀 테스트.
 *
 * 검색어 한 글자가 목록 전체를 다시 그리던 문제를 막는다. 예전엔 `query`가 페이지에 있고
 * 목록·그리드가 같은 컴포넌트 안에 인라인이라, 자모 하나마다 (모바일 행 + 데스크톱 카드)가
 * 전부 리렌더됐다 — md:hidden은 CSS라 **양쪽이 동시에 마운트**되므로 비용이 두 배였다.
 *
 * 여기서 세는 건 "카드가 몇 번 렌더됐나"다. 구현 방식(memo·컨텍스트·분할 무엇이든)이 아니라
 * 결과를 검증하므로, 나중에 구조를 바꿔도 이 테스트는 그대로 의미를 갖는다.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

vi.mock("@/hooks/useEnsureCatalog", () => ({
  useEnsureCatalog: () => catalogRef.current,
}));

/** scoreAll 실행 횟수 — 카탈로그 전량 재스코어링이 도는지 직접 센다. */
const scoreCalls = { n: 0 };
vi.mock("@motungi/core", async () => {
  const actual = await vi.importActual<typeof import("@motungi/core")>("@motungi/core");
  return {
    ...actual,
    scoreAll: (...args: Parameters<typeof actual.scoreAll>) => {
      scoreCalls.n++;
      return actual.scoreAll(...args);
    },
  };
});

const catalogRef: {
  current: { catalog: MockOpportunity[]; status: "idle" | "ok" | "empty" | "error" | "unconfigured" };
} = { current: { catalog: [], status: "ok" } };

/** 카드/행이 실제로 렌더된 횟수. memo가 걸리면 검색어를 쳐도 늘지 않는다. */
const renderCounts = { row: 0, card: 0 };

// 실제 카드 컴포넌트를 세는 버전으로 갈아끼운다. memo 여부는 원본을 그대로 감싸므로
// (아래 vi.importActual) 이 테스트가 memo를 대신 만들어주는 일은 없다.
vi.mock("@/components/explore-row", async () => {
  const actual = await vi.importActual<typeof import("@/components/explore-row")>(
    "@/components/explore-row",
  );
  const { memo } = await import("react");
  return {
    ExploreRow: memo((props: Parameters<typeof actual.ExploreRow>[0]) => {
      renderCounts.row++;
      return <actual.ExploreRow {...props} />;
    }),
  };
});

vi.mock("@/components/explore-card", async () => {
  const actual = await vi.importActual<typeof import("@/components/explore-card")>(
    "@/components/explore-card",
  );
  const { memo } = await import("react");
  return {
    ExploreCard: memo((props: Parameters<typeof actual.ExploreCard>[0]) => {
      renderCounts.card++;
      return <actual.ExploreCard {...props} />;
    }),
  };
});

import ExplorePage from "./page";

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

beforeEach(() => {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: [],
    user: null,
  });
  catalogRef.current = {
    catalog: [makePick("op-1", "망원동 전시"), makePick("op-2", "합정 재즈")],
    status: "ok",
  };
  renderCounts.row = 0;
  renderCounts.card = 0;
  scoreCalls.n = 0;
});

afterEach(() => cleanup());

describe("탐색 렌더 격리", () => {
  it("검색어를 쳐도 디바운스 전에는 목록이 다시 그려지지 않는다", () => {
    render(<ExplorePage />);
    const baseline = { ...renderCounts };
    expect(baseline.row + baseline.card).toBeGreaterThan(0); // 최초 렌더는 됐다

    // 모바일·데스크톱 두 입력 중 첫 번째에 5글자를 친다.
    const input = screen.getAllByLabelText("활동 좁히기")[0]!;
    for (const ch of ["망", "망원", "망원동", "망원동 ", "망원동 전"]) {
      fireEvent.change(input, { target: { value: ch } });
    }

    // 디바운스(150ms)가 끝나기 전이므로 목록의 입력은 하나도 바뀌지 않았다 →
    // 카드가 한 번도 다시 렌더되면 안 된다.
    expect(renderCounts.row).toBe(baseline.row);
    expect(renderCounts.card).toBe(baseline.card);
  });

  it("디바운스가 끝나 결과가 실제로 바뀌면 그때 목록이 갱신된다", async () => {
    vi.useFakeTimers();
    try {
      render(<ExplorePage />);
      const input = screen.getAllByLabelText("활동 좁히기")[0]!;
      fireEvent.change(input, { target: { value: "합정" } });

      const before = { ...renderCounts };
      await vi.advanceTimersByTimeAsync(200);

      // 목록이 2건 → 1건으로 좁혀졌으므로 렌더가 발생해야 한다.
      // (격리가 "영영 안 그림"이 되면 그건 버그다 — 여기서 그걸 막는다.)
      expect(renderCounts.row + renderCounts.card).toBeGreaterThan(before.row + before.card);
      expect(screen.queryAllByText("망원동 전시")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * `setAnchor`는 매번 새 anchors 객체를 만든다. 그 identity가 그대로 메모 의존성에 들어가면
   * **같은 동네를 다시 골라도** scored→source→haystacks→list 4단이 전부 다시 계산되고,
   * list는 두 virtualizer의 prop이라 탐색의 모든 memo가 한 번에 뚫린다.
   */
  it("같은 좌표로 앵커를 다시 세팅해도 카탈로그를 재스코어링하지 않는다", () => {
    const home = { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } };
    act(() => {
      // 진단 답변이 있어야 scoreAll 경로를 탄다(없으면 카탈로그 원본을 그대로 쓴다).
      useAppStore.setState({
        anchors: { home },
        answers: { interests: ["culture"], energy: "low", budget: "low" } as never,
      });
    });
    render(<ExplorePage />);
    const baseline = { ...renderCounts, score: scoreCalls.n };
    expect(baseline.score).toBeGreaterThan(0); // 최초 스코어링은 돌았다

    // 같은 좌표, 새 객체 — setAnchor가 실제로 하는 일 그대로.
    act(() => {
      useAppStore.setState({
        anchors: { home: { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } } },
      });
    });

    // 좌표가 그대로면 스코어링도 목록도 다시 돌 이유가 없다.
    expect(scoreCalls.n).toBe(baseline.score);
    expect(renderCounts.row).toBe(baseline.row);
    expect(renderCounts.card).toBe(baseline.card);
  });

  /**
   * 반대로 좌표가 실제로 달라지면 화면이 따라와야 한다 — 격리가 "영영 안 바뀜"이 되면 버그다.
   *
   * 목록 **내용**은 진단 전·마감임박순이라 좌표와 무관하게 같다. 그래서 카드 리렌더 수가
   * 안 늘어나는 게 오히려 정상이다(memo가 제대로 걸렸다는 증거). 좌표에 실제로 의존하는
   * 건 동네 라벨이므로 그쪽으로 "따라왔는지"를 본다.
   */
  it("좌표가 실제로 바뀌면 동네 표시가 따라 바뀐다", () => {
    act(() => {
      useAppStore.setState({
        anchors: { home: { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } } },
      });
    });
    render(<ExplorePage />);
    expect(screen.getAllByText(/망원동/).length).toBeGreaterThan(0);

    act(() => {
      useAppStore.setState({
        anchors: { home: { dongName: "역삼동", point: { lat: 37.5006, lng: 127.0364 } } },
      });
    });

    // 동네 라벨이 새 앵커를 반영한다("망원동"은 카드 제목에도 있어 라벨만 따로 보지 않는다).
    expect(screen.getAllByText(/역삼동/).length).toBeGreaterThan(0);
  });

  it("두 입력(모바일·데스크톱)은 같은 검색어를 보여준다", () => {
    render(<ExplorePage />);
    const inputs = screen.getAllByLabelText("활동 좁히기") as HTMLInputElement[];
    expect(inputs.length).toBe(2);

    fireEvent.change(inputs[0]!, { target: { value: "합정" } });

    // 한쪽에만 상태를 가두면 다른 쪽이 빈 채로 남는다 — 화면이 갈라진다.
    expect(inputs[1]!.value).toBe("합정");
  });
});
