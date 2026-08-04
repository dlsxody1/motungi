/**
 * 카탈로그 조회 — 브라우저가 Supabase를 직접 부르는 대신 이 핸들러를 경유한다.
 *
 * GET /api/opportunities?lat=&lng=&limit=
 *  → { items: MockOpportunity[], status: CatalogStatus, radiusKm: number | null }
 *
 * 왜 서버로 옮겼나 (실측 2026-08-03, 프로덕션 빌드):
 *  1. 앵커 없는 첫 방문이 300행 **222.8KB**를 하이드레이션 직후 크리티컬 패스에서 받았다.
 *     466행짜리 공용 데이터라 사용자별로 다르지 않은데도 매 방문 DB를 때렸다.
 *  2. 반경 사다리가 클라이언트에 있어 **순차 왕복**이었다. 활동 밀도가 낮은 구는
 *     5km에서 MIN_RESULTS(20)를 못 채워 10km를 다시 받는다 — 도봉구 실측 2회 74.8KB,
 *     그중 첫 13KB는 버려진다. 서버에서 돌면 왕복이 브라우저에 안 보인다.
 *
 * 캐시: 공용 데이터이므로 s-maxage로 CDN/서버 캐시에 태운다. 적재는 하루 1회(pg_cron)라
 * 신선도 요구가 낮다. 좌표는 그리드로 반올림해 캐시 키 폭발을 막는다.
 */
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { fetchOpportunities, type CatalogResult, type MockOpportunity } from "@motungi/core";
import { apiError, reportError } from "@/lib/api-error";
import { supabase } from "@/lib/supabase";

/** 앵커가 있을 때 시도하는 반경(km) — 가까운 것부터. 클라이언트에서 그대로 옮겨왔다. */
const RADII = [5, 10, 20] as const;

/** 이 정도는 나와야 "탐색"이 성립한다고 보는 하한. 못 채우면 다음 반경으로. */
const MIN_RESULTS = 20;

/** 앵커가 없을 때(첫 방문·동네 미선택) 상한. */
const NO_ANCHOR_LIMIT = 300;

/**
 * 좌표 캐시 키 그리드(도). 약 1.1km — 이보다 촘촘하게 캐시를 나눠봐야
 * 반경 5km 결과가 거의 같다. 사용자마다 좌표가 미세하게 달라 캐시가 전부 미스나는 것을 막는다.
 */
const GRID = 0.01;

/** 브라우저 캐시는 짧게(뒤로가기 즉시성), 공유 캐시는 길게. 적재가 하루 1회라 6시간이면 충분하다. */
const CACHE_CONTROL = "public, max-age=60, s-maxage=21600, stale-while-revalidate=86400";

/**
 * 서버측 캐시 수명(초). 적재는 pg_cron으로 **하루 1회**(0007, 06:00 KST)라
 * 그보다 짧게 잡을 이유가 없다. 6시간이면 하루에 최대 4번만 실제 조회가 나간다.
 * Cache-Control의 s-maxage와 같은 값으로 맞춰 CDN·서버가 다른 신선도를 갖지 않게 한다.
 */
const REVALIDATE_SEC = 21_600;

function snap(n: number): number {
  return Math.round(n / GRID) * GRID;
}

/**
 * 조회 실패를 캐시에 남기지 않기 위한 신호.
 *
 * unstable_cache는 **resolve된 값을 그대로 캐시**한다 — 실패(status:"error")를 그냥
 * 반환하면 일시적 장애가 REVALIDATE_SEC(6시간) 동안 고정된다. throw는 캐시되지 않으므로
 * 실패는 던지고 바깥에서 잡아 응답으로 되돌린다.
 */
class CatalogQueryError extends Error {}

/**
 * 카탈로그 조회를 서버측에 메모이제이션한다.
 *
 * Cache-Control(s-maxage)만으로는 부족했다 — 그건 CDN 지시라 Vercel에선 먹지만
 * 그 앞단이 없는 환경에선 아무도 안 받아준다. 실측(2026-08-03) 같은 좌표 3회 연속 호출에
 * ttfb 363/243/232ms로 **매번 DB를 갔다**. 특히 저밀도 좌표는 반경 사다리 때문에
 * 한 번의 요청이 DB 조회 2회라 손해가 두 배다.
 *
 * ⚠️ **인자는 전부 직렬화 가능해야 한다.** unstable_cache는 인자를 JSON.stringify해서
 * 캐시 키를 만든다 — supabase 클라이언트를 넘기면 내부 Timeout 객체의 순환 참조 때문에
 * "Converting circular structure to JSON"으로 매 호출이 터진다(실제로 밟은 함정).
 * 그래서 클라이언트는 인자로도 클로저로도 넘기지 않고, **캐시된 함수 안에서 직접 만든다**.
 *
 * 캐시 키: [ "catalog", today, lat, lng ]. today가 들어가므로 날짜가 바뀌면 자연히
 * 무효화된다 — 마감 지난 활동이 어제 캐시로 되살아나지 않는다.
 */
const loadCatalog = unstable_cache(
  async (
    today: string,
    point: { lat: number; lng: number } | null,
  ): Promise<{ result: CatalogResult; radiusKm: number | null }> => {
    // 클라이언트는 캐시 경계 안에서 만든다(위 주석 참조). 미설정이면 호출부가 이미 걸렀다.
    const client = supabase!;
    if (!point) {
      const result = await fetchOpportunities(client, { today, limit: NO_ANCHOR_LIMIT });
      if (result.status === "error") throw new CatalogQueryError();
      return { result, radiusKm: null };
    }
    // 사다리를 여기서 돈다 — 브라우저는 결과 1개만 받고, 캐시 적중 시 DB 조회는 0회다.
    let last: CatalogResult = { data: [], status: "empty" };
    let radiusKm: number | null = null;
    for (const r of RADII) {
      last = await fetchOpportunities(client, { today, near: { point, radiusKm: r } });
      radiusKm = r;
      // 조회 자체가 실패하면 더 넓혀도 같은 실패다 — 즉시 중단.
      if (last.status === "error") throw new CatalogQueryError();
      if (last.data.length >= MIN_RESULTS) break;
    }
    return { result: last, radiusKm };
  },
  ["catalog"],
  { revalidate: REVALIDATE_SEC, tags: ["opportunities"] },
);

/** 숫자 쿼리 파라미터 파싱 — 유한수만 통과. */
function num(v: string | null): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = num(searchParams.get("lat"));
  const lng = num(searchParams.get("lng"));

  if (!supabase) {
    return apiError("not_configured", "카탈로그가 설정되지 않았습니다.", 503);
  }

  // 마감 지난 활동은 서버에서 제외 — 기준일은 서버 시계를 쓴다(클라 시계 신뢰 안 함).
  const today = new Date().toISOString().slice(0, 10);

  // 좌표가 범위를 벗어나면 앵커 없음으로 취급(위경도 유효성 방어).
  const hasAnchor =
    lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  // 좌표는 캐시 키에 들어가기 전에 그리드로 스냅한다 — 사용자마다 미세하게 다른 좌표가
  // 전부 캐시 미스를 내지 않도록.
  const point = hasAnchor ? { lat: snap(lat), lng: snap(lng) } : null;

  let result: CatalogResult;
  let radiusKm: number | null;
  try {
    ({ result, radiusKm } = await loadCatalog(today, point));
  } catch (err) {
    // 조회 실패 — 캐시에도, 응답 헤더에도 남기지 않는다. 일시적 장애가 6시간 고정되면 안 된다.
    // 그래서 여기만 4xx/5xx가 아닌 200 + status:"error"로 나간다(클라이언트는 status로 판별).
    // 던지지 않고 정상 응답으로 바꾸므로 onRequestError가 못 잡는다 → 직접 남긴다.
    reportError("api/opportunities", err);
    return NextResponse.json({ items: [], status: "error", radiusKm: null });
  }

  const items: MockOpportunity[] = result.data;
  const res = NextResponse.json({ items, status: result.status, radiusKm });
  res.headers.set("Cache-Control", CACHE_CONTROL);
  return res;
}
