"use client";

/**
 * 최후의 그물 — 루트 레이아웃 자체가 터졌을 때.
 *
 * layout.tsx의 <body>에서 AuthBoot·KakaoSDK·WebVitals가 도는데, 이들이 던지면
 * error.tsx는 레이아웃 **안**이라 렌더 자체가 안 된다. 그 경우만 이 파일이 뜬다.
 * 그래서 <html>·<body>를 직접 만든다(레이아웃을 대체하므로).
 *
 * ⚠️ 일부러 멍청하게 유지한다: globals.css도 폰트도 안 실렸을 수 있으므로
 *    공용 컴포넌트 import 금지, Tailwind 클래스 금지, 인라인 스타일만.
 *    여기서 또 던지면 사용자는 정말로 아무것도 못 본다.
 */
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // reportError(@/lib/api-error)를 쓰지 않는다 — import 하나라도 줄여 실패 표면을 좁힌다.
    console.error("[app/global-error]", error);
    Sentry.captureException(error, { tags: { scope: "app/global-error" } });
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "0 32px",
          textAlign: "center",
          background: "#ffffff",
          color: "#1c1a17",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>문제가 생겼어요</p>
        <p style={{ margin: 0, maxWidth: 320, fontSize: 14, lineHeight: 1.6, color: "#6b645a" }}>
          잠시 후 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 16,
            minHeight: 44,
            padding: "0 24px",
            border: "none",
            borderRadius: 12,
            /* 토큰과 같은 값을 손으로 박는다 — global-error는 앱 스타일시트 바깥에서
               렌더돼 CSS 변수를 못 쓴다. 색약 대응으로 primary와 함께 내렸다(구 #d42f4a는
               흰 글씨 대비가 deutan 4.19:1로 AA 미달). packages/tokens가 바뀌면 여기도 같이. */
            background: "#9e2b41",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
