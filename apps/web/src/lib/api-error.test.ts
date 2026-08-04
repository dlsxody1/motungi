/**
 * apiError / reportError 계약 테스트.
 *
 * reportError의 필터가 회귀하면 배포할 때마다 Sentry에 가짜 에러가 쌓인다 —
 * 조용히 망가지는 종류라(아무것도 안 깨진다) 테스트로 고정한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { apiError, reportError } from "./api-error";

beforeEach(() => {
  captureException.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiError", () => {
  it("평면 { error, message } 형태와 상태코드로 응답한다", async () => {
    const res = apiError("not_found", "없어요.", 404);

    expect(res.status).toBe(404);
    // 중첩 { error: { code } }로 바뀌면 useEnsureCatalog 등 클라이언트가 전부 깨진다.
    expect(await res.json()).toEqual({ error: "not_found", message: "없어요." });
  });
});

describe("reportError", () => {
  it("진짜 에러는 Sentry로 보낸다", () => {
    const err = new Error("boom");
    reportError("api/geo", err);

    expect(captureException).toHaveBeenCalledWith(err, { tags: { scope: "api/geo" } });
  });

  // Next는 빌드 때 라우트 정적 렌더 가능성을 보려고 일부러 실행해 이 예외를 던진다.
  // 버그가 아니라 제어 흐름이라 보고하면 안 된다.
  it("Next의 정적 렌더 프로브(DYNAMIC_SERVER_USAGE)는 무시한다", () => {
    const probe = Object.assign(new Error("Dynamic server usage"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    reportError("api/trail-route", probe);

    expect(captureException).not.toHaveBeenCalled();
  });

  it("digest가 없는 일반 에러는 계속 보고한다", () => {
    reportError("api/x", new Error("real"));
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
