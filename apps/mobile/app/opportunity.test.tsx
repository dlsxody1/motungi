/**
 * OpportunityScreen(A6 · 기회 상세) 렌더 스모크(M-025).
 *
 * 목업 컨벤션은 report.test.tsx/explore.test.tsx와 동일 — store는 가변 state + selector
 * 흉내, useEnsureCatalog는 자체 테스트가 있으므로 vi.fn()으로 완전히 우회한다.
 * `@/hooks/useOpportunity`도 자체 테스트(hooks/useOpportunity.test.ts)가 있으므로 여기서는
 * store의 catalog에서 직접 찾는 실제 로직 없이 훅 반환값을 state로 완전히 목업한다 —
 * 단, 회귀 케이스(불일치 id → catalog[0] 폴백)는 이 화면이 훅의 status를 실제로
 * 존중해서 그리는지가 핵심이므로, useOpportunity 자체를 얇게 흉내내되 카탈로그 find
 * 로직도 그대로 재현해 검증한다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { Share as RNShare } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

const { pushMock, replaceMock, backMock, toggleSavedMock, state, searchParamsState } = vi.hoisted(
  () => ({
    pushMock: vi.fn(),
    replaceMock: vi.fn(),
    backMock: vi.fn(),
    toggleSavedMock: vi.fn(),
    state: {
      savedIds: [] as string[],
      answers: null as unknown,
      user: null as unknown,
    },
    searchParamsState: { id: undefined as string | undefined },
  }),
);

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, back: backMock }),
  useLocalSearchParams: () => ({ id: searchParamsState.id }),
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: typeof state & { toggleSaved: typeof toggleSavedMock }) => unknown) =>
    selector({ ...state, toggleSaved: toggleSavedMock }),
}));

vi.mock("@/hooks/useEnsureCatalog", () => ({ useEnsureCatalog: vi.fn() }));

/**
 * useOpportunity는 자체 테스트가 있으므로 여기선 "카탈로그 캐시 우선" 계약만 얇게
 * 재현한다 — catalog에서 id로 찾고, 없으면(그리고 id가 있으면) 화면이 회귀 버그처럼
 * catalog[0]으로 폴백하지 않는지를 검증하는 게 이 테스트의 핵심이다.
 */
const { useOpportunityState } = vi.hoisted(() => ({
  useOpportunityState: {
    catalog: [] as MockOpportunity[],
    status: "idle" as "idle" | "loading" | "ok" | "empty" | "error" | "unconfigured",
  },
}));

vi.mock("@/hooks/useOpportunity", () => ({
  useOpportunity: (id: string | null) => {
    if (useOpportunityState.status === "loading" || useOpportunityState.status === "idle") {
      if (!id) return { opportunity: null, status: "empty" };
      const cached = useOpportunityState.catalog.find((x) => x.id === id) ?? null;
      if (cached) return { opportunity: cached, status: "ok" };
      return { opportunity: null, status: useOpportunityState.status };
    }
    const cached = id ? useOpportunityState.catalog.find((x) => x.id === id) ?? null : null;
    return { opportunity: cached, status: cached ? "ok" : useOpportunityState.status };
  },
}));

import OpportunityScreen from "./opportunity";

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
  backMock.mockReset();
  toggleSavedMock.mockReset();
  state.savedIds = [];
  state.answers = null;
  state.user = null;
  searchParamsState.id = undefined;
  useOpportunityState.catalog = [];
  useOpportunityState.status = "idle";
});

describe("OpportunityScreen", () => {
  it("캐시된 항목이 있으면 해당 활동의 제목을 렌더한다", () => {
    useOpportunityState.status = "ok";
    useOpportunityState.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시" }),
    ];
    searchParamsState.id = "op-2";

    render(<OpportunityScreen />);

    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();
  });

  it("[회귀] 카탈로그에 없는 id를 요청하면 not-found를 렌더하고 catalog[0]으로 폴백하지 않는다", () => {
    useOpportunityState.status = "empty";
    useOpportunityState.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시" }),
    ];
    searchParamsState.id = "nope";

    render(<OpportunityScreen />);

    expect(screen.getByText("활동을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByText("망원 한강 러닝 클래스")).not.toBeInTheDocument();
  });

  it("not-found 화면의 액션 버튼은 /explore로 이동한다", () => {
    useOpportunityState.status = "empty";
    searchParamsState.id = "nope";

    render(<OpportunityScreen />);

    fireEvent.click(screen.getByText("탐색 둘러보기"));

    expect(replaceMock).toHaveBeenCalledWith("/explore");
  });

  it("id 파라미터가 없으면 not-found/empty 경로를 탄다", () => {
    useOpportunityState.status = "empty";
    searchParamsState.id = undefined;

    render(<OpportunityScreen />);

    expect(screen.getByText("활동을 찾을 수 없어요")).toBeInTheDocument();
  });

  it("loading 상태면 로딩 인디케이터를 렌더한다", () => {
    useOpportunityState.status = "loading";
    searchParamsState.id = "op-9";

    render(<OpportunityScreen />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("활동을 찾을 수 없어요")).not.toBeInTheDocument();
  });

  it("imageUrl이 있으면 상세 배너에 썸네일 이미지를 렌더한다(M-051)", () => {
    useOpportunityState.status = "ok";
    useOpportunityState.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스", imageUrl: "https://example.test/a.jpg" }),
    ];
    searchParamsState.id = "op-1";

    const { container } = render(<OpportunityScreen />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.test/a.jpg");
  });

  it("imageUrl이 없으면 이미지 태그 없이 플레이스홀더 배너만 렌더한다(M-051)", () => {
    useOpportunityState.status = "ok";
    useOpportunityState.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];
    searchParamsState.id = "op-1";

    const { container } = render(<OpportunityScreen />);

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("공유하면 딥링크 URL이 포함된 메시지로 공유한다", () => {
    const shareSpy = vi.spyOn(RNShare, "share").mockResolvedValue({ action: "sharedAction" });
    useOpportunityState.status = "ok";
    useOpportunityState.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];
    searchParamsState.id = "op-1";

    render(<OpportunityScreen />);
    fireEvent.click(screen.getByLabelText("공유"));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    const arg = shareSpy.mock.calls[0][0] as { message: string };
    expect(arg.message).toContain("망원 한강 러닝 클래스");
    expect(arg.message).toContain("/opportunity?id=op-1");
  });

  it("북마크 토글에 저장 상태를 반영하는 접근 가능한 이름이 있다(M-031)", () => {
    useOpportunityState.status = "ok";
    useOpportunityState.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];
    searchParamsState.id = "op-1";
    state.savedIds = [];

    render(<OpportunityScreen />);

    const bookmark = screen.getByLabelText("저장하기");
    expect(bookmark).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(bookmark);
    expect(toggleSavedMock).toHaveBeenCalledWith("op-1");
  });

  it("공유가 실패해도(rejected) 에러를 던지지 않는다", async () => {
    const shareSpy = vi.spyOn(RNShare, "share").mockRejectedValue(new Error("cancelled"));
    useOpportunityState.status = "ok";
    useOpportunityState.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];
    searchParamsState.id = "op-1";

    render(<OpportunityScreen />);

    expect(() => fireEvent.click(screen.getByLabelText("공유"))).not.toThrow();
    expect(shareSpy).toHaveBeenCalledTimes(1);
    // 마이크로태스크 flush — .catch(() => {})가 실제로 rejection을 삼키는지 확인.
    await Promise.resolve();
    await Promise.resolve();
  });
});
