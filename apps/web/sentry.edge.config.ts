/**
 * Sentry — Edge 런타임(middleware 등).
 * 현재 middleware는 없지만, 나중에 추가돼도 계측이 비지 않도록 함께 둔다.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  debug: false,
});
