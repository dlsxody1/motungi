/**
 * 동네 검색 — 행정동 이름 부분일치. 온보딩 화면 타입어헤드가 경유한다.
 * neighborhoods 테이블은 RLS 공개읽기(0009)이므로 publishable 클라이언트로 조회한다.
 *
 * GET /api/neighborhoods?q=역삼
 *  → { items: [{ admCode, dongName, sigungu, lat, lng }] }
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** 응답 상한(묶은 뒤) — 드롭다운이 감당할 만큼만. 강남구 전체(묶으면 17개)도 안 잘린다. */
const SEARCH_LIMIT = 30;

/**
 * 묶기 전 조회 상한. 행정동은 한 동네가 최대 8개(상계동)로 쪼개져 있어,
 * SEARCH_LIMIT개 그룹을 채우려면 그보다 넉넉히 받아야 한다. 426행짜리 테이블이라 비용은 무시할 만하다.
 */
const RAW_LIMIT = 200;

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
  // 쉼표·괄호는 PostgREST or() 문법의 구분자라 남아 있으면 필터가 깨진다 → 함께 제거.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&").replace(/[(),]/g, " ")}%`;
  const { data, error } = await supabase
    .from("neighborhoods")
    .select("adm_code,dong_name,dong_display,sigungu,lat,lng")
    // dong_display: 화면에 보이는 이름 그대로 검색된다(금호동·성수동처럼 '가'가 빠진 이름).
    // dong_base: '가'가 남아 있는 0012 컬럼 — 표시명과 어긋나는 입력도 계속 잡아준다.
    // sigungu: "강남구"처럼 구 이름으로 치면 그 구의 동이 전부 뜬다.
    .or(
      `dong_display.ilike.${pattern},dong_base.ilike.${pattern},sigungu.ilike.${pattern}`,
    )
    // 구로 묶어 보여주기 위해 sigungu 우선 정렬 — 드롭다운 그룹 헤더가 공짜로 나온다.
    .order("sigungu", { ascending: true })
    .order("dong_name", { ascending: true })
    // 묶기 전 상한. 상계동처럼 한 동네가 8개 행정동으로 쪼개져 있어 넉넉히 받아야
    // 묶은 뒤 SEARCH_LIMIT를 채울 수 있다.
    .limit(RAW_LIMIT);

  if (error) {
    return NextResponse.json(
      { error: "query_error", message: "동네 검색에 실패했습니다." },
      { status: 502 },
    );
  }

  // 행정동(개포1~4동)을 사용자가 말하는 단위(개포동)로 묶는다.
  // 같은 (구, 표시명) 그룹은 좌표가 전부 동일하므로(0014 검증) 첫 행을 대표로 써도 정보 손실이 없다.
  const seen = new Map<string, { admCode: string; dongName: string; sigungu: string; lat: number; lng: number }>();
  for (const r of data ?? []) {
    const dongName = r.dong_display ?? r.dong_name;
    const key = `${r.sigungu}|${dongName}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      // admCode는 그룹 대표(첫 행정동)의 것 — 앵커는 좌표로 동작하므로 대표값이면 충분하다.
      admCode: r.adm_code,
      dongName,
      sigungu: r.sigungu,
      lat: r.lat,
      lng: r.lng,
    });
    if (seen.size >= SEARCH_LIMIT) break;
  }
  return NextResponse.json({ items: [...seen.values()] });
}
