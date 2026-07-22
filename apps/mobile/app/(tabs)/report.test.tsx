/**
 * ReportScreen(A5 · 동네 리포트) 렌더 스모크(M-017).
 *
 * store(`@/store/useAppStore`)는 useEnsureCatalog.test.ts와 동일한 가변 state 객체 +
 * selector 흉내 컨벤션으로 우회한다. useEnsureCatalog 훅 자체는 별도 테스트
 * (hooks/useEnsureCatalog.test.ts)로 이미 검증되므로 여기서는 vi.fn()으로 완전히 우회해
 * 이 화면이 results/catalog/catalogStatus에 따라 무엇을 렌더하는지만 본다.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

const { pushMock, replaceMock, state } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  state: {
    results: [] as MockOpportunity[],
    catalog: [] as MockOpportunity[],
    catalogStatus: "idle" as string,
    anchors: {} as { home?: { dongName?: string } },
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock("@/hooks/useEnsureCatalog", () => ({ useEnsureCatalog: vi.fn() }));

import ReportScreen from "./report";

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
  replaceMock.mockReset();
  state.results = [];
  state.catalog = [];
  state.catalogStatus = "idle";
  state.anchors = {};
});

describe("ReportScreen", () => {
  it("onePick이 있으면 히어로·CTA·재진단·관련 섹션을 렌더한다", () => {
    state.catalogStatus = "ok";
    state.results = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시" }),
      makeOpp({ id: "op-3", title: "연남 플리마켓" }),
    ];

    render(<ReportScreen />);

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.getByText("자세히 보기")).toBeInTheDocument();
    expect(screen.getByText("재진단")).toBeInTheDocument();
    // related.length === 2 (>=2) → "함께 보면 좋아요" 섹션 렌더.
    expect(screen.getByText("함께 보면 좋아요")).toBeInTheDocument();
    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();
    expect(screen.getByText("연남 플리마켓")).toBeInTheDocument();
  });

  it("결과가 비어있고 catalogStatus가 비에러 값이면 빈 상태 문구+60초 진단 CTA를 렌더한다", () => {
    state.catalogStatus = "empty";
    state.results = [];
    state.catalog = [];

    render(<ReportScreen />);

    expect(screen.getByText("아직 추천할 활동이 없어요")).toBeInTheDocument();
    expect(screen.getByText("60초 진단하기")).toBeInTheDocument();
  });

  it("catalogStatus가 error이면 에러 문구+다시 시도 CTA를 렌더한다", () => {
    state.catalogStatus = "error";
    state.results = [];
    state.catalog = [];

    render(<ReportScreen />);

    expect(screen.getByText("활동을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByText("다시 시도")).toBeInTheDocument();
  });
});
