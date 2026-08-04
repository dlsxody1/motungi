/**
 * 라우트 에러 경계 테스트.
 *
 * 프로덕션에는 dev 오버레이가 없으므로 이 파일이 없으면 사용자는 흰 화면을 본다.
 * 여기서 검증하는 건 셋: 메시지가 보이는가, 재시도가 reset()을 부르는가, 에러가 보고되는가.
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/dist/matchers";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const reportError = vi.fn();
vi.mock("@/lib/api-error", () => ({
  reportError: (...args: unknown[]) => reportError(...args),
}));

import { ErrorState } from "@/components/error-state";
import Error from "./error";

expect.extend({ toHaveNoViolations });
// vitest.config.ts의 globals:false 때문에 자동 cleanup이 없다 — 파일 단위로 등록.
afterEach(() => cleanup());

beforeEach(() => {
  push.mockClear();
  reportError.mockClear();
});

const boom = Object.assign(new globalThis.Error("boom"), { digest: "abc123" });

describe("app/error.tsx", () => {
  it("에러 메시지와 복구 버튼을 보여준다", () => {
    render(<Error error={boom} reset={vi.fn()} />);

    // 모바일·데스크톱 두 트리에 각각 렌더되므로 getAllBy* 로 받는다.
    expect(screen.getAllByText("문제가 생겼어요").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "다시 시도" }).length).toBeGreaterThan(0);
  });

  // 이 컨벤션 파일의 존재 이유 — reset()이 같은 라우트를 다시 렌더해 복구를 시도한다.
  it("'다시 시도'는 reset()을 호출한다", async () => {
    const reset = vi.fn();
    render(<Error error={boom} reset={reset} />);

    const [button] = screen.getAllByRole("button", { name: "다시 시도" });
    await userEvent.click(button!);

    expect(reset).toHaveBeenCalledTimes(1);
    // 복구는 라우터 이동이 아니라 재렌더여야 한다.
    expect(push).not.toHaveBeenCalled();
  });

  it("'홈으로'는 루트로 이동한다", async () => {
    render(<Error error={boom} reset={vi.fn()} />);

    const [button] = screen.getAllByRole("button", { name: "홈으로" });
    await userEvent.click(button!);

    expect(push).toHaveBeenCalledWith("/");
  });

  // 로깅이 빠지면 프로덕션 500이 다시 진단 불가가 된다.
  it("마운트 시 에러를 보고한다", () => {
    render(<Error error={boom} reset={vi.fn()} />);

    expect(reportError).toHaveBeenCalledWith("app/error", boom);
  });

  /**
   * a11y는 본문 컴포넌트(ErrorState)에 대고 검사한다.
   *
   * 페이지 전체를 넣으면 landmark-no-duplicate-main으로 항상 깨진다: 이 앱은 모바일·데스크톱을
   * **형제 트리**로 렌더해서 <main>이 DOM에 둘 있고(실제 브라우저는 md 브레이크포인트로 한쪽만
   * 보여준다), 이 규칙은 문서 단위라 요소를 좁혀도 안 없어진다. 그건 이 파일이 아니라 앱 전체
   * 셸 구조의 문제라 여기서 판정할 대상이 아니다.
   */
  it("에러 본문에 접근성 위반이 없다", async () => {
    const { container } = render(
      <ErrorState
        alert
        title="문제가 생겼어요"
        desc="잠시 후 다시 시도해 주세요."
        action={{ label: "다시 시도", onClick: vi.fn() }}
        secondary={{ label: "홈으로", onClick: vi.fn() }}
      />,
    );
    const results = await axe(container);
    // @ts-expect-error vitest-axe 타입 선언 미스매치 — 런타임은 정상(saved/page.test.tsx와 동일)
    expect(results).toHaveNoViolations();
  });

  // 에러는 스크린리더에 즉시 알려야 한다.
  it("에러 본문은 role=alert 로 알린다", () => {
    render(<Error error={boom} reset={vi.fn()} />);
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});
