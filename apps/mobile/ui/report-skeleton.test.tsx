/**
 * ReportSkeleton(RN) 렌더 스모크(M-088).
 *
 * explore-skeleton.test.tsx와 동일하게 testID→data-testid 매핑(react-native-web)으로
 * 존재만 확인한다 — 텍스트 없는 자리표시자라 getByText로는 검증할 수 없다.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportSkeleton } from "./report-skeleton";

describe("ReportSkeleton", () => {
  it("렌더하면 report-skeleton 한 개가 나온다", () => {
    const { container } = render(<ReportSkeleton dongName="망원동" />);

    expect(container.querySelectorAll('[data-testid="report-skeleton"]')).toHaveLength(1);
  });

  it("dongName 미지정 시 기본값으로도 렌더가 깨지지 않는다", () => {
    const { container } = render(<ReportSkeleton />);

    expect(container.querySelectorAll('[data-testid="report-skeleton"]')).toHaveLength(1);
  });
});
