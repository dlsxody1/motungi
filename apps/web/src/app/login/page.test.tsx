/**
 * 로그인 화면의 오픈 리다이렉트 방어(M-083) — next 파라미터 검증.
 *
 * login/page.tsx:34의 `rawNext.startsWith("/") && !rawNext.startsWith("//")`는
 * CWE-601(오픈 리다이렉트) 방어 코드다. `!startsWith("//")`가 얼핏 중복처럼 보여
 * 훗날 "단순화" 리팩터가 테스트 없이 이 절만 제거할 위험이 있으므로, 계약을
 * 직접 실행해 고정한다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";

const searchParamsRef = { current: new URLSearchParams() };
const replaceSpy = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: (...args: unknown[]) => replaceSpy(...args),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/login",
  useSearchParams: () => searchParamsRef.current,
}));

import LoginPage from "./page";

function seed(opts: { next?: string; loggedIn?: boolean } = {}) {
  searchParamsRef.current = new URLSearchParams(
    opts.next !== undefined ? { next: opts.next } : {},
  );
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: [],
    user: opts.loggedIn ? { id: "u1" } : null,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LoginPage — next 파라미터 오픈 리다이렉트 방어", () => {
  it("next가 없으면 기본값 /my로 처리한다('나중에 할게요' 링크)", () => {
    seed({});

    render(<LoginPage />);

    expect(screen.getByText("나중에 할게요")).toHaveAttribute("href", "/my");
  });

  it("next=//evil.com(프로토콜 상대 URL)은 /my로 폴백한다", () => {
    seed({ next: "//evil.com" });

    render(<LoginPage />);

    expect(screen.getByText("나중에 할게요")).toHaveAttribute("href", "/my");
  });

  it("next=https://evil.com(절대 URL)은 /my로 폴백한다", () => {
    seed({ next: "https://evil.com" });

    render(<LoginPage />);

    expect(screen.getByText("나중에 할게요")).toHaveAttribute("href", "/my");
  });

  it("next=/saved(유효한 내부 경로)는 그대로 보존한다", () => {
    seed({ next: "/saved" });

    render(<LoginPage />);

    expect(screen.getByText("나중에 할게요")).toHaveAttribute("href", "/saved");
  });

  it("로그인 상태(store.user 설정됨)면 해석된 next로 router.replace한다", () => {
    seed({ next: "/saved", loggedIn: true });

    render(<LoginPage />);

    expect(replaceSpy).toHaveBeenCalledWith("/saved");
  });

  it("로그인 상태 + 위험한 next(//evil.com)면 /my로 replace한다(리다이렉트도 방어 적용)", () => {
    seed({ next: "//evil.com", loggedIn: true });

    render(<LoginPage />);

    expect(replaceSpy).toHaveBeenCalledWith("/my");
  });
});
