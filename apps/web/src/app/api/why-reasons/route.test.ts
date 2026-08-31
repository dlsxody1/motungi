/**
 * /api/why-reasons 테스트.
 *
 * 핵심 회귀: 이 라우트는 "실패해도 페이지가 죽지 않는다"가 계약이다 — 키 미설정·429(무료
 * 티어 rate limit)·5xx·타임아웃·malformed 응답 전부 에러가 아니라 `{fallback:true}` 200
 * 이어야 한다. 아래 케이스들이 그 계약을 지킨다.
 *
 * 이 파일은 또한 자체 레이트리밋(M-076, 진짜 429)과 Gemini 키 전송 방식(M-078, 헤더)도 검증한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-error", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-error")>("@/lib/api-error");
  return { ...actual, reportError: vi.fn() };
});

import { __resetRateLimitForTests } from "@/lib/rate-limit";
import { POST } from "./route";

const VALID_BODY = {
  category: "culture",
  title: "동네 소극장 연극",
  costHeading: "참가비",
  costLabel: "무료",
  timeLabel: "19–21시",
  breakdown: { fit: 1, distance: 0.8, time: 0.5, difficulty: 1, cost: 0.5 },
};

function req(body: unknown): Request {
  return new Request("http://x/api/why-reasons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function geminiResponse(text: string, tokens = 42): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
      usageMetadata: { totalTokenCount: tokens },
    }),
    { status: 200 },
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  // 레이트리밋 버킷은 모듈 전역 상태 — 리셋 안 하면 이전 테스트 호출수가 새어 들어온다.
  __resetRateLimitForTests();
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("POST /api/why-reasons — 입력 검증", () => {
  it("본문이 JSON이 아니면 400", async () => {
    const res = await POST(new Request("http://x/api/why-reasons", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_body");
  });

  it("breakdown 축이 하나라도 없으면 400", async () => {
    const { breakdown, ...rest } = VALID_BODY;
    const res = await POST(req({ ...rest, breakdown: { fit: 1, distance: 0.8 } }));
    expect(res.status).toBe(400);
  });

  it("category가 문자열이 아니면 400", async () => {
    const res = await POST(req({ ...VALID_BODY, category: 123 }));
    expect(res.status).toBe(400);
  });

  it("category가 OpportunityCategory 멤버가 아니면 400(M-066), fetch도 호출되지 않는다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(req({ ...VALID_BODY, category: "subsidy" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid_body");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("category가 culture 외의 유효한 OpportunityCategory 멤버면 통과한다(M-066)", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geminiResponse("퇴근 후 부업으로 딱이에요.")),
    );

    const res = await POST(req({ ...VALID_BODY, category: "side_job" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.fallback).toBe(false);
  });

  it("timeLabel은 null이 유효하다(있으면 필수 아님)", async () => {
    process.env.GEMINI_API_KEY = "";
    const res = await POST(req({ ...VALID_BODY, timeLabel: null }));
    expect(res.status).toBe(200);
  });

  it("title이 200자를 넘으면 400(M-076, 프롬프트 남용 방어)", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(req({ ...VALID_BODY, title: "가".repeat(201) }));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("title이 정확히 200자면 통과한다(경계값)", async () => {
    process.env.GEMINI_API_KEY = "";
    const res = await POST(req({ ...VALID_BODY, title: "가".repeat(200) }));
    expect(res.status).toBe(200);
  });

  it("costLabel·timeLabel도 200자를 넘으면 400", async () => {
    const overLong = "0".repeat(201);
    const resCost = await POST(req({ ...VALID_BODY, costLabel: overLong }));
    expect(resCost.status).toBe(400);

    const resTime = await POST(req({ ...VALID_BODY, timeLabel: overLong }));
    expect(resTime.status).toBe(400);
  });
});

describe("POST /api/why-reasons — 키 미설정 (M-026/M-040과 같은 패턴)", () => {
  it("GEMINI_API_KEY가 없으면 fetch 없이 fallback:true를 즉시 반환한다", async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(req(VALID_BODY));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ fallback: true, reason: "no_key" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/why-reasons — 상류 실패는 전부 폴백(에러 아님)", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("429(무료 티어 rate limit)면 fallback:true, 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fallback).toBe(true);
    expect(body.reason).toBe("upstream_429");
  });

  it("500이면 fallback:true, 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).fallback).toBe(true);
  });

  it("네트워크 에러(fetch reject)면 fallback:true, 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ fallback: true, reason: "network_error" });
  });

  it("응답 JSON 파싱이 깨져도 fallback:true, 200(500으로 새지 않음)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<<<not json", { status: 200 })));
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(200);
    expect((await res.json()).fallback).toBe(true);
  });

  it("candidates가 비어 텍스트를 못 뽑으면 fallback:true(empty_response)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [] }), { status: 200 })),
    );
    const res = await POST(req(VALID_BODY));
    const body = await res.json();
    expect(body).toEqual({ fallback: true, reason: "empty_response" });
  });
});

describe("POST /api/why-reasons — 성공 경로", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("정상 응답이면 reasons 배열 + 토큰 usage를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse("퇴근 후 저녁 시간대에 딱이에요.\n관심사에 꼭 맞는 활동이에요.\n무료라 부담 없어요."),
      ),
    );
    const res = await POST(req(VALID_BODY));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.fallback).toBe(false);
    expect(body.reasons).toEqual([
      "퇴근 후 저녁 시간대에 딱이에요.",
      "관심사에 꼭 맞는 활동이에요.",
      "무료라 부담 없어요.",
    ]);
    expect(body.usage).toEqual({ tokens: 42 });
  });

  it("최대 3개까지만 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse("a\nb\nc\nd\ne")));
    const res = await POST(req(VALID_BODY));
    const body = await res.json();
    expect(body.reasons).toHaveLength(3);
  });

  it("불릿(-, *, 숫자.)이 앞에 붙어 있으면 걷어낸다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse("1. 첫 줄\n- 둘째 줄\n* 셋째 줄")));
    const res = await POST(req(VALID_BODY));
    const body = await res.json();
    expect(body.reasons).toEqual(["첫 줄", "둘째 줄", "셋째 줄"]);
  });

  it("타임아웃 발생 시 AbortController로 요청을 취소하고 fallback을 반환한다", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn((_url: string, opts?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const resPromise = POST(req(VALID_BODY));
    await vi.advanceTimersByTimeAsync(5000);
    const res = await resPromise;

    expect(res.status).toBe(200);
    expect((await res.json()).fallback).toBe(true);
    vi.useRealTimers();
  });
});

describe("POST /api/why-reasons — Gemini 키 전송 방식(M-078)", () => {
  it("API 키를 ?key= 쿼리스트링이 아니라 x-goog-api-key 헤더로 보낸다", async () => {
    process.env.GEMINI_API_KEY = "secret-key-value";
    const fetchSpy = vi.fn().mockResolvedValue(geminiResponse("근거 문장."));
    vi.stubGlobal("fetch", fetchSpy);

    await POST(req(VALID_BODY));

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("secret-key-value");
    expect(url).not.toContain("key=");
    expect((opts.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret-key-value");
  });
});

describe("POST /api/why-reasons — 레이트리밋(M-076)", () => {
  function reqFrom(ip: string): Request {
    return new Request("http://x/api/why-reasons", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
      headers: { "x-forwarded-for": ip },
    });
  }

  it("같은 IP가 분당 허용치를 넘기면 429 rate_limited를 반환한다(키 미설정이라도 fetch 이전에 걸린다)", async () => {
    delete process.env.GEMINI_API_KEY;

    let last: Response | undefined;
    // RATE_LIMIT(15)을 넘길 때까지 같은 IP로 반복.
    for (let i = 0; i < 16; i++) {
      last = await POST(reqFrom("198.51.100.1"));
    }

    expect(last!.status).toBe(429);
    expect((await last!.json()).error).toBe("rate_limited");
    expect(last!.headers.get("Retry-After")).toBeTruthy();
  });

  it("서로 다른 IP는 서로의 레이트리밋에 영향을 주지 않는다", async () => {
    delete process.env.GEMINI_API_KEY;

    for (let i = 0; i < 16; i++) {
      await POST(reqFrom("198.51.100.1"));
    }
    const res = await POST(reqFrom("198.51.100.2"));
    expect(res.status).toBe(200);
  });
});
