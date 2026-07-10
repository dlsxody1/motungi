/**
 * 리포트 페이지 — catalogStatus(ok/empty/error/unconfigured)별 실제 상태 UI 렌더 검증.
 * (useEnsureCatalog는 catalogStatus가 "idle"이 아니면 재조회하지 않으므로,
 *  fetchOpportunities/@/lib/supabase를 mock하지 않고 스토어 상태를 직접 세팅해 검증한다.)
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import ReportPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const INITIAL_STATE = {
  anchors: {},
  answers: null,
  results: [],
  catalog: [],
  catalogStatus: "idle" as const,
  savedIds: [],
  user: null,
};

function makeOpportunity(): MockOpportunity {
  return {
    id: "opp-1",
    source: "seoul_culture",
    category: "culture",
    title: "망원동 재즈 공연",
    summary: "동네 작은 무대에서 즐기는 재즈",
    costKrw: 0,
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 92,
    meta: [],
    tone: "brand",
  };
}

describe("ReportPage", () => {
  beforeEach(() => {
    useAppStore.setState(INITIAL_STATE);
  });

  it("ok: 카탈로그가 있으면 원픽 카드가 렌더된다", () => {
    useAppStore.setState({ catalog: [makeOpportunity()], catalogStatus: "ok" });

    render(<ReportPage />);

    expect(screen.getAllByText("망원동 재즈 공연").length).toBeGreaterThan(0);
    expect(screen.getAllByText("무료").length).toBeGreaterThan(0);
  });

  it("empty: 조회는 성공했지만 0건이면 '아직 추천할 활동이 없어요' 상태가 렌더된다", () => {
    useAppStore.setState({ catalog: [], catalogStatus: "empty" });

    render(<ReportPage />);

    expect(screen.getAllByText("아직 추천할 활동이 없어요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("60초 진단하기").length).toBeGreaterThan(0);
  });

  it("error: 조회 실패면 '활동을 불러오지 못했어요' 상태가 렌더된다", () => {
    useAppStore.setState({ catalog: [], catalogStatus: "error" });

    render(<ReportPage />);

    expect(screen.getAllByText("활동을 불러오지 못했어요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("다시 시도").length).toBeGreaterThan(0);
  });

  it("unconfigured: Supabase 미설정이면 에러와 동일한 실패 상태가 렌더된다(목업 폴백 없음)", () => {
    useAppStore.setState({ catalog: [], catalogStatus: "unconfigured" });

    render(<ReportPage />);

    expect(screen.getAllByText("활동을 불러오지 못했어요").length).toBeGreaterThan(0);
    expect(screen.getAllByText("다시 시도").length).toBeGreaterThan(0);
  });
});
