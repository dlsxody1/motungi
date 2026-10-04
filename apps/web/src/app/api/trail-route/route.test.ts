/**
 * /api/trail-route 프록시 테스트.
 *
 * 핵심 회귀: 이 라우트는 외부(두루누비) GPX를 파싱하는데 top-level try/catch가 없어서,
 * 깨진 XML이 오면 parseGpxPoints가 던진 예외가 스택 트레이스째 500으로 나갔다.
 * 아래 "깨진 GPX" 케이스가 그 회귀를 막는다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// unstable_cache는 Next 요청 컨텍스트 밖에서 못 돈다 — 성공한 결과만 인자별로 기억하는 가짜로 대체해
// "캐시된다 / 실패는 캐시되지 않는다"는 계약을 검증한다. 테스트마다 비운다.
const cacheStore = new Map<string, unknown>();
vi.mock("next/cache", () => ({
  unstable_cache:
    (fn: (...args: never[]) => Promise<unknown>) =>
    async (...args: never[]) => {
      const key = JSON.stringify(args);
      if (cacheStore.has(key)) return cacheStore.get(key);
      const value = await fn(...args); // throw면 저장되지 않는다
      cacheStore.set(key, value);
      return value;
    },
}));

const state: { supabase: unknown } = { supabase: null };
vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return state.supabase;
  },
}));

// Sentry 전송은 테스트에서 일어나면 안 된다(네트워크·노이즈).
vi.mock("@/lib/api-error", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-error")>("@/lib/api-error");
  return { ...actual, reportError: vi.fn() };
});

import { __resetRateLimitForTests } from "@/lib/rate-limit";
import { GET } from "./route";

const ID = "123e4567-e89b-12d3-a456-426614174000";

const GPX_URL = "https://www.durunubi.kr/api/rest/course.gpx";

function req(id: string | null): Request {
  const url = id === null ? "http://x/api/trail-route" : `http://x/api/trail-route?id=${encodeURIComponent(id)}`;
  return new Request(url);
}

/** from().select().eq().maybeSingle() 체인 fake. */
function makeClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, select, eq, maybeSingle };
}

/** gpx_url이 정상적으로 들어있는 클라이언트. */
function clientWithGpx(gpxUrl: string = GPX_URL) {
  return makeClient({ data: { gpx_url: gpxUrl }, error: null });
}

beforeEach(() => {
  __resetRateLimitForTests();
  cacheStore.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  state.supabase = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("GET /api/trail-route", () => {
  it("id가 없으면 400", async () => {
    state.supabase = clientWithGpx();
    const res = await GET(req(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_id");
  });

  it("supabase 미설정이면 503", async () => {
    state.supabase = null;
    const res = await GET(req(ID));
    expect(res.status).toBe(503);
  });

  it("gpx_url이 없는 활동은 404", async () => {
    state.supabase = makeClient({ data: { gpx_url: null }, error: null });
    const res = await GET(req(ID));
    expect(res.status).toBe(404);
  });

  // SSRF 방어 — 적재 경로가 바뀌어 임의 호스트가 들어와도 프록시가 되면 안 된다.
  it("허용되지 않은 호스트는 fetch하지 않고 404", async () => {
    state.supabase = clientWithGpx("https://evil.example.com/a.gpx");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(req(ID));
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("상류 GPX가 실패하면 502", async () => {
    state.supabase = clientWithGpx();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));

    const res = await GET(req(ID));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("upstream_error");
  });

  // ⬇️ 이 테스트가 고치려던 실제 버그다. 회귀하면 여기서 잡힌다.
  it("깨진 GPX가 와도 던진 500이 아니라 JSON 에러로 응답한다", async () => {
    state.supabase = clientWithGpx();
    // XML이 아닌 쓰레기 — 파서가 던지든 빈 배열을 주든 응답은 반드시 JSON이어야 한다.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<<<not xml at all", { status: 200 })));

    const res = await GET(req(ID));

    // 던져서 나가는 500(=스택 트레이스 노출)이 아니어야 한다.
    expect(res.status).not.toBe(500);
    expect([404, 502]).toContain(res.status);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(typeof body.message).toBe("string");
  });

  it("정상 GPX는 points와 bbox를 반환한다", async () => {
    state.supabase = clientWithGpx();
    const gpx = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="37.5" lon="127.0"/>
      <trkpt lat="37.6" lon="127.1"/>
    </trkseg></trk></gpx>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(gpx, { status: 200 })));

    const res = await GET(req(ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.points.length).toBeGreaterThan(0);
    expect(body.bbox).toEqual({ minLat: 37.5, maxLat: 37.6, minLng: 127.0, maxLng: 127.1 });
  });

  // 예상 못 한 예외(여기선 DB 조회 자체가 던짐)도 500 JSON으로 감싸져야 한다.
  it("예상 못 한 예외도 JSON 500으로 감싼다", async () => {
    const maybeSingle = vi.fn().mockRejectedValue(new Error("boom"));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    state.supabase = { from: vi.fn(() => ({ select })) };

    const res = await GET(req(ID));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("internal_error");
  });

  // M-120: 형식이 아닌 id는 Postgres까지 가지 않고 400.
  it("UUID 형식이 아닌 id는 DB 조회 없이 400", async () => {
    const client = clientWithGpx();
    state.supabase = client;
    for (const bad of ["abc", "1; drop table opportunities", "123e4567-e89b-12d3-a456-42661417400"]) {
      const res = await GET(req(bad));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("invalid_id");
    }
    expect(client.from).not.toHaveBeenCalled();
  });

  // M-120: 분당 상한 초과는 429 + Retry-After, 업스트림 호출 없음.
  it("분당 30회를 넘으면 429 + Retry-After", async () => {
    state.supabase = makeClient({ data: { gpx_url: null }, error: null });
    for (let i = 0; i < 30; i++) expect((await GET(req(ID))).status).toBe(404);
    const res = await GET(req(ID));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("rate_limited");
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  // M-120: durunubi.kr이 다른 호스트로 리다이렉트해도 따라가지 않는다(SSRF 가드 우회 방지).
  it("허용 호스트 밖으로의 리다이렉트는 따라가지 않고 502", async () => {
    state.supabase = clientWithGpx();
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(req(ID));
    expect(res.status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
  });

  it("상한(2MB)을 넘는 GPX 본문은 502", async () => {
    state.supabase = clientWithGpx();
    const huge = "x".repeat(2 * 1024 * 1024 + 1);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(huge, { status: 200 })));
    const res = await GET(req(ID));
    expect(res.status).toBe(502);
  });

  // M-121: 같은 id의 두 번째 호출은 DB·upstream fetch를 부르지 않는다.
  it("같은 id를 두 번 부르면 두 번째는 DB 조회·GPX fetch 없이 캐시에서 응답한다", async () => {
    const client = clientWithGpx();
    state.supabase = client;
    const gpx = `<gpx><trk><trkseg><trkpt lat="37.5" lon="127.0"/><trkpt lat="37.6" lon="127.1"/></trkseg></trk></gpx>`;
    const fetchSpy = vi.fn().mockImplementation(async () => new Response(gpx, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const first = await GET(req(ID));
    const second = await GET(req(ID));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("성공 응답에 Cache-Control(s-maxage=86400, stale-while-revalidate)을 싣는다", async () => {
    state.supabase = clientWithGpx();
    const gpx = `<gpx><trk><trkseg><trkpt lat="37.5" lon="127.0"/></trkseg></trk></gpx>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(gpx, { status: 200 })));
    const res = await GET(req(ID));
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=86400",
    );
  });

  it("실패(502)는 캐시되지 않는다 — 다음 호출이 upstream을 다시 시도하고 복구되면 200", async () => {
    state.supabase = clientWithGpx();
    const gpx = `<gpx><trk><trkseg><trkpt lat="37.5" lon="127.0"/></trkseg></trk></gpx>`;
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(new Response(gpx, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const bad = await GET(req(ID));
    expect(bad.status).toBe(502);
    expect(bad.headers.get("Cache-Control")).toBeNull();
    const good = await GET(req(ID));
    expect(good.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
