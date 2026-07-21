import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as navigation from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
// vitest-axe 0.1.0 의 최상위 `matchers.d.ts` 는 `export type *` 로만 재노출해
// 값(함수)으로 import 할 수 없다(패키지 타입 선언 버그) — dist 경로에서 직접 가져온다.
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import DiagnosisPage from "./page";

expect.extend({ toHaveNoViolations });
// vitest.config.ts 의 `globals: false` 로 인해 @testing-library/react 가
// 테스트마다 자동 cleanup 하지 않는다 — 파일 단위로 직접 등록.
afterEach(() => cleanup());

describe("DiagnosisPage a11y", () => {
  it("모바일 컨테이너에 axe 위반이 없다", async () => {
    render(<DiagnosisPage />);
    const mobile = screen.getByTestId("diagnosis-mobile");
    const results = await axe(mobile);
    // vitest-axe 0.1.0 의 `extend-expect` 타입 선언은 구버전 `Vi.Assertion` 전역
    // 네임스페이스를 사용해 현재 vitest(@vitest/expect) 타입 시스템과 맞물리지
    // 않는다(패키지 타입 선언 버그) — 런타임 매처는 위 expect.extend 로 정상 동작한다.
    // @ts-expect-error vitest-axe 타입 선언 미스매치 — 런타임은 정상
    expect(results).toHaveNoViolations();
  });

  it("데스크탑 컨테이너에 axe 위반이 없다", async () => {
    render(<DiagnosisPage />);
    const desktop = screen.getByTestId("diagnosis-desktop");
    const results = await axe(desktop);
    // @ts-expect-error vitest-axe 타입 선언 미스매치 — 런타임은 정상
    expect(results).toHaveNoViolations();
  });
});

describe("DiagnosisPage 키보드 포커스 (모바일, Q1)", () => {
  it("뒤로가기 → 옵션 버튼 순서로 탭이 이동한다", async () => {
    const user = userEvent.setup();
    render(<DiagnosisPage />);
    const mobile = within(screen.getByTestId("diagnosis-mobile"));

    const backButton = mobile.getByRole("button", { name: "뒤로가기" });
    const optionButtons = [
      mobile.getByRole("button", { name: /문화·공연/ }),
      mobile.getByRole("button", { name: /운동·산책/ }),
      mobile.getByRole("button", { name: /먹거리·마켓/ }),
      mobile.getByRole("button", { name: /가벼운 부업/ }),
    ];
    const submitButton = mobile.getByRole("button", { name: "다음" });

    // 선택 전에는 제출 버튼이 disabled → 탭 순서에서 제외된다.
    expect(submitButton).toBeDisabled();

    await user.tab();
    expect(document.activeElement).toBe(backButton);

    for (const btn of optionButtons) {
      await user.tab();
      expect(document.activeElement).toBe(btn);
    }
  });

  it("옵션 버튼은 Enter로 선택할 수 있다", async () => {
    const user = userEvent.setup();
    render(<DiagnosisPage />);
    const mobile = within(screen.getByTestId("diagnosis-mobile"));

    const cultureButton = mobile.getByRole("button", { name: /문화·공연/ });
    const submitButton = mobile.getByRole("button", { name: "다음" });

    expect(submitButton).toBeDisabled();
    cultureButton.focus();
    await user.keyboard("{Enter}");

    // 선택되면 제출 버튼이 활성화된다 (선택 콜백이 실제로 트리거됨을 관찰 가능한 방식으로 확인).
    expect(submitButton).toBeEnabled();
    // 선택된 옵션에는 체크 아이콘이 렌더된다.
    expect(cultureButton.querySelector("svg")).toBeTruthy();
  });

  it("옵션 버튼은 Space로 선택할 수 있다", async () => {
    const user = userEvent.setup();
    render(<DiagnosisPage />);
    const mobile = within(screen.getByTestId("diagnosis-mobile"));

    const activeButton = mobile.getByRole("button", { name: /운동·산책/ });
    const submitButton = mobile.getByRole("button", { name: "다음" });

    expect(submitButton).toBeDisabled();
    activeButton.focus();
    await user.keyboard(" ");

    expect(submitButton).toBeEnabled();
    expect(activeButton.querySelector("svg")).toBeTruthy();
  });
});

describe("DiagnosisPage 전체 진단 플로우", () => {
  it("Q1 → Q2(자동 진행, 260ms) → Q3 완료 후 /loading 으로 이동한다", async () => {
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
    render(<DiagnosisPage />);
    const mobile = within(screen.getByTestId("diagnosis-mobile"));

    // Q1: 관심사 선택 (수동 진행 — 마지막 아니므로 "다음" 클릭)
    expect(mobile.getByText("Q1. 관심사")).toBeInTheDocument();
    await user.click(mobile.getByRole("button", { name: /문화·공연/ }));
    await user.click(mobile.getByRole("button", { name: "다음" }));

    // Q2: 시간대 선택 → 260ms 뒤 자동으로 Q3 로 진행
    expect(await mobile.findByText("Q2. 시간대")).toBeInTheDocument();
    await user.click(mobile.getByRole("button", { name: /평일 저녁/ }));

    await waitFor(
      () => {
        expect(mobile.getByText("Q3. 에너지")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Q3(마지막): 에너지 선택 후 "결과 보기" → 저장 콜백 + 라우터 이동
    await user.click(mobile.getByRole("button", { name: /보통/ }));
    await user.click(mobile.getByRole("button", { name: "결과 보기" }));

    expect(push).toHaveBeenCalledWith("/loading");
  });
});
