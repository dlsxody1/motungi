/**
 * /api/vitals 수집 라우트 테스트.
 * 계측 엔드포인트는 외부에서 아무거나 POST할 수 있으므로 입력 검증이 계약이다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function req(body: string): Request {
  return new Request("http://x/api/vitals", { method: "POST", body });
}

beforeEach(() => {
  // 라우트가 console.log로 떨구므로 테스트 출력이 더러워지지 않게 막는다.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/vitals", () => {
  it("정상 지표는 204로 받는다(본문 없음)", async () => {
    const res = await POST(
      req(JSON.stringify({ name: "LCP", value: 1234.5, rating: "good", path: "/explore" })),
    );
    expect(res.status).toBe(204);
  });

  it("수집 대상 5종을 모두 받는다", async () => {
    for (const name of ["LCP", "INP", "CLS", "FCP", "TTFB"]) {
      const res = await POST(req(JSON.stringify({ name, value: 1 })));
      expect(res.status).toBe(204);
    }
  });

  it("모르는 지표 이름은 400으로 버린다", async () => {
    const res = await POST(req(JSON.stringify({ name: "NOT_A_METRIC", value: 1 })));
    expect(res.status).toBe(400);
  });

  it("value가 숫자가 아니면 400", async () => {
    const res = await POST(req(JSON.stringify({ name: "LCP", value: "빠름" })));
    expect(res.status).toBe(400);
  });

  it("value가 NaN·Infinity면 400 (JSON은 null로 직렬화된다)", async () => {
    const res = await POST(req('{"name":"LCP","value":null}'));
    expect(res.status).toBe(400);
  });

  it("JSON이 깨졌으면 400", async () => {
    const res = await POST(req("not json{"));
    expect(res.status).toBe(400);
  });

  it("본문이 배열·null이면 400", async () => {
    expect((await POST(req("[]"))).status).toBe(400);
    expect((await POST(req("null"))).status).toBe(400);
  });

  it("과대 본문은 413으로 끊는다", async () => {
    const res = await POST(req(JSON.stringify({ name: "LCP", value: 1, pad: "x".repeat(3000) })));
    expect(res.status).toBe(413);
  });

  it("CLS는 소수로, 나머지는 ms로 기록한다", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await POST(req(JSON.stringify({ name: "CLS", value: 0.0512 })));
    expect(log.mock.calls[0]?.[0]).toContain("CLS=0.051");
    await POST(req(JSON.stringify({ name: "LCP", value: 1234.6 })));
    expect(log.mock.calls[1]?.[0]).toContain("LCP=1235ms");
  });
});
