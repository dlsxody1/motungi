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

/**
 * 관련 카드가 실제로 렌더된 횟수. memo가 걸리면 북마크를 눌러도 늘지 않는다.
 *
 * `thumbnail`은 **페이지 본체가 다시 렌더됐는지**의 대리 지표다. Thumbnail은 memo가 아니고
 * 모바일·데스크톱 트리 양쪽에 있어서, 페이지가 한 번 돌면 반드시 따라 돈다.
 * related만 세면 memo된 자식이 막아준 것만 보이고 **페이지 자신의 리렌더는 안 보인다**.
 */
const renderCounts = { related: 0, thumbnail: 0 };

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
  renderCounts.thumbnail = 0;
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
   * 저장 목록의 **순서만** 바뀌어도 페이지가 통째로 다시 렌더되던 회귀.
   *
   * 원인은 `s.savedIds`(배열) 통째 구독이었다. 배열은 내용이 같아도 참조가 바뀌면
   * 리렌더를 부른다. 실제로 쓰는 건 `.length`(사이드바 "N개")와
   * `includes(원픽id)`(저장 버튼) 둘뿐이고, 둘 다 원시값이라 값이 같으면 리렌더가 없다.
   *
   * 왜 "무관한 id 저장"이 아니라 "순서 바꾸기"로 재는가 — 무관한 id라도 저장하면
   * `.length`가 실제로 변하고 사이드바 숫자가 바뀌어야 하므로 그 리렌더는 정당하다.
   * 배열 구독이 낭비였다는 걸 보려면 **두 파생값이 모두 그대로인** 변화를 줘야 한다.
   *
   * 위의 related 테스트가 이걸 못 잡은 이유: related는 memo라 부모가 돌아도 자신은
   * 안 그려진다. memo 자식만 세면 페이지 자신이 헛도는 건 보이지 않는다.
   */
  it("저장 목록의 순서만 바뀌면 페이지는 다시 렌더되지 않는다", () => {
    useAppStore.setState({ savedIds: ["x", "y"] });
    render(<ReportPage />);
    const baseline = renderCounts.thumbnail;
    expect(baseline).toBeGreaterThan(0); // 최초 렌더는 됐다

    act(() => {
      // 길이도 같고 원픽 포함 여부도 그대로 — 화면에 보이는 값은 하나도 안 변한다.
      useAppStore.setState({ savedIds: ["y", "x"] });
    });

    // 참조가 실제로 바뀌었는지 먼저 확인 — 아무 일도 안 났으면 이 테스트는 무의미하다.
    expect(useAppStore.getState().savedIds).toEqual(["y", "x"]);
    expect(renderCounts.thumbnail).toBe(baseline);
  });

  /**
   * 반대 방향 — 저장 개수가 실제로 바뀌면 사이드바 숫자는 따라와야 한다.
   * 위 테스트만 있으면 "영영 안 그림"으로 만들어도 통과해버린다.
   */
  it("다른 활동을 저장하면 사이드바 개수는 갱신된다", () => {
    render(<ReportPage />);

    act(() => {
      useAppStore.getState().toggleSaved("완전히-다른-활동");
    });

    expect(screen.getAllByText("1개").length).toBeGreaterThan(0);
  });

  /**
   * 격리가 "영영 안 그림"이 되면 그것도 버그다 — 원픽을 저장하면 그 버튼은 실제로 바뀌어야 한다.
   */
  it("원픽을 저장하면 저장 버튼 상태는 실제로 바뀐다", () => {
    render(<ReportPage />);
    expect(screen.getAllByRole("button", { name: "저장하기" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "저장하기" })[0]!);

    expect(useAppStore.getState().savedIds).toContain("op-1");
    expect(screen.getAllByRole("button", { name: "저장 취소" }).length).toBeGreaterThan(0);
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
