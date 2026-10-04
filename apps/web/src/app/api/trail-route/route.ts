/**
 * 걷기길 경로 — GPX 파일을 받아 지도에 그릴 좌표 배열로 축소해 돌려준다.
 *
 * 프록시인 이유: 두루누비 GPX는 CORS 헤더가 없어 브라우저가 직접 fetch할 수 없다(실측 확인).
 * 축소하는 이유: 원본이 코스당 약 460KB/1500포인트 — 그대로 실어보내면 안 된다(200점 ≈ 4.5KB).
 *
 * GET /api/trail-route?id=<opportunity uuid>
 *  → { points: [[lat, lng], ...], bbox: { minLat, maxLat, minLng, maxLng } }
 *
 * ⚠️ 클라이언트가 준 URL을 fetch하지 않는다 — id로 DB를 조회해 저장된 gpx_url만 쓰고,
 *    호스트도 두루누비로 제한한다(SSRF 방지). 임의 URL 프록시가 되면 내부망 스캔에 쓰인다.
 */
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { fetchGpxText, parseGpxPoints } from "@motungi/core";
import { apiError, reportError } from "@/lib/api-error";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabase";

/** 지도 표시용 상한. 14km 코스에서 약 70m 간격이라 육안으로 원본과 구분되지 않는다. */
const MAX_POINTS = 200;

/** gpx_url로 허용할 호스트. */
const ALLOWED_HOST = "www.durunubi.kr";

/** 클라이언트당 분당 요청 상한 — GPX 한 번이 약 460KB 업스트림 fetch라 /api/geo보다 빡빡하게 잡는다. */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

/** opportunities.id는 uuid — 형식이 아니면 Postgres까지 가 502가 되기 전에 400으로 거절한다. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 경로는 사실상 불변 — 하루 캐시로 460KB 재fetch를 막는다(서버 캐시 수명 = CDN s-maxage). */
const REVALIDATE_SEC = 86_400;
const CACHE_CONTROL = `public, s-maxage=${REVALIDATE_SEC}, stale-while-revalidate=${REVALIDATE_SEC}`;

export async function GET(request: Request) {
  // 예상 못 한 예외가 스택 트레이스째 500으로 나가지 않게 감싼다.
  // 특히 parseGpxPoints는 외부(두루누비) XML을 파싱하므로 깨진 입력에 던질 수 있다.
  try {
    return await handle(request);
  } catch (err) {
    reportError("api/trail-route", err);
    return apiError("internal_error", "일시적인 오류가 발생했습니다.", 500);
  }
}

async function handle(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return apiError("invalid_id", "id가 필요합니다.", 400);
  }
  if (!UUID_RE.test(id)) {
    return apiError("invalid_id", "id 형식이 올바르지 않습니다.", 400);
  }

  const { allowed, retryAfterSec } = checkRateLimit(
    `trail-route:${clientKey(request)}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    const res = apiError("rate_limited", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
    res.headers.set("Retry-After", String(retryAfterSec));
    return res;
  }

  if (!supabase) {
    return apiError("not_configured", "경로 조회가 설정되지 않았습니다.", 503);
  }

  try {
    const route = await loadTrailRoute(id);
    const res = NextResponse.json(route);
    res.headers.set("Cache-Control", CACHE_CONTROL);
    return res;
  } catch (err) {
    if (err instanceof TrailRouteError) {
      return apiError(err.code, err.message, err.status);
    }
    throw err; // 바깥 GET의 catch가 500 JSON으로 감싼다.
  }
}

/**
 * 캐시되면 안 되는 실패 — 던져서 unstable_cache가 결과로 저장하지 않게 한다(geo·catalog와 동일).
 * 일시적 업스트림 오류가 하루 동안 굳으면 안 되고, 404(gpx_url 없음)도 나중에 적재로 생길 수 있다.
 */
class TrailRouteError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface TrailRoute {
  points: ReturnType<typeof parseGpxPoints>;
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

/**
 * id → DB 조회 + GPX fetch(460KB) + 파싱 + 축소를 id 키로 하루 메모이제이션한다(M-121).
 * 예전 `export const revalidate`는 핸들러가 request.url을 읽는 순간 정적 캐시를 켜지 못해
 * 매 요청이 그대로 업스트림을 때렸다 — /api/opportunities·/api/geo와 같은 방식으로 옮겼다.
 */
const loadTrailRoute = unstable_cache(
  async (id: string): Promise<TrailRoute> => {
    if (!supabase) throw new TrailRouteError("not_configured", "경로 조회가 설정되지 않았습니다.", 503);

    const { data, error } = await supabase
      .from("opportunities")
      .select("gpx_url")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      reportError("api/trail-route", error);
      throw new TrailRouteError("query_error", "경로를 불러오지 못했습니다.", 502);
    }
    if (!data?.gpx_url) {
      throw new TrailRouteError("not_found", "이 활동에는 경로 정보가 없습니다.", 404);
    }

    // DB 값이라도 한 번 더 검증한다 — 적재 경로가 바뀌어도 프록시가 무방비가 되지 않게.
    let gpxUrl: URL;
    try {
      gpxUrl = new URL(data.gpx_url);
    } catch {
      // 적재된 값이 깨진 것 — 사용자 잘못이 아니라 데이터 문제라 남긴다.
      reportError("api/trail-route", new Error(`invalid gpx_url in DB: ${data.gpx_url}`));
      throw new TrailRouteError("not_found", "경로 주소가 올바르지 않습니다.", 404);
    }
    if (gpxUrl.protocol !== "https:" || gpxUrl.hostname !== ALLOWED_HOST) {
      throw new TrailRouteError("not_found", "허용되지 않은 경로 주소입니다.", 404);
    }

    let xml: string;
    try {
      // 리다이렉트 홉마다 호스트 재검증 + 5초 타임아웃 + 본문 크기 상한(M-120) — core 공용 규칙.
      xml = await fetchGpxText(gpxUrl.toString());
    } catch (err) {
      reportError("api/trail-route", err);
      throw new TrailRouteError("upstream_error", "경로 파일을 가져오지 못했습니다.", 502);
    }

    // 파싱 실패는 상류(두루누비) 응답 문제 — 500이 아니라 502가 맞다.
    let points: TrailRoute["points"];
    try {
      points = parseGpxPoints(xml, MAX_POINTS);
    } catch (err) {
      reportError("api/trail-route", err);
      throw new TrailRouteError("upstream_error", "경로 파일을 해석하지 못했습니다.", 502);
    }

    if (points.length === 0) {
      throw new TrailRouteError("not_found", "경로 좌표가 없습니다.", 404);
    }

    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    return {
      points,
      bbox: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      },
    };
  },
  ["trail-route"],
  { revalidate: REVALIDATE_SEC },
);
