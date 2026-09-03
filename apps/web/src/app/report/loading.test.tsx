/**
 * ReportLoading(라우트 loading.tsx) 스모크 테스트.
 *
 * 서버 컴포넌트라 스토어(동네 이름)에 접근하지 못하므로 ReportSkeleton의 기본값
 * ("우리 동네")을 그대로 쓴다 — 그 기본값이 실제로 화면에 나오는지, 그리고
 * report/page.tsx의 idle 분기와 같은 aria-busy 로딩 표기를 갖는지 확인한다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ReportLoading from "./loading";

afterEach(() => cleanup());

describe("ReportLoading", () => {
  it("dongName 기본값 '우리 동네' 로 렌더한다", () => {
    render(<ReportLoading />);
    expect(screen.getAllByText("우리 동네 기준").length).toBeGreaterThan(0);
  });

  it("모바일·데스크톱 두 분기 모두 aria-busy/aria-live 로딩 표기를 갖는다", () => {
    const { container } = render(<ReportLoading />);
    const busyRegions = container.querySelectorAll('[aria-busy="true"]');
    expect(busyRegions).toHaveLength(2);
    for (const region of busyRegions) {
      expect(region).toHaveAttribute("aria-live", "polite");
    }
    expect(screen.getAllByText("동네 리포트를 불러오는 중")).toHaveLength(2);
  });
});
