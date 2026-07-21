/**
 * 동네 검색 — 행정동 이름 부분일치. 온보딩 화면 타입어헤드가 경유한다.
 * neighborhoods 테이블은 RLS 공개읽기(0009)이므로 publishable 클라이언트로 조회한다.
 *
 * GET /api/neighborhoods?q=역삼
 *  → { items: [{ admCode, dongName, sigungu, lat, lng }] }
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** 응답 상한 — 드롭다운이 감당할 만큼만. */
const SEARCH_LIMIT = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  // 빈 검색어는 조회 없이 빈 결과 — 전체 424개를 실어보내지 않는다.
  if (!q) return NextResponse.json({ items: [] });

  if (!supabase) {
    return NextResponse.json(
      { error: "not_configured", message: "동네 검색이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  // ILIKE 부분일치. %,_ 등 LIKE 메타문자는 리터럴로 이스케이프.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const { data, error } = await supabase
    .from("neighborhoods")
    .select("adm_code,dong_name,sigungu,lat,lng")
    .ilike("dong_name", pattern)
    .order("dong_name", { ascending: true })
    .limit(SEARCH_LIMIT);

  if (error) {
    return NextResponse.json(
      { error: "query_error", message: "동네 검색에 실패했습니다." },
      { status: 502 },
    );
  }

  const items = (data ?? []).map((r) => ({
    admCode: r.adm_code,
    dongName: r.dong_name,
    sigungu: r.sigungu,
    lat: r.lat,
    lng: r.lng,
  }));
  return NextResponse.json({ items });
}
