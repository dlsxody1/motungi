/**
 * LoadingPage a11y + 라이브 리전 검증 (M-014).
 * Body가 모바일/데스크탑에 동시에 렌더되므로(CSS로만 토글) role="status" 요소가
 * 2개(모바일·데스크탑) 존재하는 게 정상이다 — 버그 아님.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
// vitest-axe 0.1.0 의 최상위 `matchers.d.ts` 는 `export type *` 로만 재노출해
// 값(함수)으로 import 할 수 없다(패키지 타입 선언 버그) — dist 경로에서 직접 가져온다.
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import type { CatalogResult } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import LoadingPage from "./page";

vi.mock("@/data/opportunities", () => ({
  fetchOpportunities: vi.fn(),
}));

// mock된 fetchOpportunities에 타입 있는 핸들을 확보한다.
import { fetchOpportunities } from "@/data/opportunities";
const mockedFetch = vi.mocked(fetchOpportunities);

expect.extend({ toHaveNoViolations });
// vitest.config.ts 의 `globals: false` 로 인해 @testing-library/react 가
// 테스트마다 자동 cleanup 하지 않는다 — 파일 단위로 직접 등록.
afterEach(() => cleanup());

/** 데이터 슬라이스를 통째로 덮어써 이전 테스트 잔여 상태를 제거한다. */
function seed() {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog: [],
    catalogStatus: "idle",
    savedIds: [],
    user: null,
  });
}

beforeEach(() => {
  mockedFetch.mockReset();
  seed();
});

describe("LoadingPage a11y (M-014)", () => {
  it("axe 위반이 없다", async () => {
    const result: CatalogResult = { data: [], status: "empty" };
    mockedFetch.mockResolvedValueOnce(result);

    const { container } = render(<LoadingPage />);
    const results = await axe(container);
    // @ts-expect-error vitest-axe 타입 선언 미스매치 — 런타임은 정상
    expect(results).toHaveNoViolations();
  });
});

describe("LoadingPage 라이브 리전 (M-014)", () => {
  it("모바일·데스크탑 두 트리 모두 role=status, aria-live=polite 를 노출한다", () => {
    mockedFetch.mockResolvedValueOnce({ data: [], status: "empty" });

    render(<LoadingPage />);

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(2);
    statuses.forEach((el) => {
      expect(el).toHaveAttribute("aria-live", "polite");
    });
  });
});
