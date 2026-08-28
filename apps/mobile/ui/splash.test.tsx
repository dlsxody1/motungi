import { render, waitFor } from "@testing-library/react";
import { AccessibilityInfo } from "react-native";
import { describe, expect, it, vi } from "vitest";
import { Splash } from "@/ui/splash";

vi.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

describe("Splash", () => {
  /**
   * 스플래시는 라우터를 덮는 오버레이라 onDone이 안 불리면 앱이 영영 가려진다.
   * 애니메이션 시퀀스가 끝까지 도는지가 이 화면의 유일한 실패 지점.
   */
  it("애니메이션이 끝나면 onDone을 부른다", async () => {
    const onDone = vi.fn();
    render(<Splash onDone={onDone} />);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 5000 });
  });

  it("워드마크와 태그라인을 렌더한다", () => {
    const { getByText } = render(<Splash />);

    expect(getByText("모퉁이")).toBeInTheDocument();
    expect(getByText("퇴근하고 뭐하지?")).toBeInTheDocument();
  });

  /**
   * jsdom은 reduce-motion을 켠 것으로 보고하므로 위 케이스는 "모션 건너뛰기" 경로만 탄다.
   * 정작 위험한 건 2초짜리 시퀀스 쪽이다 — 시퀀스가 도중에 멎으면 onDone이 영영 안 불린다.
   */
  it("모션을 켠 경우에도 시퀀스 끝에 onDone을 부른다", async () => {
    vi.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const onDone = vi.fn();

    render(<Splash onDone={onDone} />);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1), { timeout: 8000 });
  });
});
