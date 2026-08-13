/**
 * OnboardingScreen(A1 · 홈/온보딩) 렌더 스모크(M-033).
 *
 * 웹(apps/web/src/app/page.tsx)은 실 활동을 히어로 캐러셀로 보여주는데 모바일은
 * 고정 마케팅 카피(TEASERS)만 노출했다 — fetchOpportunities로 실데이터를 가져와
 * 캐러셀로 렌더하되, 4건 미만이면 TEASERS 폴백을 유지하는지를 검증한다.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

const { pushMock, fetchOpportunitiesMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  fetchOpportunitiesMock: vi.fn(),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/data/opportunities", async () => {
  const actual = await vi.importActual<typeof import("@/data/opportunities")>("@/data/opportunities");
  return { ...actual, fetchOpportunities: fetchOpportunitiesMock };
});

import OnboardingScreen from "./index";

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
    imageUrl: "https://example.test/a.jpg",
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockReset();
  fetchOpportunitiesMock.mockReset();
});

describe("OnboardingScreen", () => {
  it("실 활동이 4건 이상이면 히어로 캐러셀을 렌더하고 TEASERS는 숨긴다", async () => {
    fetchOpportunitiesMock.mockResolvedValueOnce({
      data: [
        makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" }),
        makeOpp({ id: "op-2", title: "성수 팝업 전시" }),
        makeOpp({ id: "op-3", title: "연남 재즈 라이브" }),
        makeOpp({ id: "op-4", title: "합정 플리마켓" }),
      ],
      status: "ok",
    });

    render(<OnboardingScreen />);

    await waitFor(() => {
      expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    });
    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();
    expect(screen.queryByText("마찰 제로")).not.toBeInTheDocument();
  });

  it("실 활동이 4건 미만이면 TEASERS 폴백을 유지한다", async () => {
    fetchOpportunitiesMock.mockResolvedValueOnce({
      data: [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })],
      status: "ok",
    });

    render(<OnboardingScreen />);

    await waitFor(() => {
      expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("마찰 제로")).toBeInTheDocument();
    expect(screen.queryByText("망원 한강 러닝 클래스")).not.toBeInTheDocument();
  });

  it("조회 실패(error/unconfigured)면 TEASERS 폴백을 유지한다", async () => {
    fetchOpportunitiesMock.mockResolvedValueOnce({ data: [], status: "error" });

    render(<OnboardingScreen />);

    await waitFor(() => {
      expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("마찰 제로")).toBeInTheDocument();
  });

  it("기본 CTA는 항상 렌더된다", () => {
    fetchOpportunitiesMock.mockResolvedValueOnce({ data: [], status: "empty" });

    render(<OnboardingScreen />);

    expect(screen.getByText("내 동네에서 찾기")).toBeInTheDocument();
    expect(screen.getByText("동네 활동 둘러보기")).toBeInTheDocument();
  });

  it("첫 번째 CTA는 /location으로 이동한다", () => {
    fetchOpportunitiesMock.mockResolvedValueOnce({ data: [], status: "empty" });

    render(<OnboardingScreen />);

    fireEvent.click(screen.getByText("내 동네에서 찾기"));

    expect(pushMock).toHaveBeenCalledWith("/location");
  });

  it("두 번째 CTA(M-050)는 더 이상 죽은 /report로 가지 않고 /explore로 이동한다", () => {
    fetchOpportunitiesMock.mockResolvedValueOnce({ data: [], status: "empty" });

    render(<OnboardingScreen />);

    fireEvent.click(screen.getByText("동네 활동 둘러보기"));

    expect(pushMock).toHaveBeenCalledWith("/explore");
    expect(pushMock).not.toHaveBeenCalledWith("/report");
  });
});
