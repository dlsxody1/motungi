/**
 * /api/trail-route 프록시 테스트.
 *
 * 핵심 회귀: 이 라우트는 외부(두루누비) GPX를 파싱하는데 top-level try/catch가 없어서,
 * 깨진 XML이 오면 parseGpxPoints가 던진 예외가 스택 트레이스째 500으로 나갔다.
 * 아래 "깨진 GPX" 케이스가 그 회귀를 막는다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { GET } from "./route";

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
    const res = await GET(req("abc"));
    expect(res.status).toBe(503);
  });

  it("gpx_url이 없는 활동은 404", async () => {
    state.supabase = makeClient({ data: { gpx_url: null }, error: null });
    const res = await GET(req("abc"));
    expect(res.status).toBe(404);
  });

  // SSRF 방어 — 적재 경로가 바뀌어 임의 호스트가 들어와도 프록시가 되면 안 된다.
  it("허용되지 않은 호스트는 fetch하지 않고 404", async () => {
    state.supabase = clientWithGpx("https://evil.example.com/a.gpx");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(req("abc"));
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("상류 GPX가 실패하면 502", async () => {
    state.supabase = clientWithGpx();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));

    const res = await GET(req("abc"));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("upstream_error");
  });

  // ⬇️ 이 테스트가 고치려던 실제 버그다. 회귀하면 여기서 잡힌다.
  it("깨진 GPX가 와도 던진 500이 아니라 JSON 에러로 응답한다", async () => {
    state.supabase = clientWithGpx();
    // XML이 아닌 쓰레기 — 파서가 던지든 빈 배열을 주든 응답은 반드시 JSON이어야 한다.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<<<not xml at all", { status: 200 })));

    const res = await GET(req("abc"));

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

    const res = await GET(req("abc"));
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

    const res = await GET(req("abc"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("internal_error");
  });
});
