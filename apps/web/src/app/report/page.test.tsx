/**
 * ReportPage smoke test — 추천이 비어 있을 때(ReportEmpty) 상태별 안내 문구를 렌더하는지 확인.
 *
 * fallback 조회는 서버 상태라 useReportFallback(react-query)이 소유한다. 여기서 보려는 건
 * 조회가 아니라 **상태별 화면**이므로 훅을 통째로 목한다(조회 동작 검증은 훅 테스트 몫).
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as navigation from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

vi.mock("@/hooks/useReportFallback", () => ({
  useReportFallback: () => fallbackRef.current,
}));

/** seed가 채우는 fallback 뷰 — 목한 훅이 이걸 그대로 돌려준다. */
const fallbackRef: {
  current: { items: MockOpportunity[]; status: "idle" | "ok" | "empty" | "error" | "unconfigured" };
} = { current: { items: [], status: "idle" } };

import ReportPage from "./page";

// vitest.config.ts 의 `globals: false` 로 인해 @testing-library/react 가
// 테스트마다 자동 cleanup 하지 않는다 — 클릭 기반 테스트가 이전 렌더의 잔여 DOM과
// 섞이지 않도록 파일 단위로 직접 등록(location/page.test.tsx와 동일 컨벤션).
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function seedEmpty(status: "idle" | "empty" | "error" | "unconfigured") {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: [],
    user: null,
  });
  fallbackRef.current = { items: [], status };
}

const NOW = "2026-08-15T00:00:00Z";

function pick(overrides: Partial<MockOpportunity> = {}): MockOpportunity {
  return {
    id: "op-1",
    source: "seoul_culture",
    category: "culture",
    title: "망원동 정오 재즈 공연",
    summary: "망원동 · 소극장",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 88,
    meta: [],
    tone: "brand",
    ...overrides,
  } as unknown as MockOpportunity;
}

function seedOnePick(overrides: Partial<MockOpportunity> = {}) {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [pick(overrides)],
    savedIds: [],
    user: null,
  });
  fallbackRef.current = { items: [], status: "idle" };
}

function mockRouter() {
  const push = vi.fn();
  vi.spyOn(navigation, "useRouter").mockReturnValue({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof navigation.useRouter>);
  return push;
}

describe("ReportPage", () => {
  /**
   * idle(=fallback 조회 중)에 "아직 추천할 활동이 없어요"가 뜨던 버그의 회귀 테스트.
   * 없는 게 아니라 오는 중이므로, 원픽 자리를 스켈레톤으로 잡아둔다.
   */
  it("idle 상태(조회 중) → 빈 문구 대신 로딩을 알린다", () => {
    seedEmpty("idle");

    render(<ReportPage />);

    expect(screen.queryByText("아직 추천할 활동이 없어요")).toBeNull();
    expect(screen.getAllByText("동네 리포트를 불러오는 중").length).toBeGreaterThan(0);
  });

  it("empty 상태(진단 전/추천 없음) → 60초 진단 유도 문구를 렌더한다", () => {
    seedEmpty("empty");

    render(<ReportPage />);

    expect(screen.getAllByText("아직 추천할 활동이 없어요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("60초 진단하기").length).toBeGreaterThan(0);
  });

  it("error 상태(로드 실패) → 재시도 유도 문구를 렌더한다", () => {
    seedEmpty("error");

    render(<ReportPage />);

    expect(screen.getAllByText("활동을 불러오지 못했어요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("다시 시도").length).toBeGreaterThan(0);
  });

  it("error 상태 → 재시도 버튼을 누르면 /loading 으로 이동한다", async () => {
    const push = mockRouter();
    seedEmpty("error");

    const user = userEvent.setup();
    render(<ReportPage />);

    await user.click(screen.getAllByText("다시 시도")[0]!);

    expect(push).toHaveBeenCalledWith("/loading");
  });

  it("empty(미진단) 상태 → 재시도 버튼을 누르면 /diagnosis 로 이동한다", async () => {
    const push = mockRouter();
    seedEmpty("empty");

    const user = userEvent.setup();
    render(<ReportPage />);

    await user.click(screen.getAllByText("60초 진단하기")[0]!);

    expect(push).toHaveBeenCalledWith("/diagnosis");
  });
});

/**
 * 원픽 히어로의 마감 배지(M-081) — 로컬 formatDeadline(단일 중립 톤)을 core의
 * deadlineLabel+DdayPill(3톤: 지남/임박/여유)로 교체했다. opportunity-detail.test.tsx의
 * "DdayPill 톤·텍스트"와 동일 관례로 시스템 시간을 고정해 검증한다.
 * md:hidden은 CSS라 모바일·데스크톱 트리가 둘 다 마운트되므로 getAllByText로 받는다.
 */
describe("ReportPage — 원픽 마감 배지(DdayPill)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("지난 마감이면 '마감'을 은은한 톤으로 표시한다", () => {
    seedOnePick({ deadline: "2026-08-10" });

    render(<ReportPage />);

    const pills = screen.getAllByText("마감").filter((el) => el.tagName === "SPAN");
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0]).toHaveClass("bg-gray-100");
  });

  it("D-3 이내면 강조 톤으로 'D-N'을 표시한다", () => {
    seedOnePick({ deadline: "2026-08-17" });

    render(<ReportPage />);

    const pills = screen.getAllByText("D-2");
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0]).toHaveClass("bg-primary");
  });

  it("여유 있는 마감이면 은은한 톤으로 'D-N'을 표시한다", () => {
    seedOnePick({ deadline: "2026-08-31" });

    render(<ReportPage />);

    const pills = screen.getAllByText("D-16");
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0]).toHaveClass("bg-tint");
  });

  it("마감이 없으면 배지를 렌더하지 않는다(레이아웃 안 깨짐)", () => {
    seedOnePick({ deadline: undefined });

    render(<ReportPage />);

    expect(screen.queryByText(/^D-\d/)).not.toBeInTheDocument();
    expect(screen.queryAllByText("마감").filter((el) => el.tagName === "SPAN")).toHaveLength(0);
  });
});
