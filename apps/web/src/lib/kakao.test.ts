/**
 * shareContent 3단 폴백(카카오 SDK → navigator.share → clipboard → none) 계약 테스트.
 *
 * KAKAO_JS_KEY는 kakao.ts에서 `process.env.NEXT_PUBLIC_KAKAO_JS_KEY`를
 * **모듈 로드 시점에 캡처하는 top-level const**다. 정적 import로는 이 값이 테스트
 * 시작 전에 이미 undefined로 굳어버려 "kakao" 분기를 탈 수 없다. 그래서 매 테스트마다
 * vi.stubEnv → vi.resetModules → 동적 import 순서로 모듈을 새로 로드해야
 * 스텁한 env가 KAKAO_JS_KEY에 반영된다(4개 분기 모두 동일 패턴으로 통일).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SharePayload } from "./kakao";

const BASE_PAYLOAD: SharePayload = {
  title: "망원동 소규모 전시",
  description: "퇴근하고 들르기 좋은 동네 전시",
  url: "https://motungi.app/x",
};

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as { Kakao?: unknown }).Kakao;
  delete (navigator as { share?: unknown }).share;
  delete (navigator as { clipboard?: unknown }).clipboard;
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("shareContent", () => {
  it("카카오 SDK가 준비돼 있으면 Share.sendDefault로 공유하고 'kakao'를 반환한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "test-key");
    const sendDefault = vi.fn();
    window.Kakao = {
      isInitialized: vi.fn(() => true),
      init: vi.fn(),
      Share: { sendDefault },
    };

    const { shareContent } = await import("./kakao");
    const result = await shareContent({
      ...BASE_PAYLOAD,
      imageUrl: "https://example.com/img.png",
    });

    expect(result).toBe("kakao");
    expect(sendDefault).toHaveBeenCalledWith({
      objectType: "feed",
      content: {
        title: BASE_PAYLOAD.title,
        description: BASE_PAYLOAD.description,
        imageUrl: "https://example.com/img.png",
        link: { mobileWebUrl: BASE_PAYLOAD.url, webUrl: BASE_PAYLOAD.url },
      },
      buttons: [
        {
          title: "자세히 보기",
          link: { mobileWebUrl: BASE_PAYLOAD.url, webUrl: BASE_PAYLOAD.url },
        },
      ],
    });
  });

  it("imageUrl이 없으면 OG 이미지 폴백(origin/opengraph-image.png)을 쓴다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "test-key");
    const sendDefault = vi.fn();
    window.Kakao = {
      isInitialized: vi.fn(() => true),
      init: vi.fn(),
      Share: { sendDefault },
    };

    const { shareContent } = await import("./kakao");
    const result = await shareContent(BASE_PAYLOAD);

    expect(result).toBe("kakao");
    expect(sendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          imageUrl: "https://motungi.app/opengraph-image.png",
        }),
      }),
    );
  });

  it("카카오 SDK가 없고 navigator.share가 있으면 OS 공유 시트를 쓰고 'web-share'를 반환한다", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    const { shareContent } = await import("./kakao");
    const result = await shareContent(BASE_PAYLOAD);

    expect(result).toBe("web-share");
    expect(share).toHaveBeenCalledWith({
      title: BASE_PAYLOAD.title,
      text: BASE_PAYLOAD.description,
      url: BASE_PAYLOAD.url,
    });
  });

  it("카카오·web-share 둘 다 없으면 클립보드로 복사하고 'clipboard'를 반환한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const { shareContent } = await import("./kakao");
    const result = await shareContent(BASE_PAYLOAD);

    expect(result).toBe("clipboard");
    expect(writeText).toHaveBeenCalledWith(`${BASE_PAYLOAD.title}\n${BASE_PAYLOAD.url}`);
  });

  it("아무 공유 수단도 없으면 'none'을 반환한다", async () => {
    const { shareContent } = await import("./kakao");
    const result = await shareContent(BASE_PAYLOAD);

    expect(result).toBe("none");
  });

  it("navigator.share가 취소/실패해도 삼키고 클립보드로 폴백해 'clipboard'를 반환한다", async () => {
    const share = vi.fn().mockRejectedValue(new Error("user cancelled"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const { shareContent } = await import("./kakao");
    const result = await shareContent(BASE_PAYLOAD);

    expect(result).toBe("clipboard");
    expect(writeText).toHaveBeenCalledWith(`${BASE_PAYLOAD.title}\n${BASE_PAYLOAD.url}`);
  });

  it("web-share와 clipboard 둘 다 실패하면 'none'을 반환한다", async () => {
    const share = vi.fn().mockRejectedValue(new Error("user cancelled"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const { shareContent } = await import("./kakao");
    const result = await shareContent(BASE_PAYLOAD);

    expect(result).toBe("none");
  });
});
