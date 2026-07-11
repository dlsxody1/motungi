/**
 * ReportPage smoke test — 카탈로그가 비어 있을 때(ReportEmpty) 상태별 안내 문구를 렌더하는지 확인.
 * fetch 경로(useEnsureCatalog)는 스토어를 idle이 아닌 상태로 시딩해서 우회한다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import ReportPage from "./page";

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
});
