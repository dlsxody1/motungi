/**
 * API 에러 응답 + 에러 리포팅 단일 창구.
 *
 * 응답 형태는 **평면** `{ error, message }`다. api-design 스킬은 중첩
 * `{ error: { code, message } }`를 권하지만, 이 앱은 13곳이 평면으로 나가고 있고
 * useEnsureCatalog 등 클라이언트가 그 형태를 읽는다. 스킬이 아니라 코드를 따른다.
 */
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

/** 에러 응답. code는 기계용(snake_case), message는 사람용 한국어. */
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

/**
 * 삼켜지는 예외를 남긴다.
 *
 * 던져서 나가는 예외는 instrumentation.ts의 onRequestError가 자동 포착하므로 여기 부를 필요 없다.
 * 이 함수는 **catch로 잡아 정상 응답으로 바꾸는 지점** 전용 — 자동 포착이 닿지 않는 곳이다.
 * scope는 Sentry에서 검색할 태그(예: "api/geo").
 */
export function reportError(scope: string, err: unknown): void {
  // Next는 빌드 때 라우트가 정적 렌더 가능한지 보려고 일부러 실행해본다. request.url을 읽으면
  // DYNAMIC_SERVER_USAGE로 중단시키는데, 이건 버그가 아니라 **정상 제어 흐름**이다.
  // 거르지 않으면 배포할 때마다 Sentry와 빌드 로그에 가짜 에러가 쌓인다.
  if (isNextControlFlow(err)) return;

  console.error(`[${scope}]`, err);
  Sentry.captureException(err, { tags: { scope } });
}

/** Next가 제어 흐름으로 던지는 예외인지 — 정적 렌더 프로브(DYNAMIC_SERVER_USAGE) 등. */
function isNextControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("DYNAMIC_SERVER_USAGE");
}
