/**
 * ExploreScreen(B1 · 탐색) 렌더 스모크.
 *
 * FlatList 전환(M-023) 이후 이 화면엔 렌더 테스트가 하나도 없어 "typecheck가 통과한다"가
 * 곧 "화면이 뜬다"를 뜻하지 않는 상태였다. 목록이 실제로 행을 렌더하는지와, 데이터가
 * 없을 때 ListEmptyComponent가 상태별 문구로 갈리는지만 본다(인터랙션은 범위 밖).
 *
 * 목업 컨벤션은 report.test.tsx와 동일 — store는 가변 state + selector 흉내,
 * useEnsureCatalog는 자체 테스트가 있으므로 vi.fn()으로 완전히 우회한다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import type { UserAnchors } from "@motungi/core";

const { pushMock, state } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  state: {
    catalog: [] as MockOpportunity[],
    catalogStatus: "idle" as string,
    answers: null as unknown,
    anchors: {} as UserAnchors,
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock("@/hooks/useEnsureCatalog", () => ({ useEnsureCatalog: vi.fn() }));

import ExploreScreen from "./explore";

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

beforeEach(() => {
  pushMock.mockReset();
  state.catalog = [];
  state.catalogStatus = "idle";
  state.answers = null;
  state.anchors = {};
});

describe("ExploreScreen", () => {
  it("카탈로그가 있으면 헤더·검색·활동 행을 렌더한다", () => {
    state.catalogStatus = "ok";
    state.anchors = { home: { dongName: "망원동" } };
    state.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시" }),
    ];

    render(<ExploreScreen />);

    expect(screen.getByText("탐색")).toBeInTheDocument();
    expect(screen.getByText("망원동")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("활동·키워드 검색")).toBeInTheDocument();
    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();
  });

  it("카탈로그가 비어있고 catalogStatus가 error면 로드 실패 문구를 렌더한다", () => {
    state.catalogStatus = "error";

    render(<ExploreScreen />);

    expect(
      screen.getByText("활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
    ).toBeInTheDocument();
  });

  it("카탈로그가 비어있고 catalogStatus가 비에러면 '아직 등록된 활동이 없어요'를 렌더한다", () => {
    state.catalogStatus = "empty";

    render(<ExploreScreen />);

    expect(screen.getByText("아직 등록된 활동이 없어요. 곧 채워질 거예요.")).toBeInTheDocument();
  });

  it("지역 칩을 고르면 해당 구의 활동만 남는다(M-032)", () => {
    state.catalogStatus = "ok";
    state.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스", location: { dongName: "서울 마포구" } }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시", location: { dongName: "서울 성동구" } }),
    ];

    render(<ExploreScreen />);

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();

    fireEvent.click(screen.getByText("마포구 (1)"));

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.queryByText("성수 팝업 전시")).not.toBeInTheDocument();
  });

  it("낮음만 보기를 켜면 난이도 0.33 초과 활동이 숨는다(M-032)", () => {
    state.catalogStatus = "ok";
    state.catalog = [
      makeOpp({ id: "op-1", title: "가벼운 산책", difficulty: 0.2 }),
      makeOpp({ id: "op-2", title: "고강도 클라이밍", difficulty: 0.8 }),
    ];

    render(<ExploreScreen />);
    fireEvent.click(screen.getByText("낮음만 보기"));

    expect(screen.getByText("가벼운 산책")).toBeInTheDocument();
    expect(screen.queryByText("고강도 클라이밍")).not.toBeInTheDocument();
  });

  it("앵커가 없으면 거리순 칩이 비활성(disabled)이다(M-032)", () => {
    state.catalogStatus = "ok";
    state.anchors = {};
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];

    render(<ExploreScreen />);

    const distanceChip = screen.getByText("거리순").closest("button");
    expect(distanceChip).toBeDisabled();
  });

  it("imageUrl이 있는 활동은 썸네일 이미지를 렌더한다(M-051)", () => {
    state.catalogStatus = "ok";
    state.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스", imageUrl: "https://example.test/a.jpg" }),
    ];

    const { container } = render(<ExploreScreen />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.test/a.jpg");
  });

  it("imageUrl이 없는 활동은 이미지 태그 없이 플레이스홀더만 렌더한다(M-051)", () => {
    state.catalogStatus = "ok";
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];

    const { container } = render(<ExploreScreen />);

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("앵커가 있으면 거리순 정렬이 가까운 활동을 먼저 보여준다(M-032)", () => {
    state.catalogStatus = "ok";
    state.anchors = { home: { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } } };
    state.catalog = [
      makeOpp({
        id: "far",
        title: "먼 활동",
        location: { dongName: "판교동", point: { lat: 37.3948, lng: 127.1112 } },
      }),
      makeOpp({
        id: "near",
        title: "가까운 활동",
        location: { dongName: "합정동", point: { lat: 37.5495, lng: 126.9138 } },
      }),
    ];

    render(<ExploreScreen />);
    fireEvent.click(screen.getByText("거리순"));

    const titles = screen.getAllByText(/활동$/).map((el) => el.textContent);
    expect(titles.indexOf("가까운 활동")).toBeLessThan(titles.indexOf("먼 활동"));
  });
});
