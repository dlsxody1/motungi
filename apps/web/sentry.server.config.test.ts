/**
 * sentry.server.config.ts의 beforeBreadcrumb/beforeSend 스크러빙(M-078) 테스트.
 *
 * Gemini API 키가 ?key= 쿼리로 전송되던 시절의 흔적(회귀 대비) + NAVER/data.go.kr도
 * 같은 계열 위험이라 함께 막는다 — 민감 호스트로 가는 요청의 쿼리스트링이 breadcrumb/이벤트에
 * 남지 않아야 한다. Sentry.init을 모킹해 옵션 객체를 가로챈 뒤 두 훅을 직접 호출해 검증한다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  init: (...args: unknown[]) => init(...args),
}));

beforeEach(() => {
  init.mockClear();
  vi.resetModules();
});

async function loadOptions() {
  await import("./sentry.server.config");
  return init.mock.calls[0]![0] as {
    beforeBreadcrumb: (b: { data?: Record<string, unknown> }) => { data?: Record<string, unknown> };
    beforeSend: (e: {
      request?: { url?: string };
      breadcrumbs?: { data?: Record<string, unknown> }[];
    }) => { request?: { url?: string }; breadcrumbs?: { data?: Record<string, unknown> }[] };
  };
}

describe("beforeBreadcrumb", () => {
  it("Gemini 호스트로 가는 breadcrumb의 쿼리스트링(?key=...)을 제거한다", async () => {
    const { beforeBreadcrumb } = await loadOptions();
    const out = beforeBreadcrumb({
      data: { url: "https://generativelanguage.googleapis.com/v1beta/models/x?key=super-secret" },
    });
    expect(out.data?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/x");
  });

  it("NAVER·data.go.kr 호스트도 동일하게 쿼리스트링을 제거한다", async () => {
    const { beforeBreadcrumb } = await loadOptions();
    expect(
      beforeBreadcrumb({ data: { url: "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=1,2" } })
        .data?.url,
    ).toBe("https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc");
    expect(
      beforeBreadcrumb({ data: { url: "https://apis.data.go.kr/B553457/cultureinfo/period2?serviceKey=abc" } })
        .data?.url,
    ).toBe("https://apis.data.go.kr/B553457/cultureinfo/period2");
  });

  it("민감하지 않은 호스트의 쿼리스트링은 그대로 둔다", async () => {
    const { beforeBreadcrumb } = await loadOptions();
    const out = beforeBreadcrumb({ data: { url: "https://example.com/api?page=2" } });
    expect(out.data?.url).toBe("https://example.com/api?page=2");
  });

  it("data.url이 없으면 그대로 통과시킨다(크래시 없음)", async () => {
    const { beforeBreadcrumb } = await loadOptions();
    expect(() => beforeBreadcrumb({})).not.toThrow();
  });
});

describe("beforeSend", () => {
  it("event.request.url의 민감 쿼리스트링을 제거한다", async () => {
    const { beforeSend } = await loadOptions();
    const out = beforeSend({
      request: { url: "https://generativelanguage.googleapis.com/v1beta/models/x?key=super-secret" },
    });
    expect(out.request?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/x");
  });

  it("event.breadcrumbs 배열 안의 민감 쿼리스트링도 함께 제거한다", async () => {
    const { beforeSend } = await loadOptions();
    const out = beforeSend({
      breadcrumbs: [
        { data: { url: "https://generativelanguage.googleapis.com/v1beta/models/x?key=leak" } },
        { data: { url: "https://example.com/ok?page=1" } },
      ],
    });
    expect(out.breadcrumbs?.[0]?.data?.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/x",
    );
    expect(out.breadcrumbs?.[1]?.data?.url).toBe("https://example.com/ok?page=1");
  });
});
