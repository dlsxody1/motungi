/**
 * LocationSearchDropdown — 시맨틱·안내 계약 (M-129).
 * listbox/option(안에 button) ARIA 오용을 버리고 버튼 목록으로, 상태는 live region으로 알린다.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
// vitest-axe 0.1.0 최상위 matchers는 타입 전용 재노출 — dist에서 직접 가져온다(loading/page.test.tsx 참조).
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import type { NeighborhoodSearchResult } from "@motungi/core";
import { LocationSearchDropdown } from "./location-search-dropdown";

expect.extend({ toHaveNoViolations });
afterEach(() => cleanup());

const results: NeighborhoodSearchResult[] = [
  { admCode: "1144010100", dongName: "공덕동", sigungu: "마포구", lat: 37.54, lng: 126.95 },
  { admCode: "1144010200", dongName: "아현동", sigungu: "마포구", lat: 37.55, lng: 126.96 },
] as NeighborhoodSearchResult[];

describe("LocationSearchDropdown (M-129)", () => {
  it("결과를 listbox/option이 아닌 버튼 목록으로 렌더하고 axe 위반이 없다", async () => {
    const { container } = render(
      <LocationSearchDropdown searching={false} results={results} onChoose={vi.fn()} />,
    );
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("list", { name: "동네 검색 결과" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    // @ts-expect-error vitest-axe 타입 선언 미스매치 — 런타임은 정상
    expect(await axe(container)).toHaveNoViolations();
  });

  it("결과 수를 role=status live region으로 알린다", () => {
    render(<LocationSearchDropdown searching={false} results={results} onChoose={vi.fn()} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("동네 검색 결과 2건");
  });

  it("'검색 중'과 '결과 없음'도 role=status로 알린다", () => {
    const { rerender } = render(
      <LocationSearchDropdown searching={true} results={[]} onChoose={vi.fn()} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("검색 중");
    rerender(<LocationSearchDropdown searching={false} results={[]} onChoose={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("검색 결과가 없어요");
  });

  it("버튼을 누르면 onChoose(pick, 'search')를 부른다", () => {
    const onChoose = vi.fn();
    render(<LocationSearchDropdown searching={false} results={results} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole("button", { name: /공덕동/ }));
    expect(onChoose).toHaveBeenCalledWith(
      expect.objectContaining({ admCode: "1144010100", dongName: "공덕동", region: "마포구" }),
      "search",
    );
  });
});
