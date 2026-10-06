/** NeighborhoodMenu 시트 — 현재 선택 동네가 선택 상태(aria-selected)로 노출되는지(M-128). */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { POPULAR_NEIGHBORHOODS } from "@/data/opportunities";

const { state } = vi.hoisted(() => ({
  state: { anchors: {} as { home?: { dongName: string } } },
}));

vi.mock("expo-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: unknown) => unknown) => selector({ ...state, setAnchor: vi.fn() }),
}));

import { NeighborhoodMenu } from "./neighborhood-menu";

describe("NeighborhoodMenu a11y(M-128)", () => {
  it("현재 동네 행만 selected 상태이고 모든 행은 button 역할이다", () => {
    const current = POPULAR_NEIGHBORHOODS[0]!;
    state.anchors = { home: { dongName: current.dongName } };
    render(<NeighborhoodMenu dongLabel={current.dongName} />);
    fireEvent.click(screen.getByLabelText("동네 변경"));

    const rows = POPULAR_NEIGHBORHOODS.map((n) =>
      screen.getAllByRole("button").find((b) => b.textContent?.includes(n.dongName) && b.textContent.includes(n.region ?? "")),
    );
    expect(rows.every(Boolean)).toBe(true);
    expect(rows[0]).toHaveAttribute("aria-selected", "true");
    expect(rows.slice(1).every((r) => r?.getAttribute("aria-selected") !== "true")).toBe(true);
  });
});
