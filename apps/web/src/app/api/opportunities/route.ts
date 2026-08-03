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
import { NextResponse } from "next/server";
import { fetchOpportunities, type CatalogResult, type MockOpportunity } from "@motungi/core";
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

function snap(n: number): number {
  return Math.round(n / GRID) * GRID;
}

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
    return NextResponse.json(
      { error: "not_configured", message: "카탈로그가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  // 마감 지난 활동은 서버에서 제외 — 기준일은 서버 시계를 쓴다(클라 시계 신뢰 안 함).
  const today = new Date().toISOString().slice(0, 10);

  // 좌표가 범위를 벗어나면 앵커 없음으로 취급(위경도 유효성 방어).
  const hasAnchor =
    lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  let result: CatalogResult;
  let radiusKm: number | null = null;

  if (!hasAnchor) {
    result = await fetchOpportunities(supabase, { today, limit: NO_ANCHOR_LIMIT });
  } else {
    const point = { lat: snap(lat), lng: snap(lng) };
    // 사다리를 여기서 돈다 — 브라우저는 결과 1개만 받는다.
    let last: CatalogResult = { data: [], status: "empty" };
    for (const r of RADII) {
      last = await fetchOpportunities(supabase, { today, near: { point, radiusKm: r } });
      radiusKm = r;
      // 조회 자체가 실패하면 더 넓혀도 같은 실패다 — 즉시 중단.
      if (last.status === "error" || last.data.length >= MIN_RESULTS) break;
    }
    result = last;
  }

  const items: MockOpportunity[] = result.data;
  const res = NextResponse.json({ items, status: result.status, radiusKm });
  // 조회 실패는 캐시하지 않는다 — 일시적 장애가 6시간 고정되면 안 된다.
  if (result.status !== "error") res.headers.set("Cache-Control", CACHE_CONTROL);
  return res;
}
