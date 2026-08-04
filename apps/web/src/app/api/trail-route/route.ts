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
import { supabase } from "@/lib/supabase";

/** 지도 표시용 상한. 14km 코스에서 약 70m 간격이라 육안으로 원본과 구분되지 않는다. */
const MAX_POINTS = 200;

/** gpx_url로 허용할 호스트. */
const ALLOWED_HOST = "www.durunubi.kr";

/** 경로는 사실상 불변 — 하루 캐시로 460KB 재fetch를 막는다. */
export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "invalid_id", message: "id가 필요합니다." }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "not_configured", message: "경로 조회가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("gpx_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "query_error", message: "경로를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
  if (!data?.gpx_url) {
    return NextResponse.json(
      { error: "not_found", message: "이 활동에는 경로 정보가 없습니다." },
      { status: 404 },
    );
  }

  // DB 값이라도 한 번 더 검증한다 — 적재 경로가 바뀌어도 프록시가 무방비가 되지 않게.
  let gpxUrl: URL;
  try {
    gpxUrl = new URL(data.gpx_url);
  } catch {
    return NextResponse.json({ error: "not_found", message: "경로 주소가 올바르지 않습니다." }, { status: 404 });
  }
  if (gpxUrl.protocol !== "https:" || gpxUrl.hostname !== ALLOWED_HOST) {
    return NextResponse.json(
      { error: "not_found", message: "허용되지 않은 경로 주소입니다." },
      { status: 404 },
    );
  }

  let xml: string;
  try {
    const res = await fetch(gpxUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch {
    return NextResponse.json(
      { error: "upstream_error", message: "경로 파일을 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const points = parseGpxPoints(xml, MAX_POINTS);
  if (points.length === 0) {
    return NextResponse.json(
      { error: "not_found", message: "경로 좌표가 없습니다." },
      { status: 404 },
    );
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
