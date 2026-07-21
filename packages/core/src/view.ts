/**
 * 화면 표시용 파생값 계산 (순수 함수).
 * DB/어댑터의 Opportunity → 카드 UI가 쓰는 라벨/톤/비용문자열.
 * web·mobile이 동일하게 import 해서 mock과 서버 데이터를 같은 형태로 렌더한다.
 */
import type { DiagnosisAnswers, Energy, TimeSlot } from "./diagnosis";
import type { Opportunity, OpportunityCategory, SourceKind, TimeWindow } from "./types";

/** opportunities 테이블 row (snake_case). Supabase select 결과. */
export interface OpportunityRow {
  id: string;
  source: SourceKind;
  category: OpportunityCategory;
  external_id: string | null;
  title: string;
  summary: string;
  cost_krw: number | null;
  difficulty: number | null;
  dong_name: string | null;
  lat: number | null;
  lng: number | null;
  cta_url: string | null;
  image_url: string | null;
  deadline: string | null;
  source_label: string | null;
  time_start_hour: number | null;
  time_end_hour: number | null;
}

/**
 * HTML 엔티티 디코드. 공공데이터(서울시 문화행사·한눈에보는문화정보) 제목/요약엔
 * `&amp;lt;동물의 세계&amp;gt;`처럼 **이중 이스케이프**된 엔티티가 그대로 저장돼 있다.
 * 적재 어댑터가 정규화하지 않으므로 표시용 변환(rowToOpportunity) 시점에 걷어낸다.
 * 2패스(`&amp;lt;` → `&lt;` → `<`)로 이중까지 처리하며, 순수 텍스트엔 무영향(멱등).
 */
export function decodeHtmlEntities(s: string): string {
  const once = (t: string) =>
    t
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x0*27;/gi, "'")
      .replace(/&nbsp;/g, " ");
  return once(once(s));
}

/** DB row → core Opportunity (camelCase). 스코어링 입력 형태. */
export function rowToOpportunity(r: OpportunityRow): Opportunity {
  return {
    id: r.id,
    source: r.source,
    category: r.category,
    title: decodeHtmlEntities(r.title),
    summary: decodeHtmlEntities(r.summary),
    costKrw: r.cost_krw ?? undefined,
    difficulty: r.difficulty ?? undefined,
    location: {
      dongName: r.dong_name ?? undefined,
      point: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : undefined,
    },
    timeWindow:
      r.time_start_hour != null && r.time_end_hour != null
        ? { startHour: r.time_start_hour, endHour: r.time_end_hour }
        : undefined,
    ctaUrl: r.cta_url ?? undefined,
    imageUrl: r.image_url ?? undefined,
    deadline: r.deadline ?? undefined,
    sourceLabel: r.source_label ?? undefined,
  };
}

/** 카테고리 한글 라벨 (태그용). */
export const CATEGORY_LABEL: Record<OpportunityCategory, string> = {
  culture: "동네 문화·공연",
  active: "동네 산책·운동",
  side_job: "퇴근후 부업",
  class: "클래스·배움",
  food: "동네 먹거리",
  market: "마켓·플리마켓",
};

/** 카테고리별 카드 톤(브랜드/민트 강조). active만 민트. */
export function categoryTone(category: OpportunityCategory): "brand" | "mint" {
  return category === "active" ? "mint" : "brand";
}

/**
 * 비용/보상 표시 문자열.
 * - side_job: 참가비가 아니라 벌이(income) 성격 → "+N만 원"
 * - 0원: "무료"
 * - 그 외: "₩12,000"
 * - 미상(null): "가격 문의"
 * ⚠️ side_job은 '내는 돈'이 아니라 '받는 돈'이라 표시 헤딩(costHeading)이 달라야 한다.
 */
export function costLabel(costKrw: number | null | undefined, category: OpportunityCategory): string {
  if (costKrw == null) return "가격 문의";
  if (category === "side_job") {
    const man = Math.round(costKrw / 10_000);
    return man > 0 ? `+${man}만 원` : `${costKrw.toLocaleString()}원`;
  }
  if (costKrw === 0) return "무료";
  return `₩${costKrw.toLocaleString()}`;
}

/** side_job은 월 단위, 그 외는 1인 기준. */
export function costUnit(category: OpportunityCategory): string {
  return category === "side_job" ? "월" : "1인";
}

/**
 * 비용 값 앞에 붙는 라벨(헤딩).
 * - side_job: 사용자가 '내는 돈'이 아니라 '받는 돈' → "예상 수입"
 * - 그 외: 참여에 드는 비용 → "참가비"
 * (side_job 카드에 "참가비 +48만 원"이 뜨던 의미 충돌을 해소.)
 */
export function costHeading(category: OpportunityCategory): string {
  return category === "side_job" ? "예상 수입" : "참가비";
}

/**
 * 시간대 표시 문자열. 시작=종료면 "14시", 다르면 범위 "14–16시".
 * timeWindow가 없으면 null(호출부에서 렌더 생략).
 */
export function timeRangeLabel(tw: TimeWindow | undefined): string | null {
  if (!tw) return null;
  if (tw.endHour === tw.startHour) return `${tw.startHour}시`;
  return `${tw.startHour}–${tw.endHour}시`;
}

/**
 * 마감 표시. deadline(ISO date, YYYY-MM-DD)과 기준일 today로 D-day를 계산한다.
 * - null: 마감 없음(상시) → null 반환(호출부에서 "상시" 등으로 처리 or 생략)
 * - today > deadline: 마감 지남 → { text, dday: 음수, past: true }
 * - 그 외: { text: "7월 24일", dday: 남은일수, past: false }
 * core 순수성상 현재 시각을 내부에서 읽지 않으므로 today를 주입받는다.
 */
export function deadlineLabel(
  deadline: string | undefined,
  today: string,
): { date: string; dday: number; past: boolean } | null {
  if (!deadline) return null;
  // 로컬 타임존 영향을 피해 UTC 자정 기준으로 일수 차만 센다.
  const d = Date.parse(`${deadline}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(t)) return null;
  const dday = Math.round((d - t) / 86_400_000);
  const [, mm, dd] = deadline.split("-");
  const date = mm && dd ? `${Number(mm)}월 ${Number(dd)}일` : deadline;
  return { date, dday, past: dday < 0 };
}

/** 상세 메타 칩(시간대·난이도). 있는 것만. */
export function buildMeta(opp: Opportunity): { label: string; value: string }[] {
  const meta: { label: string; value: string }[] = [];
  const time = timeRangeLabel(opp.timeWindow);
  if (time) {
    meta.push({ label: "시간대", value: time });
  }
  if (opp.difficulty != null) {
    const level = opp.difficulty <= 0.33 ? "낮음" : opp.difficulty <= 0.66 ? "보통" : "높음";
    meta.push({ label: "강도", value: level });
  }
  return meta;
}

/** 에너지 성향 한글 라벨 (진단 요약·프로필). */
export const ENERGY_LABEL: Record<Energy, string> = {
  drained: "방전형",
  moderate: "보통",
  active: "활동형",
};

/** 가용 시간대 한글 라벨 (진단 요약·필터 칩). */
export const TIMESLOT_LABEL: Record<TimeSlot, string> = {
  weekday_evening: "평일 저녁",
  weekend: "주말",
  flexible: "시간 자유",
};

/** 로그인 사용자 표시 이름. displayName 없으면 회원/게스트. */
export function displayNameOf(
  user?: { displayName?: string } | null,
): string {
  return user?.displayName ?? (user ? "회원" : "게스트");
}

/**
 * 진단 요약 칩 라벨. answers가 없으면 빈 배열.
 * 순서: 관심사(첫 번째) → 시간대 → 에너지 → 비용 선호.
 * 비용 선호는 answers에 없어 opp로 추론(무료/유료), opp 없으면 기본 "무료 위주".
 */
export function diagnosisSummaryChips(
  answers: DiagnosisAnswers | null | undefined,
  opp?: Opportunity,
): string[] {
  if (answers == null) return [];
  const chips: string[] = [];
  const firstInterest = answers.interests[0];
  if (firstInterest) chips.push(CATEGORY_LABEL[firstInterest]);
  chips.push(TIMESLOT_LABEL[answers.timeSlot]);
  chips.push(ENERGY_LABEL[answers.energy]);
  // side_job은 costKrw가 벌이 성격 → '가성비/무료' 대신 수입 톤으로.
  const paid = opp != null && opp.costKrw != null && opp.costKrw > 0;
  chips.push(paid ? (opp!.category === "side_job" ? "용돈벌이" : "가성비 중심") : "무료 위주");
  return chips;
}

/**
 * "왜 이 활동이 맞을까요" 근거 문구 2~3개.
 * 우선순위: 에너지↔난이도 → 관심사 일치 → 저녁 시간대 → 비용.
 * answers가 없으면 opportunity 기반 근거로 자연 폴백. 절대 빈 배열을 반환하지 않는다.
 */
export function whyReasons(
  opp: Opportunity,
  answers: DiagnosisAnswers | null | undefined,
): string[] {
  const reasons: string[] = [];

  // ① 에너지 vs 난이도 (진단·난이도 둘 다 있을 때만).
  if (answers != null && opp.difficulty != null) {
    if (answers.energy === "drained" && opp.difficulty <= 0.33) {
      reasons.push("방전형이어도 부담 없이 즐기기 좋은 가벼운 활동이에요.");
    } else if (answers.energy === "active" && opp.difficulty >= 0.66) {
      reasons.push("활동형에게 딱 맞는 에너지 넘치는 활동이에요.");
    } else {
      reasons.push("오늘 컨디션에 맞춰 부담 없이 시작할 수 있어요.");
    }
  }

  // ② 관심사 일치.
  if (answers != null && answers.interests.includes(opp.category)) {
    reasons.push(`관심 있다고 한 ${CATEGORY_LABEL[opp.category]}, 딱 취향이에요.`);
  }

  // ③ 저녁 시간대.
  if (opp.timeWindow != null && opp.timeWindow.startHour >= 17) {
    reasons.push("퇴근 후 저녁 시간대에 즐기기 좋아요.");
  }

  // ④ 비용(또는 side_job은 수입).
  if (opp.category === "side_job") {
    // side_job의 costKrw는 지출이 아니라 벌이 → '참가비/무료' 문구 금지.
    if (opp.costKrw != null && opp.costKrw > 0) {
      reasons.push(`${costHeading(opp.category)} ${costLabel(opp.costKrw, opp.category)} 받으며 즐길 수 있어요.`);
    }
  } else if (opp.costKrw === 0) {
    reasons.push("예약도 참가비도 없이 그냥 가면 돼요.");
  } else if (opp.costKrw != null && opp.costKrw > 0) {
    reasons.push(`참가비 ${costLabel(opp.costKrw, opp.category)}로 부담 없이 시작할 수 있어요.`);
  }

  // 폴백: 아무 근거도 없으면 카테고리 한 줄.
  if (reasons.length === 0) {
    reasons.push(`우리 동네에서 즐기기 좋은 ${CATEGORY_LABEL[opp.category]}예요.`);
  }

  return reasons.slice(0, 3);
}
