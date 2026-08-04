/**
 * /api/opportunities 테스트.
 *
 * 이 핸들러는 클라이언트에서 옮겨온 **반경 사다리**를 소유한다 — 밀도가 낮은 구에서
 * 5km→10km→20km로 넓히는 판정이 여기서 끝나야 브라우저 왕복이 1회로 유지된다.
 * core의 fetchOpportunities를 모킹해 "몇 번, 어떤 반경으로 물었는가"를 검증한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state: { supabase: unknown } = { supabase: {} };
vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return state.supabase;
  },
}));

/**
 * unstable_cache는 Next 요청 컨텍스트(AsyncLocalStorage) 밖에서 못 돈다 — 순수 vitest에선
 * 어떤 코드든 터진다. 여기서는 **캐시를 통과시키는 래퍼**로 대체해, 캐시 적중 여부가 아니라
 * 핸들러의 로직(반경 사다리·그리드 스냅·실패 처리)을 검증한다.
 * 캐시가 실제로 DB 조회를 줄이는지는 프로덕션 빌드에서 별도로 계측한다.
 */
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const fetchOpportunities = vi.fn();
vi.mock("@motungi/core", () => ({
  fetchOpportunities: (...args: unknown[]) => fetchOpportunities(...args),
}));

import { GET } from "./route";

function req(qs = ""): Request {
  return new Request(`http://x/api/opportunities${qs}`);
}

/** n건짜리 ok 결과. */
function ok(n: number) {
  return { data: Array.from({ length: n }, (_, i) => ({ id: `op-${i}` })), status: "ok" };
}

beforeEach(() => {
  state.supabase = {};
  fetchOpportunities.mockReset();
  // 실패 케이스는 의도적으로 reportError를 태운다 — 기대된 로그라 출력만 죽인다.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/opportunities", () => {
  it("앵커 없으면 반경 없이 한 번만 조회한다(상한 300)", async () => {
    fetchOpportunities.mockResolvedValue(ok(50));

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(fetchOpportunities).toHaveBeenCalledTimes(1);
    const opts = fetchOpportunities.mock.calls[0]![1];
    expect(opts.near).toBeUndefined();
    expect(opts.limit).toBe(300);
    expect(body.items).toHaveLength(50);
    expect(body.radiusKm).toBeNull();
  });

  it("5km에서 충분히 나오면 더 넓히지 않는다", async () => {
    // 역삼동 5km 실측 47건 — 하한(20)을 넘으므로 1회로 끝나야 한다.
    fetchOpportunities.mockResolvedValue(ok(47));

    const res = await GET(req("?lat=37.5006&lng=127.0366"));
    const body = await res.json();

    expect(fetchOpportunities).toHaveBeenCalledTimes(1);
    expect(fetchOpportunities.mock.calls[0]![1].near.radiusKm).toBe(5);
    expect(body.radiusKm).toBe(5);
  });

  it("5km가 모자라면 10km로 넓힌다 — 도봉구 실측 시나리오(17건)", async () => {
    fetchOpportunities.mockResolvedValueOnce(ok(17)).mockResolvedValueOnce(ok(87));

    const res = await GET(req("?lat=37.6688&lng=127.0471"));
    const body = await res.json();

    expect(fetchOpportunities).toHaveBeenCalledTimes(2);
    expect(fetchOpportunities.mock.calls.map((c) => c[1].near.radiusKm)).toEqual([5, 10]);
    expect(body.items).toHaveLength(87);
    expect(body.radiusKm).toBe(10);
  });

  it("최대 반경에서도 모자라면 그 결과를 그대로 쓴다(무한 확대 없음)", async () => {
    fetchOpportunities.mockResolvedValue(ok(3));

    const res = await GET(req("?lat=37.6&lng=127.0"));
    const body = await res.json();

    expect(fetchOpportunities).toHaveBeenCalledTimes(3);
    expect(fetchOpportunities.mock.calls.map((c) => c[1].near.radiusKm)).toEqual([5, 10, 20]);
    expect(body.items).toHaveLength(3);
  });

  it("조회 실패면 즉시 멈춘다 — 넓혀봐야 같은 실패다", async () => {
    fetchOpportunities.mockResolvedValue({ data: [], status: "error" });

    const res = await GET(req("?lat=37.5&lng=127.0"));

    expect(fetchOpportunities).toHaveBeenCalledTimes(1);
    expect((await res.json()).status).toBe("error");
  });

  it("실패 응답은 캐시하지 않는다(일시 장애가 6시간 고정되면 안 된다)", async () => {
    fetchOpportunities.mockResolvedValue({ data: [], status: "error" });

    const res = await GET(req("?lat=37.5&lng=127.0"));

    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  it("성공 응답엔 공유 캐시 헤더를 붙인다", async () => {
    fetchOpportunities.mockResolvedValue(ok(50));

    const res = await GET(req());

    expect(res.headers.get("Cache-Control")).toContain("s-maxage=21600");
  });

  it("조회 실패는 throw로 빠져나가 캐시에 저장되지 않는다(M-041)", async () => {
    // unstable_cache는 resolve된 값을 그대로 캐시한다 — status:"error"를 그냥 반환하면
    // 일시적 장애가 6시간 고정된다. 그래서 실패 경로는 throw여야 한다.
    fetchOpportunities.mockResolvedValue({ data: [], status: "error" });

    const res = await GET(req("?lat=37.5&lng=127.0"));
    const body = await res.json();

    expect(body.status).toBe("error");
    expect(body.items).toEqual([]);
    expect(body.radiusKm).toBeNull();
    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  it("앵커 없는 경로의 실패도 캐시되지 않는다", async () => {
    fetchOpportunities.mockResolvedValue({ data: [], status: "error" });

    const res = await GET(req());

    expect((await res.json()).status).toBe("error");
    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  it("empty(0건)는 정상 결과라 캐시한다 — 그 동네에 활동이 없는 것도 사실이다", async () => {
    fetchOpportunities.mockResolvedValue({ data: [], status: "empty" });

    const res = await GET(req("?lat=37.5&lng=127.0"));

    expect((await res.json()).status).toBe("empty");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=21600");
  });

  it("좌표를 그리드로 반올림해 캐시 키가 폭발하지 않게 한다", async () => {
    fetchOpportunities.mockResolvedValue(ok(50));

    // 미세하게 다른 두 좌표가 같은 격자로 접혀야 한다.
    await GET(req("?lat=37.50061&lng=127.03662"));
    const p1 = fetchOpportunities.mock.calls[0]![1].near.point;
    fetchOpportunities.mockClear();
    await GET(req("?lat=37.50139&lng=127.03738"));
    const p2 = fetchOpportunities.mock.calls[0]![1].near.point;

    expect(p1).toEqual(p2);
  });

  it("망가진 좌표는 앵커 없음으로 취급한다(NaN·범위 밖)", async () => {
    fetchOpportunities.mockResolvedValue(ok(50));

    await GET(req("?lat=abc&lng=127.0"));
    expect(fetchOpportunities.mock.calls[0]![1].near).toBeUndefined();

    fetchOpportunities.mockClear();
    await GET(req("?lat=999&lng=127.0"));
    expect(fetchOpportunities.mock.calls[0]![1].near).toBeUndefined();
  });

  it("마감 필터 기준일(today)은 서버 시계로 주입한다", async () => {
    fetchOpportunities.mockResolvedValue(ok(50));

    await GET(req());

    expect(fetchOpportunities.mock.calls[0]![1].today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("supabase 미설정이면 503", async () => {
    state.supabase = null;

    const res = await GET(req());

    expect(res.status).toBe(503);
    expect(fetchOpportunities).not.toHaveBeenCalled();
  });
});
