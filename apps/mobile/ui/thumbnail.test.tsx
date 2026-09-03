/**
 * Thumbnail(RN) — 웹 thumbnail.tsx의 폴백 계약(이미지 없음/로드 실패 → 플레이스홀더)이
 * RN 쪽에서도 그대로 성립하는지 검증한다(M-051).
 */
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Thumbnail } from "./thumbnail";

/**
 * react-native-web의 Image는 DOM <img>의 onerror가 아니라, 내부적으로 만든
 * `new window.Image()`의 onerror/onload로 로드 성공/실패를 판정한다(ImageLoader).
 * jsdom은 기본적으로 실제 리소스 로드를 하지 않아 이 이벤트가 자연 발생하지 않으므로,
 * 이 테스트에서만 window.Image를 "항상 실패"하는 더블로 바꿔 onError 경로를 결정적으로 재현한다.
 */
class AlwaysErrorsImage {
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

describe("Thumbnail", () => {
  it("imageUrl이 있으면 이미지를 렌더한다", () => {
    const { container } = render(<Thumbnail imageUrl="https://example.test/a.jpg" tone="brand" />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.test/a.jpg");
  });

  it("imageUrl이 없으면 플레이스홀더만 렌더한다(이미지 태그 없음)", () => {
    const { container } = render(<Thumbnail tone="mint" />);

    expect(container.querySelector("img")).toBeNull();
  });

  it("이미지 로드 실패(onError) 시 크래시 없이 플레이스홀더로 폴백한다", async () => {
    const originalImage = window.Image;
    // @ts-expect-error 테스트 더블 — 항상 실패하는 window.Image
    window.Image = AlwaysErrorsImage;

    try {
      const { container } = render(
        <Thumbnail imageUrl="https://example.test/broken.jpg" tone="brand" />,
      );

      expect(container.querySelector("img")).not.toBeNull();

      // 폴백 후엔 <img> 자체가 사라지고 플레이스홀더 면만 남는다. 크래시 없이 도달하면 통과.
      await waitFor(() => {
        expect(container.querySelector("img")).toBeNull();
      });
    } finally {
      window.Image = originalImage;
    }
  });
});
