/**
 * 서울시 일자리플러스센터 채용정보 어댑터.
 * 소스: 서울 열린데이터광장 OA-13341 (개인 인증키 즉시 발급, JSON/XML, 공공누리 1유형).
 *
 * 워크넷 대체 소스 — side_job / gig_deal 카드의 본체를 제공한다.
 *
 * ⚠️ 필드명 미확정: 서울 열린데이터광장 상세 페이지가 JS 렌더라 스크래핑 불가.
 *    인증키 발급 후 실제 응답 1건을 받아 아래 RawSeoulJob 필드명을 확정한다.
 *    지금은 계약(무엇을 어디로 매핑할지)만 고정하고, 필드명은 추정값 + TODO 표기.
 */
import type { Opportunity, OpportunityCategory } from "../types";

/**
 * 서울시 채용 API 원본 레코드(추정 스키마).
 * TODO(발급후): 실제 응답 필드명으로 교체. 열린데이터광장 관용상 대문자 스네이크.
 */
export interface RawSeoulJob {
  /** 구인 고유번호 (중복 방지용 external_id) — 예: JO_REQST_NO */
  jobId: string;
  /** 회사명 — 예: CMPNY_NM */
  companyName: string;
  /** 채용 제목/모집 직종 — 예: JO_SJ */
  title: string;
  /** 근무지 주소(도로명/지번) — 예: WORK_PARAR_BASS_ADRES_CN */
  address?: string;
  /** 자치구/동 — 예: WORK_REGION */
  region?: string;
  /** 임금 형태 — 예: HOPE_WAGE_TYPE_NM ("월급"|"시급"|"연봉"…) */
  wageType?: string;
  /** 임금 금액(원, 원문은 문자열/구간일 수 있음) — 예: HOPE_WAGE */
  wage?: string | number;
  /** 고용형태 — 예: EMPLYM_STLE_CMMN_CODE_SE ("파트타임"|"기간제"|"정규직"…) */
  employmentType?: string;
  /** 상세/지원 URL — 예: JO_REGIST_NO 기반 링크 or 별도 필드 */
  detailUrl?: string;
  /** 접수 마감일 — 예: RCEPT_CLOS_NM / DTLDESC */
  deadline?: string;
  /** 갱신/등록일 */
  registeredAt?: string;
}

/** 고용형태 문자열 → 모퉁이 카테고리. 단기/파트/시간제만 카드로 채택. */
const PART_TIME_KEYWORDS = ["파트", "시간제", "단기", "아르바이트", "알바", "일용"];

export function classifyEmployment(employmentType?: string): OpportunityCategory | null {
  if (!employmentType) return "side_job"; // 미상은 부업으로 폭넓게 잡되 후단 필터 가능
  const t = employmentType;
  if (t.includes("일용") || t.includes("단기")) return "gig_deal";
  if (PART_TIME_KEYWORDS.some((k) => t.includes(k))) return "side_job";
  // 정규직 등 풀타임은 모퉁이 컨셉(퇴근 후 짬)과 불일치 → 제외.
  return null;
}

/** "1,200,000원" | "120만" | 1200000 → 원 단위 number. 파싱 실패 시 undefined. */
export function parseWageKrw(wage?: string | number): number | undefined {
  if (wage == null) return undefined;
  if (typeof wage === "number") return Number.isFinite(wage) ? wage : undefined;
  const s = wage.replace(/\s/g, "");
  const manMatch = s.match(/([\d,.]+)\s*만/);
  if (manMatch) {
    const n = Number(manMatch[1]!.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n * 10_000) : undefined;
  }
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 원본 레코드 → Opportunity. 카드로 부적합(풀타임 등)이면 null.
 * 좌표(location.point)는 여기서 채우지 않는다 — 적재 계층이 주소를 Kakao로 지오코딩해 병합.
 */
export function normalizeSeoulJob(raw: RawSeoulJob): Opportunity | null {
  const category = classifyEmployment(raw.employmentType);
  if (category == null) return null;

  return {
    id: `seoul-job:${raw.jobId}`,
    source: "seoul_jobs",
    category,
    title: raw.title,
    summary: buildSummary(raw),
    estimatedIncomeKrw: parseWageKrw(raw.wage),
    location: raw.region || raw.address ? { dongName: raw.region } : undefined,
    ctaUrl: raw.detailUrl,
    deadline: raw.deadline,
    sourceLabel: "서울시 일자리플러스센터",
    fetchedAt: raw.registeredAt,
  };
}

function buildSummary(raw: RawSeoulJob): string {
  const parts = [raw.companyName, raw.region, raw.employmentType].filter(Boolean);
  return parts.join(" · ") || raw.title;
}

/** 목록 응답 → 카드 배열(부적합 제외). */
export function normalizeSeoulJobs(records: RawSeoulJob[]): Opportunity[] {
  return records.map(normalizeSeoulJob).filter((o): o is Opportunity => o != null);
}
