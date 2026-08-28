/**
 * ReportSkeleton 렌더 계약 — dongName prop 있음/없음 두 경우 모두 확인.
 * (M-042: report/loading.tsx가 prop 없이 쓸 수 있도록 dongName에 기본값을 준
 *  변경의 회귀 테스트.)
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReportSkeleton } from "./report-skeleton";

afterEach(() => cleanup());

describe("ReportSkeleton", () => {
  it("dongName을 명시하면 그 값을 기준 문구에 렌더한다", () => {
    render(<ReportSkeleton dongName="망원동" />);
    expect(screen.getAllByText("망원동 기준").length).toBeGreaterThan(0);
  });

  it("dongName을 생략하면 기본값 '우리 동네'로 렌더한다", () => {
    render(<ReportSkeleton />);
    expect(screen.getAllByText("우리 동네 기준").length).toBeGreaterThan(0);
  });

  it("모바일·데스크톱 두 분기 모두 aria-busy 로딩 표기를 갖는다", () => {
    const { container } = render(<ReportSkeleton />);
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2);
  });
});
