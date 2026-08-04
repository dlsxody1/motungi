/**
 * 서울시 일자리플러스센터 채용정보 어댑터.
 * 소스: 서울 열린데이터광장 OA-13341 (개인 인증키 즉시 발급, JSON/XML, 공공누리 1유형).
 *
 * 워크넷 대체 소스 — side_job(퇴근후 파트/단기) 카드를 제공한다(보조 카테고리).
 *
 * 필드명 확정 완료(2026-08-04, 실응답 GetJobInfo 기준). 확정 과정에서 드러난 함정:
 *  - 고용형태는 EMPLYM_STLE_CMMN_CODE_SE가 **코드값**("J01105")이다. 사람이 읽는 문자열은
 *    EMPLYM_STLE_CMMN_MM("상용직(시간제)") — 코드값으로 분류하면 전량 미분류된다.
 *  - WORK_REGION·HOPE_WAGE_TYPE_NM은 **존재하지 않는다**. 지역은 WORK_PARAR_BASS_ADRES_CN,
 *    임금은 HOPE_WAGE에 "시급 / 10320원 " 형태로 합쳐져 있다.
 *  - 마감일은 RCEPT_CLOS_NM이고 값이 "마감일 (2026-09-26)" 이라 날짜만 뽑아야 한다.
 *  - 상세 URL 필드가 없다 — CTA는 적재 계층에서 구인번호로 합성한다.
 */
import type { Opportunity, OpportunityCategory } from "../types";

/** 서울시 채용 API 원본 레코드(실응답 확정 스키마). 괄호 안이 실제 응답 필드명. */
export interface RawSeoulJob {
  /** 구인 고유번호 (중복 방지용 external_id) — JO_REQST_NO */
  jobId: string;
  /** 회사명 — CMPNY_NM */
  companyName: string;
  /** 채용 제목/모집 직종 — JO_SJ (없으면 JOBCODE_NM) */
  title: string;
  /** 근무지 주소 — WORK_PARAR_BASS_ADRES_CN ("경기 구리시" 수준의 시군구 표기) */
  address?: string;
  /** 자치구/동. 실응답엔 별도 필드가 없어 address와 같은 값이 들어온다. */
  region?: string;
  /** 임금 형태 — 실응답엔 별도 필드 없음. HOPE_WAGE 문자열에 합쳐져 있다. */
  wageType?: string;
  /** 임금 — HOPE_WAGE ("시급 / 10320원 " 형태) */
  wage?: string | number;
  /** 고용형태 문자열 — EMPLYM_STLE_CMMN_MM ("상용직(시간제)"). 코드값 필드가 아니다. */
  employmentType?: string;
  /** 근무시간 — WORK_TIME_NM ("(근무시간) (오후) 4시 00분 ~ (오후) 7시 00분") */
  workTime?: string;
  /** 상세/지원 URL — 실응답엔 없음. 적재 계층에서 구인번호로 합성. */
  detailUrl?: string;
  /** 접수 마감일 — RCEPT_CLOS_NM ("마감일 (2026-09-26)") */
  deadline?: string;
  /** 갱신/등록일 — JO_REG_DT */
  registeredAt?: string;
}

/**
 * 근무 시작·종료 시각(24h). WORK_TIME_NM 표기가 여러 갈래라 두 형식을 모두 읽는다:
 *   "(근무시간) (오후) 2시 00분 ~ (오후) 5시 00분"   → 한글 오전/오후/정오
 *   "월~금 : 15:00 ~ 18:00 (3시간)/주5일근무"        → HH:MM
 * 두 시각을 다 못 읽으면 undefined(추정하지 않는다).
 */
const AMPM_RE = /\((오전|오후|정오|새벽|밤)\)\s*(\d{1,2})\s*시/g;
const HHMM_RE = /(\d{1,2}):(\d{2})/g;

function to24(mark: string, h: number): number {
  if ((mark === "오후" || mark === "밤") && h < 12) return h + 12;
  if (mark === "정오") return 12;
  return h;
}

export function parseShiftHours(time?: string): { start: number; end: number } | undefined {
  if (!time) return undefined;

  const ampm = [...time.matchAll(AMPM_RE)];
  if (ampm.length >= 2) {
    const first = ampm[0]!;
    const last = ampm[ampm.length - 1]!;
    return { start: to24(first[1]!, Number(first[2])), end: to24(last[1]!, Number(last[2])) };
  }

  const hhmm = [...time.matchAll(HHMM_RE)];
  if (hhmm.length >= 2) {
    return { start: Number(hhmm[0]![1]), end: Number(hhmm[hhmm.length - 1]![1]) };
  }

  return undefined;
}

/**
 * "퇴근 후" 근무인가 — 종료 19시 이상.
 *
 * 왜 19시인가: 전량 스캔(24,897건) 결과 시간제의 종료시각은 12시(1,967건)·16시(766)·
 * 17시(597)에 몰려 있고 19시부터 급감한다(176→62→34…). 18시 종료는 "퇴근 후"가 아니라
 * 정시퇴근이라 넣으면 컨셉이 무너진다. 이 컷으로 수도권 시간제 6,294건 중 309건이 남는다.
 *
 * 시간 미상은 **제외**한다 — 모르는 걸 퇴근 후라고 우기면 낮 근무가 섞여 들어온다.
 */
export const AFTER_WORK_END_HOUR = 19;

export function isAfterWorkShift(time?: string): boolean {
  const shift = parseShiftHours(time);
  return shift != null && shift.end >= AFTER_WORK_END_HOUR;
}

/**
 * 근무지 주소 → "시도 시군구"까지만.
 *
 * WORK_PARAR_BASS_ADRES_CN은 시군구 뒤에 상세주소가 구분자 없이 붙어 온다
 * ("경기 구리시대림어린이집", "서울 도봉구802호"). 그대로 dong_name에 넣으면
 * normalizeGu가 접두어만 걷어내므로 "구리시대림어린이집"이 남아 **지역 필터·거리
 * 매칭에 영원히 안 걸린다**. 구/시/군 경계에서 끊어 준다.
 */
const SIDO_RE = /^(서울|경기|인천)/;

/**
 * 수도권 시군구 실목록. 접미사 규칙(첫 '구/시/군'에서 끊기)으로는 "구리시"를 '구'에서
 * 잘라 "경기 구"를 만들어버린다 — 지자체명은 규칙이 아니라 목록으로 끊어야 정확하다.
 * 목록에 없으면 시도까지만 남긴다(없는 지명을 지어내지 않는다).
 */
const METRO_DISTRICTS = [
  // 서울 25
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
  "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
  "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구",
  // 인천 10
  "계양구", "미추홀구", "남동구", "부평구", "연수구", "동구", "서구", "중구",
  "강화군", "옹진군",
  // 경기 31
  "수원시", "성남시", "의정부시", "안양시", "부천시", "광명시", "평택시", "동두천시",
  "안산시", "고양시", "과천시", "구리시", "남양주시", "오산시", "시흥시", "군포시",
  "의왕시", "하남시", "용인시", "파주시", "이천시", "안성시", "김포시", "화성시",
  "광주시", "양주시", "포천시", "여주시", "연천군", "가평군", "양평군",
].sort((a, b) => b.length - a.length); // 긴 것 우선 — "중구"가 "미추홀구"를 가로채지 않게

export function parseWorkRegion(address?: string): string | undefined {
  const s = address?.trim();
  if (!s) return undefined;

  const sido = s.match(SIDO_RE);
  if (!sido) return s.replace(/[.\s]+$/, "") || undefined;

  const rest = s.slice(sido[1]!.length).replace(/^\s+/, "");
  const hit = METRO_DISTRICTS.find((d) => rest.startsWith(d));
  return hit ? `${sido[1]} ${hit}` : sido[1];
}

/** 고용형태 문자열 → 모퉁이 카테고리. 단기/파트/시간제만 카드로 채택. */
const PART_TIME_KEYWORDS = ["파트", "시간제", "단기", "아르바이트", "알바", "일용"];

export function classifyEmployment(employmentType?: string): OpportunityCategory | null {
  if (!employmentType) return "side_job"; // 미상은 부업으로 폭넓게 잡되 후단 필터 가능
  const t = employmentType;
  if (t.includes("일용") || t.includes("단기")) return "side_job";
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
    // side_job은 costKrw가 지출이 아니라 벌이(income) 성격 — UI에서 카테고리로 분기 표기.
    costKrw: parseWageKrw(raw.wage),
    // region 우선, 없으면 address로 폴백(둘 다 없으면 location 생략).
    // 좌표(point)는 적재 계층이 주소를 Kakao로 지오코딩해 채운다.
    location: raw.region || raw.address ? { dongName: raw.region ?? raw.address } : undefined,
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
