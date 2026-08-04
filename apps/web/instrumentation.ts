/**
 * Next.js instrumentation 훅 — 런타임별 Sentry 초기화 + 서버 에러 자동 포착.
 *
 * onRequestError가 Server Component·route handler·middleware에서 **던져져 나가는** 예외를
 * 자동으로 잡는다. 그래서 route handler에 captureException을 손으로 넣지 않는다.
 * catch로 잡아 정상 응답으로 바꾸는 지점만 lib/api-error.ts의 reportError를 명시적으로 부른다.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
