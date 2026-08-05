/**
 * /api/geo (좌표 → 행정동 역지오코딩 프록시) 테스트.
 * NAVER Reverse Geocoding fetch를 모킹하고, 6개 분기(400/503/502/404/500/200)를 검증한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sentry 전송은 테스트에서 일어나면 안 된다(네트워크·노이즈) — trail-route/route.test.ts와 동일 관례.
vi.mock("@/lib/api-error", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-error")>("@/lib/api-error");
  return { ...actual, reportError: vi.fn() };
});

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
});
