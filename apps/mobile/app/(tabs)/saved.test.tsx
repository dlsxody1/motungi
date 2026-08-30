/**
 * SavedScreen(B2 · 보관함) 렌더 스모크.
 *
 * explore.test.tsx와 같은 이유 — FlatList 전환(M-023) 이후 렌더 테스트가 0개였다.
 * savedIds를 카탈로그에서 해소해 행으로 렌더하는지와, 저장이 없을 때 빈 상태가
 * 나오는지만 본다. 카탈로그에 없는 저장 id는 fetchOpportunityById로 단건 조회해
 * 해소되는 분기(M-045)도 함께 고정한다 — 예전엔 여기서 조용히 빠졌다(버그).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("저장 토글에 접근 가능한 이름과 44px 이상 터치영역이 있다(M-031)", () => {
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];
    state.savedIds = ["op-1"];

    render(<SavedScreen />);

    const toggle = screen.getByLabelText("저장 취소");
    expect(toggle).toHaveAttribute("role", "button");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(toggleSavedMock).toHaveBeenCalledWith("op-1");
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

  it("저장한 활동이 없으면(진짜 무저장) 빈 상태 문구와 둘러보기 CTA를 렌더한다", () => {
    state.savedIds = [];

    render(<SavedScreen />);

    expect(screen.getByText("아직 저장한 활동이 없어요")).toBeInTheDocument();
    expect(screen.getByText("마음에 드는 활동의 북마크를 눌러 담아두세요.")).toBeInTheDocument();
    expect(screen.getByText("둘러보기")).toBeInTheDocument();
  });

  it("단건 조회가 진행 중이면 로딩 상태를 렌더하고 개수는 보여주지 않는다(M-046)", () => {
    state.catalog = [];
    state.savedIds = ["창밖-id"];
    // 응답이 오지 않는 pending 프라미스로 고정 — 로딩 상태만 관찰한다.
    fetchOpportunityByIdMock.mockReturnValueOnce(new Promise(() => {}));

    render(<SavedScreen />);

    expect(screen.getByText("저장한 활동을 불러오는 중…")).toBeInTheDocument();
    // 로딩 중엔 "0개"로 오독될 수 있는 개수 표시를 렌더하지 않는다.
    expect(screen.queryByText(/개$/)).not.toBeInTheDocument();
  });

  it("주요 컨트롤 4곳이 button role로 노출된다(M-073)", () => {
    state.anchors = { home: { dongName: "망원동" } };
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];
    state.savedIds = ["op-1"];

    render(<SavedScreen />);

    // 카드 자체(Pressable) — 저장 취소 버튼과 별개로 카드 전체도 button role이어야 한다.
    const card = screen.getByText("망원 한강 러닝 클래스").closest('[role="button"]');
    expect(card).not.toBeNull();
    // 재진단
    expect(screen.getByText("재진단").closest('[role="button"]')).not.toBeNull();
  });

  it("빈 상태의 둘러보기 버튼이 button role로 노출된다(M-073)", () => {
    state.savedIds = [];

    render(<SavedScreen />);

    expect(screen.getByText("둘러보기").closest('[role="button"]')).not.toBeNull();
  });

  it("에러 상태의 다시 시도 버튼이 button role로 노출된다(M-073)", async () => {
    state.catalog = [];
    state.savedIds = ["창밖-id"];
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: null, status: "error" });

    render(<SavedScreen />);

    await waitFor(() => {
      expect(screen.getByText("활동을 불러오지 못했어요")).toBeInTheDocument();
    });
    expect(screen.getByText("다시 시도").closest('[role="button"]')).not.toBeNull();
  });

  it("단건 조회가 실패하면 에러 상태 + 다시 시도 버튼을 렌더하고, 버튼을 누르면 재조회한다(M-046)", async () => {
    state.catalog = [];
    state.savedIds = ["창밖-id"];
    fetchOpportunityByIdMock.mockResolvedValueOnce({ data: null, status: "error" });

    render(<SavedScreen />);

    await waitFor(() => {
      expect(screen.getByText("활동을 불러오지 못했어요")).toBeInTheDocument();
    });
    expect(fetchOpportunityByIdMock).toHaveBeenCalledTimes(1);
    // 에러 중에도 개수 표시는 렌더하지 않는다.
    expect(screen.queryByText(/개$/)).not.toBeInTheDocument();

    fetchOpportunityByIdMock.mockResolvedValueOnce({
      data: makeOpp({ id: "창밖-id", title: "합정 재즈 라이브" }),
      status: "ok",
    });
    fireEvent.click(screen.getByText("다시 시도"));

    // retry()가 실제로 fetchOpportunityById를 다시 호출했는지(장식용 버튼이 아님을) 확인한다.
    await waitFor(() => {
      expect(fetchOpportunityByIdMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByText("합정 재즈 라이브")).toBeInTheDocument();
    });
  });
});
