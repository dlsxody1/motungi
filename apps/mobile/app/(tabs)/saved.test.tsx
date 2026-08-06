/**
 * SavedScreen(B2 · 보관함) 렌더 스모크.
 *
 * explore.test.tsx와 같은 이유 — FlatList 전환(M-023) 이후 렌더 테스트가 0개였다.
 * savedIds를 카탈로그에서 해소해 행으로 렌더하는지와, 저장이 없을 때 빈 상태가
 * 나오는지만 본다. 카탈로그에 없는 저장 id는 fetchOpportunityById로 단건 조회해
 * 해소되는 분기(M-045)도 함께 고정한다 — 예전엔 여기서 조용히 빠졌다(버그).
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

const { pushMock, toggleSavedMock, fetchOpportunityByIdMock, state } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toggleSavedMock: vi.fn(),
  fetchOpportunityByIdMock: vi.fn(),
  state: {
    savedIds: [] as string[],
    toggleSaved: (() => {}) as (id: string) => void,
    catalog: [] as MockOpportunity[],
    anchors: {} as { home?: { dongName?: string } },
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: typeof state) => unknown) => selector(state),
}));

vi.mock("@/hooks/useEnsureCatalog", () => ({ useEnsureCatalog: vi.fn() }));

vi.mock("@/data/opportunities", async () => {
  const actual = await vi.importActual<typeof import("@/data/opportunities")>("@/data/opportunities");
  return { ...actual, fetchOpportunityById: fetchOpportunityByIdMock };
});

import SavedScreen from "./saved";

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
  toggleSavedMock.mockReset();
  fetchOpportunityByIdMock.mockReset();
  state.savedIds = [];
  state.toggleSaved = toggleSavedMock;
  state.catalog = [];
  state.anchors = {};
});

describe("SavedScreen", () => {
  it("저장 id가 카탈로그에서 해소되면 해당 행과 개수를 렌더한다", () => {
    state.anchors = { home: { dongName: "망원동" } };
    state.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시" }),
    ];
    state.savedIds = ["op-2"];

    render(<SavedScreen />);

    expect(screen.getByText("저장한 활동")).toBeInTheDocument();
    expect(screen.getByText("1개")).toBeInTheDocument();
    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();
    expect(screen.queryByText("망원 한강 러닝 클래스")).not.toBeInTheDocument();
    expect(screen.getByText("망원동 기준")).toBeInTheDocument();
  });

  it("카탈로그 창 밖의 저장 id는 단건 조회로 해소되어 렌더한다(M-045)", async () => {
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];
    state.savedIds = ["op-1", "창밖-id"];
    fetchOpportunityByIdMock.mockResolvedValueOnce({
      data: makeOpp({ id: "창밖-id", title: "합정 재즈 라이브" }),
      status: "ok",
    });

    render(<SavedScreen />);

    await waitFor(() => {
      expect(screen.getByText("2개")).toBeInTheDocument();
    });
    expect(fetchOpportunityByIdMock).toHaveBeenCalledWith("창밖-id");
    // catalog에 이미 있는 id는 재조회하지 않는다.
    expect(fetchOpportunityByIdMock).not.toHaveBeenCalledWith("op-1");
    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.getByText("합정 재즈 라이브")).toBeInTheDocument();
  });

  it("저장한 활동이 없으면 빈 상태 문구와 둘러보기 CTA를 렌더한다", () => {
    state.savedIds = [];

    render(<SavedScreen />);

    expect(screen.getByText("아직 저장한 활동이 없어요")).toBeInTheDocument();
    expect(screen.getByText("마음에 드는 활동의 북마크를 눌러 담아두세요.")).toBeInTheDocument();
    expect(screen.getByText("둘러보기")).toBeInTheDocument();
  });
});
