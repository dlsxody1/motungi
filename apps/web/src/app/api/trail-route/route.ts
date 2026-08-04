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
import { NextResponse } from "next/server";
import { parseGpxPoints } from "@motungi/core";
import { apiError, reportError } from "@/lib/api-error";
import { supabase } from "@/lib/supabase";

/** 지도 표시용 상한. 14km 코스에서 약 70m 간격이라 육안으로 원본과 구분되지 않는다. */
const MAX_POINTS = 200;

/** gpx_url로 허용할 호스트. */
const ALLOWED_HOST = "www.durunubi.kr";

/** 경로는 사실상 불변 — 하루 캐시로 460KB 재fetch를 막는다. */
export const revalidate = 86400;

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

  if (!supabase) {
    return apiError("not_configured", "경로 조회가 설정되지 않았습니다.", 503);
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("gpx_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    reportError("api/trail-route", error);
    return apiError("query_error", "경로를 불러오지 못했습니다.", 502);
  }
  if (!data?.gpx_url) {
    return apiError("not_found", "이 활동에는 경로 정보가 없습니다.", 404);
  }

  // DB 값이라도 한 번 더 검증한다 — 적재 경로가 바뀌어도 프록시가 무방비가 되지 않게.
  let gpxUrl: URL;
  try {
    gpxUrl = new URL(data.gpx_url);
  } catch {
    // 적재된 값이 깨진 것 — 사용자 잘못이 아니라 데이터 문제라 남긴다.
    reportError("api/trail-route", new Error(`invalid gpx_url in DB: ${data.gpx_url}`));
    return apiError("not_found", "경로 주소가 올바르지 않습니다.", 404);
  }
  if (gpxUrl.protocol !== "https:" || gpxUrl.hostname !== ALLOWED_HOST) {
    return apiError("not_found", "허용되지 않은 경로 주소입니다.", 404);
  }

  let xml: string;
  try {
    const res = await fetch(gpxUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`두루누비 GPX HTTP ${res.status}`);
    xml = await res.text();
  } catch (err) {
    reportError("api/trail-route", err);
    return apiError("upstream_error", "경로 파일을 가져오지 못했습니다.", 502);
  }

  // 파싱 실패는 상류(두루누비) 응답 문제 — 500이 아니라 502가 맞다.
  let points: ReturnType<typeof parseGpxPoints>;
  try {
    points = parseGpxPoints(xml, MAX_POINTS);
  } catch (err) {
    reportError("api/trail-route", err);
    return apiError("upstream_error", "경로 파일을 해석하지 못했습니다.", 502);
  }

  if (points.length === 0) {
    return apiError("not_found", "경로 좌표가 없습니다.", 404);
  }

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  return NextResponse.json({
    points,
    bbox: {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    },
  });
}
