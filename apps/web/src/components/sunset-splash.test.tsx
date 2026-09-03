import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SunsetSplash } from "@/components/sunset-splash";

/**
 * 스플래시는 홈 전체를 덮는 오버레이라 **스스로 사라지지 않으면 랜딩이 영영 가려진다.**
 * 이 파일이 지키는 계약은 그거 하나 + 세션당 1회다. 픽셀·전환은 CSS가 갖고 있어 단언하지 않는다.
 */
describe("SunsetSplash", () => {
  beforeEach(() => sessionStorage.clear());

  it("첫 진입에 태그라인과 함께 뜬다", () => {
    render(<SunsetSplash />);

    expect(screen.getByText("퇴근하고 뭐하지?")).toBeInTheDocument();
  });

  it("시퀀스가 끝나면 오버레이가 사라진다", async () => {
    render(<SunsetSplash />);

    await waitFor(() => expect(screen.queryByText("모퉁이")).not.toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  it("같은 세션에서 두 번째 진입엔 뜨지 않는다", () => {
    const { unmount } = render(<SunsetSplash />);
    unmount();

    render(<SunsetSplash />);

    expect(screen.queryByText("퇴근하고 뭐하지?")).not.toBeInTheDocument();
  });
});
