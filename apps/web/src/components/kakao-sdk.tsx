"use client";

import Script from "next/script";
import { initKakao } from "@/lib/kakao";

/**
 * 카카오 JavaScript SDK 로더 — 루트 layout에 삽입.
 * 로드 완료 시 앱 키로 init한다. 키가 없으면(개발 환경 등) init은 조용히 무시되고
 * 공유는 폴백(OS 공유 시트/링크 복사)으로 동작한다.
 */
export function KakaoSDK() {
  // 키가 없으면 SDK 자체를 로드하지 않음(불필요한 네트워크 요청 방지).
  if (!process.env.NEXT_PUBLIC_KAKAO_JS_KEY) return null;

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
      integrity="sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={initKakao}
    />
  );
}
