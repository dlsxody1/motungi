/**
 * Sentry — Node 런타임(route handler·서버 컴포넌트).
 * DSN이 비어 있으면 SDK는 조용히 no-op이므로, DSN 발급 전에도 안전하게 머지된다.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 사용자 0명 단계 — 트레이스는 끄고 에러만 받는다. 트래픽이 생기면 올린다.
  tracesSampleRate: 0,
  // 스택 프레임에 지역변수 값을 붙인다 — 서버 전용이라 클라 번들 비용이 0이고,
  // "어떤 id로 부를 때 터졌나"를 재현 없이 알 수 있다.
  includeLocalVariables: true,
  // 개발 중 콘솔에 SDK 로그를 뿌리지 않는다.
  debug: false,
});
