/**
 * "왜 맞을까요" LLM 근거 생성(M-044) — 규칙엔진(whyReasons)의 4분기 고정 문구를
 * Gemini Flash 산문으로 보강한다. **폴백이 정상 경로다**: 무료 티어라 429가 흔하고,
 * 그 외에도 키 미설정·상류 5xx·타임아웃·파싱 실패 전부 있을 수 있다 — 전부
 * `{ fallback: true }` 200으로 응답한다(에러로 취급하지 않는다. 페이지는 이미 규칙기반
 * 문구를 렌더하고 있으므로 실패를 알릴 필요가 없다).
 *
 * 입력은 breakdown(스코어링 5축) + 표시용 라벨뿐 — 원문 description/summary는 받지 않는다
 * (packages/core/src/view.ts의 buildWhyReasonsPrompt 문서 참조, 환각 방지).
 *
 * POST /api/why-reasons
 *  body: { category, title, costHeading, costLabel, timeLabel, breakdown }
 *  → { fallback: true, reason: string } | { fallback: false, reasons: string[], usage: { tokens: number } }
 */
import { NextResponse } from "next/server";
import {
  buildWhyReasonsPrompt,
  isOpportunityCategory,
  type WhyReasonsPromptInput,
} from "@motungi/core";
import { apiError, reportError } from "@/lib/api-error";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/** 상세 페이지를 블로킹하지 않는다는 계약(done_when)의 실제 상한. */
const TIMEOUT_MS = 4000;

const BREAKDOWN_KEYS = ["fit", "distance", "time", "difficulty", "cost"] as const;

/** IP당 분당 허용 요청 수 — LLM 호출은 /api/geo보다 비싸므로 더 빡빡하게(M-076). */
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;

/** 자유 입력 필드(title/costHeading/costLabel/timeLabel) 최대 길이 — 프롬프트 남용 방어(M-076). */
const MAX_FIELD_LEN = 200;

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (err) {
    reportError("api/why-reasons", err);
    // 예상 못 한 예외도 폴백 신호로 — 이 엔드포인트는 실패해도 상세 페이지가 죽으면 안 된다.
    logResult({ fallback: true, tokens: 0 });
    return NextResponse.json({ fallback: true, reason: "internal_error" });
  }
}

async function handle(request: Request) {
  const { allowed, retryAfterSec } = checkRateLimit(
    `why-reasons:${clientKey(request)}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    const res = apiError("rate_limited", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
    res.headers.set("Retry-After", String(retryAfterSec));
    return res;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "요청 본문이 올바르지 않습니다.", 400);
  }

  const input = parseInput(body);
  if (!input) {
    return apiError("invalid_body", "필수 필드가 없거나 형식이 올바르지 않습니다.", 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // 서버 전용 시크릿 — 등록 전까지는 정상적으로 폴백만 나간다(M-026/M-040과 같은 패턴).
    logResult({ fallback: true, tokens: 0 });
    return NextResponse.json({ fallback: true, reason: "no_key" });
  }

  const prompt = buildWhyReasonsPrompt(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError(타임아웃) 포함 — 네트워크 레벨 실패는 전부 폴백.
    reportError("api/why-reasons", err);
    logResult({ fallback: true, tokens: 0 });
    return NextResponse.json({ fallback: true, reason: "network_error" });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // 429(무료 티어 rate limit)·5xx 전부 정상 경로 — 에러로 리포트하지 않는다.
    logResult({ fallback: true, tokens: 0 });
    return NextResponse.json({ fallback: true, reason: `upstream_${res.status}` });
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    reportError("api/why-reasons", err);
    logResult({ fallback: true, tokens: 0 });
    return NextResponse.json({ fallback: true, reason: "parse_error" });
  }

  const reasons = extractReasons(json);
  const tokens = extractTokenCount(json);
  if (reasons.length === 0) {
    logResult({ fallback: true, tokens });
    return NextResponse.json({ fallback: true, reason: "empty_response" });
  }

  logResult({ fallback: false, tokens });
  return NextResponse.json({ fallback: false, reasons, usage: { tokens } });
}

/** 문자열이고 MAX_FIELD_LEN 이하인지 — 프롬프트에 실리는 자유 입력 필드 공통 검증(M-076). */
function isBoundedString(v: unknown): v is string {
  return typeof v === "string" && v.length <= MAX_FIELD_LEN;
}

/** body를 WhyReasonsPromptInput으로 좁힌다. breakdown 5축이 전부 number여야 통과. */
function parseInput(body: unknown): WhyReasonsPromptInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const category = b.category;
  if (
    !isOpportunityCategory(category) ||
    !isBoundedString(b.title) ||
    !isBoundedString(b.costHeading) ||
    !isBoundedString(b.costLabel) ||
    (b.timeLabel !== null && !isBoundedString(b.timeLabel))
  ) {
    return null;
  }
  const breakdown = b.breakdown;
  if (typeof breakdown !== "object" || breakdown === null) return null;
  const bd = breakdown as Record<string, unknown>;
  for (const key of BREAKDOWN_KEYS) {
    if (typeof bd[key] !== "number") return null;
  }
  return {
    category,
    title: b.title,
    costHeading: b.costHeading,
    costLabel: b.costLabel,
    timeLabel: (b.timeLabel as string | null) ?? null,
    breakdown: bd as unknown as WhyReasonsPromptInput["breakdown"],
  };
}

/** Gemini generateContent 응답에서 산문을 줄 단위 근거 배열로 뽑는다(최대 3개). */
function extractReasons(json: unknown): string[] {
  const text = (json as GeminiResponse)?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function extractTokenCount(json: unknown): number {
  const n = (json as GeminiResponse)?.usageMetadata?.totalTokenCount;
  return typeof n === "number" ? n : 0;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { totalTokenCount?: number };
}

/** 요청당 토큰수·폴백률 관측용 구조화 로그(done_when). 집계는 로그 파이프라인의 몫. */
function logResult(info: { fallback: boolean; tokens: number }): void {
  console.log(JSON.stringify({ event: "why_reasons", ...info }));
}
