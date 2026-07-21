/**
 * 위치 프록시 — 좌표 → 행정동 역지오코딩 (네이버 클라우드 Maps Reverse Geocoding).
 * NAVER_MAP_CLIENT_ID / NAVER_MAP_Client_SECRET은 서버에만 두고 클라이언트에 노출하지 않는다.
 * 모바일/웹 클라이언트는 좌표만 넘기고 이 엔드포인트를 경유해 행정동을 받는다.
 *
 * GET /api/geo?lat=37.5556&lng=126.9019
 *  → { admCode, dongName, point: { lat, lng } }
 */
import { NextResponse } from "next/server";

// 신형 NAVER Cloud Platform Maps 도메인. 구형 naveropenapi.apigw.ntruss.com은
// 이 앱 자격증명에서 401/210(Permission Denied)로 막힌다.
const NAVER_ENDPOINT =
  "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "invalid_coords", message: "lat, lng 쿼리 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const keyId = clean(process.env.NAVER_MAP_CLIENT_ID);
  const key = clean(process.env.NAVER_MAP_Client_SECRET);
  if (!keyId || !key) {
    return NextResponse.json(
      { error: "not_configured", message: "위치 서비스가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  try {
    // 네이버는 coords=경도,위도 순서. 행정동(admcode) 우선, 법정동(legalcode) fallback.
    const url =
      `${NAVER_ENDPOINT}?coords=${encodeURIComponent(`${lng},${lat}`)}` +
      `&orders=admcode,legalcode&output=json`;
    const res = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": keyId,
        "x-ncp-apigw-api-key": key,
      },
      // 좌표→동 매핑은 자주 안 바뀌므로 하루 캐시.
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream_error", message: "역지오코딩에 실패했습니다." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { results?: NaverResult[] };
    const results = data.results ?? [];

    // admcode(행정동) 항목 우선, 없으면 첫 결과.
    const region = results.find((r) => r.name === "admcode") ?? results[0];
    const dongName = region?.region?.area3?.name;
    if (!region || !dongName) {
      return NextResponse.json(
        { error: "not_found", message: "해당 좌표의 동네를 찾지 못했습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      admCode: region.code?.id ?? null,
      dongName,
      point: { lat, lng },
    });
  } catch {
    return NextResponse.json(
      { error: "internal_error", message: "일시적인 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
