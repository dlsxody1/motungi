/**
 * ReportPage smoke test — 카탈로그가 비어 있을 때(ReportEmpty) 상태별 안내 문구를 렌더하는지 확인.
 * fetch 경로(useEnsureCatalog)는 스토어를 idle이 아닌 상태로 시딩해서 우회한다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as navigation from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import ReportPage from "./page";

// vitest.config.ts 의 `globals: false` 로 인해 @testing-library/react 가
// 테스트마다 자동 cleanup 하지 않는다 — 클릭 기반 테스트가 이전 렌더의 잔여 DOM과
// 섞이지 않도록 파일 단위로 직접 등록(location/page.test.tsx와 동일 컨벤션).
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function seedEmpty(catalogStatus: "empty" | "error" | "unconfigured") {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog: [],
    catalogStatus,
    savedIds: [],
    user: null,
  });
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
