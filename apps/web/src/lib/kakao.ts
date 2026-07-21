/**
 * 카카오톡 공유 — Kakao JavaScript SDK 래퍼.
 *
 * SDK는 next/script(layout)에서 로드하고, 여기서 앱 키로 1회 init한 뒤
 * Kakao.Share.sendDefault(피드 템플릿)로 공유한다.
 *
 * 우선순위:
 *   1) 카카오 SDK 준비됨 → Kakao.Share.sendDefault (카카오톡 앱/웹 공유창)
 *   2) navigator.share 있음(주로 모바일) → OS 공유 시트
 *   3) 그 외 → 링크를 클립보드로 복사
 *
 * 데스크톱 브라우저에는 navigator.share가 없어(1) 카카오 SDK가 최우선이다.
 */

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

/** Kakao SDK의 필요한 부분만 타이핑 (전역 window.Kakao). */
interface KakaoSDK {
  isInitialized: () => boolean;
  init: (appKey: string) => void;
  Share: {
    sendDefault: (settings: KakaoDefaultShare) => void;
  };
}

interface KakaoDefaultShare {
  objectType: "feed";
  content: {
    title: string;
    description?: string;
    imageUrl?: string;
    link: { mobileWebUrl: string; webUrl: string };
  };
  buttons?: Array<{
    title: string;
    link: { mobileWebUrl: string; webUrl: string };
  }>;
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

/**
 * SDK가 로드되었으면 init을 보장한다. next/script onLoad에서 호출.
 * 앱 키가 없거나 SDK가 아직 없으면 조용히 무시(공유 시 폴백으로 처리).
 */
export function initKakao(): void {
  if (typeof window === "undefined") return;
  const kakao = window.Kakao;
  if (!kakao || !KAKAO_JS_KEY) return;
  if (!kakao.isInitialized()) kakao.init(KAKAO_JS_KEY);
}

export interface SharePayload {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}

/**
 * 콘텐츠를 카카오톡으로 공유한다(폴백 포함).
 * 반환값은 실제로 사용한 방식 — 호출부에서 토스트 등에 활용 가능.
 */
export async function shareContent(
  payload: SharePayload,
): Promise<"kakao" | "web-share" | "clipboard" | "none"> {
  const { title, description, url, imageUrl } = payload;

  // 1) 카카오 SDK.
  const kakao = typeof window !== "undefined" ? window.Kakao : undefined;
  if (kakao && KAKAO_JS_KEY) {
    if (!kakao.isInitialized()) kakao.init(KAKAO_JS_KEY);
    if (kakao.isInitialized()) {
      // 카카오는 content.imageUrl 키가 있으면 반드시 유효한 절대 URL이어야 한다
      // (undefined/빈 값이면 "Illegal argument for imageUrl" 에러).
      // 콘텐츠 이미지가 없으면 앱 OG 이미지를 폴백으로 사용.
      const origin = new URL(url).origin;
      const image = imageUrl ?? `${origin}/opengraph-image.png`;
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description,
          imageUrl: image,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [
          {
            title: "자세히 보기",
            link: { mobileWebUrl: url, webUrl: url },
          },
        ],
      });
      return "kakao";
    }
  }

  // 2) OS 공유 시트(주로 모바일).
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text: description, url });
      return "web-share";
    } catch {
      // 사용자가 취소했거나 실패 — 클립보드로 폴백.
    }
  }

  // 3) 링크 복사.
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${title}\n${url}`);
      return "clipboard";
    } catch {
      /* noop */
    }
  }

  return "none";
}
