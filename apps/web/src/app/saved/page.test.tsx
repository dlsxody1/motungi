/**
 * SavedPage a11y + 인터랙션 검증 (M-014).
 * 카드가 outer <button> 안에 nested interactive(북마크 토글)를 두던 구조를
 * "상세 보기" 버튼 + "저장 취소" 버튼, 두 개의 형제 버튼으로 바꿨는지 검증한다.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as navigation from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
// vitest-axe 0.1.0 의 최상위 `matchers.d.ts` 는 `export type *` 로만 재노출해
// 값(함수)으로 import 할 수 없다(패키지 타입 선언 버그) — dist 경로에서 직접 가져온다.
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import SavedPage from "./page";

expect.extend({ toHaveNoViolations });
// vitest.config.ts 의 `globals: false` 로 인해 @testing-library/react 가
// 테스트마다 자동 cleanup 하지 않는다 — 파일 단위로 직접 등록.
afterEach(() => cleanup());

const PICK: MockOpportunity = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  title: "망원동 동네 전시",
  summary: "망원동 갤러리에서 열리는 소규모 전시",
  costKrw: 0,
  difficulty: 0.2,
  categoryLabel: "동네 문화·공연",
  costLabel: "무료",
  costUnit: "1인",
  costHeading: "참가비",
  matchScore: 92,
  meta: [],
  tone: "brand",
};

/** 데이터 슬라이스를 통째로 덮어써 이전 테스트 잔여 상태를 제거한다. */
function seed() {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog: [PICK],
    catalogStatus: "ok",
    savedIds: [PICK.id],
    user: null,
  });
}

// SavedPage는 MobileScreen(<main>)과 DesktopShell(<main id="main">)을 동시에 렌더한다
// (모바일/데스크탑 전환은 md: 반응형 CSS로만 처리 — 실제 브라우저에서는 미디어쿼리가
// 비일치 트리를 display:none으로 감춰 접근성 트리에서 제외한다). jsdom은 미디어쿼리를
// 적용하지 않으므로 두 <main>이 동시에 "보이는" 상태로 남아 axe의 landmark-no-duplicate-main
// 같은 페이지 전역 규칙(컨텍스트로 스코프해도 문서 전체를 본다)이 오탐한다.
// M-014 범위(중첩 인터랙티브 제거)와 무관한 jsdom 한계이므로 이 규칙만 끈다.
const AXE_OPTIONS = { rules: { "landmark-no-duplicate-main": { enabled: false } } };

describe("SavedPage a11y (M-014)", () => {
  beforeEach(() => seed());

  it("모바일 컨테이너에 axe 위반이 없다", async () => {
    render(<SavedPage />);
    const mobile = screen.getByTestId("saved-mobile");
    const results = await axe(mobile, AXE_OPTIONS);
    // @ts-expect-error vitest-axe 타입 선언 미스매치 — 런타임은 정상
    expect(results).toHaveNoViolations();
  });

  it("데스크탑 컨테이너에 axe 위반이 없다", async () => {
    render(<SavedPage />);
    const desktop = screen.getByTestId("saved-desktop");
    const results = await axe(desktop, AXE_OPTIONS);
    // @ts-expect-error vitest-axe 타입 선언 미스매치 — 런타임은 정상
    expect(results).toHaveNoViolations();
  });
});

describe("SavedPage 카드 인터랙션 (M-014)", () => {
  beforeEach(() => seed());

  it("토글 버튼 클릭 시 toggleSaved(id)만 호출되고 상세로 이동하지 않는다", async () => {
    const push = vi.fn();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof navigation.useRouter>);

    const user = userEvent.setup();
    render(<SavedPage />);
    const mobile = within(screen.getByTestId("saved-mobile"));

    const toggleButton = mobile.getByRole("button", { name: "저장 취소" });
    await user.click(toggleButton);

    expect(useAppStore.getState().savedIds).not.toContain(PICK.id);
    expect(push).not.toHaveBeenCalled();
  });

  it("상세 버튼 클릭 시 router.push로 상세 페이지로 이동한다", async () => {
    const push = vi.fn();
    vi.spyOn(navigation, "useRouter").mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof navigation.useRouter>);

    const user = userEvent.setup();
    render(<SavedPage />);
    const mobile = within(screen.getByTestId("saved-mobile"));

    const detailButton = mobile.getByRole("button", { name: `${PICK.title} 상세 보기` });
    await user.click(detailButton);

    expect(push).toHaveBeenCalledWith(`/opportunity?id=${PICK.id}`);
  });

  it("토글 버튼은 aria-label '저장 취소'와 aria-pressed='true'를 노출한다", () => {
    render(<SavedPage />);
    const mobile = within(screen.getByTestId("saved-mobile"));

    const toggleButton = mobile.getByRole("button", { name: "저장 취소" });
    expect(toggleButton).toHaveAttribute("aria-pressed", "true");
  });

  it("어떤 인터랙티브 요소도 다른 인터랙티브 요소 안에 중첩되지 않는다", () => {
    render(<SavedPage />);
    const mobile = screen.getByTestId("saved-mobile");
    const buttons = mobile.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.querySelector("button, a, input, [role='button']")).toBeNull();
    });
  });
});
