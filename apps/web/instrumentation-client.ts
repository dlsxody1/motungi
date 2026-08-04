/**
 * Sentry — 브라우저. Next가 이 파일을 클라이언트 번들 진입점에서 자동으로 실행한다.
 *
 * replay·profiling 인테그레이션은 넣지 않는다: 번들이 커지고 프라이버시 표면이 늘어나는데,
 * 지금 필요한 건 "무엇이 터졌나" 하나뿐이다(web-vitals.tsx의 같은 판단 참조).
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  debug: false,
});

// App Router 내비게이션 계측 — 에러가 어느 라우트에서 났는지 붙는다.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
