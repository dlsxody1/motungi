/**
 * Core Web Vitals 수집 엔드포인트.
 *
 * POST /api/vitals  { name, value, rating, id, path }
 *
 * 지금은 서버 로그로만 떨군다. 저장소를 붙이지 않는 이유: 이 단계에서 필요한 건
 * "최적화 전후 p75를 비교할 표본"이고, 그건 로컬·프리뷰에서 몇 번 돌려보면 나온다.
 * 실사용자가 생기면 그때 Supabase 테이블이나 RUM으로 승격한다.
 *
 * sendBeacon은 Content-Type을 text/plain으로 보내므로 req.json()에 의존하지 않고
 * 텍스트로 받아 파싱한다.
 */
import { NextResponse } from "next/server";

/** 수집 대상 지표. 이 외 이름은 버린다(오염·장난 요청 방어). */
const KNOWN_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

/** 한 번에 받는 본문 상한(바이트). 지표 1건은 200B 남짓이라 넉넉한 값. */
const MAX_BODY_BYTES = 2_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (typeof parsed !== "object" || parsed === null) {
    return new NextResponse(null, { status: 400 });
  }

  const { name, value, rating, path } = parsed as Record<string, unknown>;
  if (typeof name !== "string" || !KNOWN_METRICS.has(name)) {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return new NextResponse(null, { status: 400 });
  }

  // CLS는 무단위 소수(0.1 단위가 유의미), 나머지는 ms.
  const shown = name === "CLS" ? value.toFixed(3) : `${Math.round(value)}ms`;
  console.log(
    `[vitals] ${name}=${shown} rating=${String(rating ?? "-")} path=${String(path ?? "-")}`,
  );

  // 계측 응답은 본문이 필요 없다 — 204로 왕복을 최소화한다.
  return new NextResponse(null, { status: 204 });
}
