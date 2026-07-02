/**
 * 온통청년 청년정책 어댑터.
 * 소스: youthcenter.go.kr 오픈API (개인 발급, JSON).
 *
 * subsidy(지원금/청년정책) 카드를 제공한다.
 *
 * ⚠️ 필드명 미확정: 온통청년은 코드정보 Excel로 필드를 배포한다.
 *    인증키 발급 후 실제 응답으로 RawYouthPolicy 필드명을 확정한다.
 *    현재는 공개 문서에서 확인되는 관용 필드명(polyBizSjnm 등) 기준 추정.
 */
import type { Opportunity } from "../types";

/** 온통청년 정책 레코드(추정 스키마). TODO(발급후): 실제 필드명 확정. */
export interface RawYouthPolicy {
  /** 정책 고유 ID — 예: bizId */
  policyId: string;
  /** 정책명 — 예: polyBizSjnm */
  policyName: string;
  /** 정책 요약/지원내용 — 예: polyItcnCn */
  content?: string;
  /** 지원 금액/규모 텍스트 — 예: sporCn */
  supportContent?: string;
  /** 신청 기간(마감 포함 텍스트) — 예: rqutPrdCn */
  applyPeriod?: string;
  /** 사업 운영 기간 — 예: bizPrdCn */
  bizPeriod?: string;
  /** 대상 지역 — 예: polyRlmCd / 지역코드 */
  region?: string;
  /** 신청 사이트 URL — 예: rfcSiteUrla1 */
  applyUrl?: string;
  /** 대상 연령 텍스트 — 예: ageInfo */
  ageInfo?: string;
}

/** "2400000원 지원" | "연 240만원" → 원 단위 number. 실패 시 undefined. */
export function parseSupportKrw(text?: string): number | undefined {
  if (!text) return undefined;
  const s = text.replace(/\s/g, "");
  const eok = s.match(/([\d,.]+)\s*억/);
  if (eok) {
    const n = Number(eok[1]!.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100_000_000) : undefined;
  }
  const man = s.match(/([\d,.]+)\s*만/);
  if (man) {
    const n = Number(man[1]!.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n * 10_000) : undefined;
  }
  const won = s.match(/([\d,]+)\s*원/);
  if (won) {
    const n = Number(won[1]!.replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** "2026-06-01 ~ 2026-07-31" 같은 기간 텍스트에서 마감(끝) ISO date 추출. */
export function extractDeadline(period?: string): string | undefined {
  if (!period) return undefined;
  const dates = period.match(/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/g);
  if (!dates || dates.length === 0) return undefined;
  const last = dates[dates.length - 1]!;
  const iso = last.replace(/[.\/]/g, "-").replace(/-(\d)(?=-|$)/g, "-0$1");
  return iso;
}

export function normalizeYouthPolicy(raw: RawYouthPolicy): Opportunity {
  return {
    id: `youth-policy:${raw.policyId}`,
    source: "youth_policy",
    category: "subsidy",
    title: raw.policyName,
    summary: raw.content || raw.supportContent || raw.policyName,
    estimatedIncomeKrw: parseSupportKrw(raw.supportContent),
    location: raw.region ? { dongName: raw.region } : undefined,
    ctaUrl: raw.applyUrl,
    deadline: extractDeadline(raw.applyPeriod ?? raw.bizPeriod),
    sourceLabel: "온통청년",
  };
}

export function normalizeYouthPolicies(records: RawYouthPolicy[]): Opportunity[] {
  return records.map(normalizeYouthPolicy);
}
