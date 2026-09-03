/**
 * 위치 프록시 — 좌표 → 행정동 역지오코딩 (네이버 클라우드 Maps Reverse Geocoding).
 * NAVER_MAP_CLIENT_ID / NAVER_MAP_Client_SECRET은 서버에만 두고 클라이언트에 노출하지 않는다.
 * 모바일/웹 클라이언트는 좌표만 넘기고 이 엔드포인트를 경유해 행정동을 받는다.
 *
 * GET /api/geo?lat=37.5556&lng=126.9019
 *  → { admCode, dongName, point: { lat, lng } }
 *
 * 좌표는 그리드로 스냅한 뒤 업스트림 URL·캐시 키를 만든다(M-076) — /api/opportunities와
 * 동일한 이유: 사용자마다 미세하게 다른 좌표가 매번 새 NAVER 과금 호출을 강제하지 않도록.
 * 응답의 point는 요청자가 보낸 원좌표 그대로 돌려준다(스냅은 캐시 내부용).
 */
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { apiError, reportError } from "@/lib/api-error";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

// 신형 NAVER Cloud Platform Maps 도메인. 구형 naveropenapi.apigw.ntruss.com은
// 이 앱 자격증명에서 401/210(Permission Denied)로 막힌다.
const NAVER_ENDPOINT =
  "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc";

/** 좌표 캐시 키 그리드(도) — /api/opportunities:GRID와 동일 값. 약 1.1km. */
const GRID = 0.01;

/** 좌표→동 매핑은 자주 안 바뀐다(캐시 수명, /api/opportunities:REVALIDATE_SEC와 동일). */
const REVALIDATE_SEC = 21_600;

/** IP당 분당 허용 요청 수 — 인증 없는 공개 프록시라 과금 API 쿼터 소진 방어용. */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function snap(n: number): number {
  return Math.round(n / GRID) * GRID;
}

/** .env에 우발적 공백/따옴표가 섞여도 안전하도록 정리. */
function clean(v?: string): string | undefined {
  return v?.trim().replace(/^["']|["']$/g, "") || undefined;
}

interface NaverRegionArea {
  name?: string;
}
interface NaverResult {
  name?: string; // "legalcode" | "admcode" | "addr" | "roadaddr"
  code?: { id?: string };
  region?: {
    area1?: NaverRegionArea;
    area2?: NaverRegionArea;
    area3?: NaverRegionArea; // 읍/면/동
  };
}

interface GeoLookup {
  admCode: string | null;
  dongName: string;
}

/** !res.ok(권한/네트워크) — 업스트림 실패. 캐시에 남기지 않는다(재시도가 바로 통해야 함). */
class GeoUpstreamError extends Error {}
/** 결과는 왔지만 동 이름을 못 찾음 — 이것도 캐시에 남기지 않는다(경계 좌표 재시도 대비). */
class GeoNotFoundError extends Error {}

/**
 * 스냅된 좌표 기준 NAVER 역지오코딩 조회를 서버측에 메모이제이션한다(M-076).
 * /api/opportunities:loadCatalog와 동일한 이유 — 인접 좌표가 매번 새 업스트림 호출을
 * 만들지 않도록 그리드 스냅값을 캐시 키로 쓴다. 실패는 던져서 캐시되지 않게 한다.
 */
const loadGeo = unstable_cache(
  async (snappedLat: number, snappedLng: number): Promise<GeoLookup> => {
    const keyId = clean(process.env.NAVER_MAP_CLIENT_ID);
    const key = clean(process.env.NAVER_MAP_Client_SECRET);
    // 캐시 진입 전에 이미 확인됐지만, 캐시된 함수는 독립적으로도 안전해야 한다.
    if (!keyId || !key) throw new GeoUpstreamError("not_configured");

    // 네이버는 coords=경도,위도 순서. 행정동(admcode) 우선, 법정동(legalcode) fallback.
    const url =
      `${NAVER_ENDPOINT}?coords=${encodeURIComponent(`${snappedLng},${snappedLat}`)}` +
      `&orders=admcode,legalcode&output=json`;
    const res = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": keyId,
        "x-ncp-apigw-api-key": key,
      },
    });

    if (!res.ok) {
      // 401/210(Permission Denied)이 여기로 온다 — 도메인·권한 설정 사고를 남겨야 진단이 된다.
      throw new GeoUpstreamError(`NAVER reverse-geocode HTTP ${res.status}`);
    }

    const data = (await res.json()) as { results?: NaverResult[] };
    const results = data.results ?? [];

    // admcode(행정동) 항목 우선, 없으면 첫 결과.
    const region = results.find((r) => r.name === "admcode") ?? results[0];
    const dongName = region?.region?.area3?.name;
    if (!region || !dongName) throw new GeoNotFoundError();

    return { admCode: region.code?.id ?? null, dongName };
  },
  ["geo"],
  { revalidate: REVALIDATE_SEC },
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return apiError("invalid_coords", "lat, lng 쿼리 파라미터가 필요합니다.", 400);
  }

  const { allowed, retryAfterSec } = checkRateLimit(
    `geo:${clientKey(request)}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    const res = apiError("rate_limited", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
    res.headers.set("Retry-After", String(retryAfterSec));
    return res;
  }

  const keyId = clean(process.env.NAVER_MAP_CLIENT_ID);
  const key = clean(process.env.NAVER_MAP_Client_SECRET);
  if (!keyId || !key) {
    return apiError("not_configured", "위치 서비스가 설정되지 않았습니다.", 503);
  }

  try {
    const { admCode, dongName } = await loadGeo(snap(lat), snap(lng));
    return NextResponse.json({ admCode, dongName, point: { lat, lng } });
  } catch (err) {
    if (err instanceof GeoNotFoundError) {
      return apiError("not_found", "해당 좌표의 동네를 찾지 못했습니다.", 404);
    }
    if (err instanceof GeoUpstreamError) {
      reportError("api/geo", err);
      return apiError("upstream_error", "역지오코딩에 실패했습니다.", 502);
    }
    reportError("api/geo", err);
    return apiError("internal_error", "일시적인 오류가 발생했습니다.", 500);
  }
}
