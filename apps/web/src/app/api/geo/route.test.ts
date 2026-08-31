/**
 * /api/geo (좌표 → 행정동 역지오코딩 프록시) 테스트.
 * NAVER Reverse Geocoding fetch를 모킹하고, 6개 분기(400/503/502/404/500/200) +
 * 레이트리밋(M-076)·그리드 스냅 캐시 키(M-076)를 검증한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sentry 전송은 테스트에서 일어나면 안 된다(네트워크·노이즈) — trail-route/route.test.ts와 동일 관례.
vi.mock("@/lib/api-error", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-error")>("@/lib/api-error");
  return { ...actual, reportError: vi.fn() };
});

/**
 * unstable_cache는 Next 요청 컨텍스트(AsyncLocalStorage) 밖에서 못 돈다 — 순수 vitest에선
 * 어떤 코드든 터진다. opportunities/route.test.ts와 동일하게 캐시를 통과시키는 래퍼로 대체해,
 * 캐시 적중 여부가 아니라 핸들러 로직(그리드 스냅·에러 분기)을 검증한다. 캐시가 실제로 업스트림
 * 호출을 줄이는지는 프로덕션 빌드에서 별도로 계측한다 — 여기서는 "인접 좌표가 동일한 스냅 좌표로
 * 업스트림 URL을 만드는가"(=캐시 키가 같은가)까지만 검증한다.
 */
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { __resetRateLimitForTests } from "@/lib/rate-limit";
import { GET } from "./route";

const ENV_KEYS = ["NAVER_MAP_CLIENT_ID", "NAVER_MAP_Client_SECRET"] as const;
const originalEnv: Record<(typeof ENV_KEYS)[number], string | undefined> = {
  NAVER_MAP_CLIENT_ID: process.env.NAVER_MAP_CLIENT_ID,
  NAVER_MAP_Client_SECRET: process.env.NAVER_MAP_Client_SECRET,
};

function setEnv(id?: string, secret?: string) {
  if (id === undefined) delete process.env.NAVER_MAP_CLIENT_ID;
  else process.env.NAVER_MAP_CLIENT_ID = id;
  if (secret === undefined) delete process.env.NAVER_MAP_Client_SECRET;
  else process.env.NAVER_MAP_Client_SECRET = secret;
}

function req(lat: string | null, lng: string | null): Request {
  const params = new URLSearchParams();
  if (lat !== null) params.set("lat", lat);
  if (lng !== null) params.set("lng", lng);
  const qs = params.toString();
  return new Request(qs ? `http://x/api/geo?${qs}` : "http://x/api/geo");
}

/** NAVER 응답 fixture — admcode 결과에 area3(동) 이름이 있는 정상 케이스. */
function naverBody(overrides?: { name?: string; areaName?: string | undefined; codeId?: string }) {
  return {
    results: [
      {
        name: overrides?.name ?? "admcode",
        code: { id: overrides?.codeId ?? "1168010800" },
        region: {
          area1: { name: "서울특별시" },
          area2: { name: "강남구" },
          area3: { name: overrides?.areaName },
        },
      },
    ],
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  // 레이트리밋 버킷은 모듈 전역 상태다 — 리셋 안 하면 이전 테스트의 호출수가 새어 들어와
  // 뒤쪽 테스트가 429를 받는다(테스트 간 독립성 깨짐).
  __resetRateLimitForTests();
});

afterEach(() => {
  setEnv(originalEnv.NAVER_MAP_CLIENT_ID, originalEnv.NAVER_MAP_Client_SECRET);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("GET /api/geo", () => {
  // 쿼리 파라미터 자체가 없으면 URLSearchParams.get()이 null을 주는데, Number(null)은 0(유한값)이라
  // 통과해버린다 — 그래서 검증 문구를 실제 비유한값(문자열)으로 채운다.
  it("lat/lng가 숫자가 아니면 400 invalid_coords", async () => {
    setEnv("id", "secret");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(req("not-a-number", "127.0"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_coords");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lat/lng가 비유한값(Infinity)이어도 400 invalid_coords", async () => {
    setEnv("id", "secret");
    const res = await GET(req("Infinity", "127.0"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_coords");
  });

  it("NAVER_MAP_CLIENT_ID/SECRET이 없으면 503 not_configured", async () => {
    setEnv(undefined, undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(req("37.5556", "126.9019"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("not_configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("키 중 하나만 없어도 503 not_configured", async () => {
    setEnv("id", undefined);
    const res = await GET(req("37.5556", "126.9019"));
    expect(res.status).toBe(503);
  });

  it("NAVER 응답이 !ok면 502 upstream_error", async () => {
    setEnv("id", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));

    const res = await GET(req("37.5556", "126.9019"));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("upstream_error");
  });

  it("일치하는 지역/동 이름이 없으면 404 not_found", async () => {
    setEnv("id", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      ),
    );

    const res = await GET(req("37.5556", "126.9019"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });

  it("결과는 있지만 area3(동) 이름이 없으면 404 not_found", async () => {
    setEnv("id", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(naverBody({ areaName: undefined })), { status: 200 }),
      ),
    );

    const res = await GET(req("37.5556", "126.9019"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });

  it("예상 못 한 예외(fetch 자체가 던짐)는 500 internal_error로 감싼다", async () => {
    setEnv("id", "secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const res = await GET(req("37.5556", "126.9019"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("internal_error");
  });

  it("정상 응답은 200과 함께 admCode/dongName/point를 반환한다", async () => {
    setEnv("id", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(naverBody({ areaName: "역삼동", codeId: "1168010800" })), {
          status: 200,
        }),
      ),
    );

    const res = await GET(req("37.5006", "127.0364"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      admCode: "1168010800",
      dongName: "역삼동",
      point: { lat: 37.5006, lng: 127.0364 },
    });
  });

  it("admcode 결과가 없으면 첫 결과로 fallback한다(legalcode)", async () => {
    setEnv("id", "secret");
    const body = {
      results: [
        {
          name: "legalcode",
          code: { id: "1168010100" },
          region: { area3: { name: "역삼동" } },
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    );

    const res = await GET(req("37.5006", "127.0364"));
    expect(res.status).toBe(200);
    expect((await res.json()).admCode).toBe("1168010100");
  });

  it("스냅 그리드 내 인접 좌표는 동일한 업스트림 요청 좌표를 만든다(캐시 키 동일, M-076)", async () => {
    setEnv("id", "secret");
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(naverBody({ areaName: "역삼동" })), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    // 0.01 그리드 안에서 미세하게 다른 두 좌표 — 둘 다 같은 스냅값으로 반올림돼야 한다.
    await GET(req("37.5006", "127.0364"));
    await GET(req("37.5008", "127.0366"));

    const urls = fetchSpy.mock.calls.map((c) => c[0] as string);
    expect(urls[0]).toBe(urls[1]);
  });

  it("그리드 밖으로 벗어난 좌표는 다른 업스트림 요청 좌표를 만든다", async () => {
    setEnv("id", "secret");
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(naverBody({ areaName: "역삼동" })), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    await GET(req("37.5006", "127.0364"));
    await GET(req("37.52", "127.05"));

    const urls = fetchSpy.mock.calls.map((c) => c[0] as string);
    expect(urls[0]).not.toBe(urls[1]);
  });

  it("응답의 point는 스냅되지 않은 원좌표를 그대로 돌려준다", async () => {
    setEnv("id", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(naverBody({ areaName: "역삼동" })), { status: 200 }),
      ),
    );

    const res = await GET(req("37.5006", "127.0364"));
    expect((await res.json()).point).toEqual({ lat: 37.5006, lng: 127.0364 });
  });
});

describe("GET /api/geo — 레이트리밋(M-076)", () => {
  function reqFrom(ip: string): Request {
    return new Request("http://x/api/geo?lat=37.5556&lng=126.9019", {
      headers: { "x-forwarded-for": ip },
    });
  }

  // mockResolvedValue는 같은 Response 인스턴스를 재사용한다 — body는 한 번만 읽을 수 있으므로
  // 반복 호출 테스트에서는 매번 새 Response를 만드는 mockImplementation을 쓴다.
  function stubOkFetch() {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Response(JSON.stringify(naverBody({ areaName: "역삼동" })), { status: 200 }),
      ),
    );
  }

  it("같은 IP가 분당 허용치를 넘기면 429 rate_limited를 반환한다", async () => {
    setEnv("id", "secret");
    stubOkFetch();

    let last: Response | undefined;
    // RATE_LIMIT(30)을 넘길 때까지 같은 IP로 반복 — 마지막 한 번은 반드시 429여야 한다.
    for (let i = 0; i < 31; i++) {
      last = await GET(reqFrom("203.0.113.1"));
    }

    expect(last!.status).toBe(429);
    expect((await last!.json()).error).toBe("rate_limited");
    expect(last!.headers.get("Retry-After")).toBeTruthy();
  });

  it("서로 다른 IP는 서로의 레이트리밋에 영향을 주지 않는다", async () => {
    setEnv("id", "secret");
    stubOkFetch();

    for (let i = 0; i < 31; i++) {
      await GET(reqFrom("203.0.113.1"));
    }
    // 다른 IP는 아직 한 번도 안 썼으므로 통과해야 한다.
    const res = await GET(reqFrom("203.0.113.2"));
    expect(res.status).toBe(200);
  });
});
