/**
 * 화면 표시용 파생값 계산 (순수 함수).
 * DB/어댑터의 Opportunity → 카드 UI가 쓰는 라벨/톤/비용문자열.
 * web·mobile이 동일하게 import 해서 mock과 서버 데이터를 같은 형태로 렌더한다.
 */
import type { Opportunity, OpportunityCategory, SourceKind } from "./types";

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
  deadline: string | null;
  source_label: string | null;
  time_start_hour: number | null;
  time_end_hour: number | null;
}

/** DB row → core Opportunity (camelCase). 스코어링 입력 형태. */
export function rowToOpportunity(r: OpportunityRow): Opportunity {
  return {
    id: r.id,
    source: r.source,
    category: r.category,
    title: r.title,
    summary: r.summary,
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
 * 비용 표시 문자열.
 * - side_job: 벌이(income) 성격 → "+N만 원"
 * - 0원: "무료"
 * - 그 외: "₩12,000"
 * - 미상(null): "가격 문의"
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

/** 상세 메타 칩(시간대·난이도). 있는 것만. */
export function buildMeta(opp: Opportunity): { label: string; value: string }[] {
  const meta: { label: string; value: string }[] = [];
  if (opp.timeWindow) {
    meta.push({ label: "시간대", value: `${opp.timeWindow.startHour}시` });
  }
  if (opp.difficulty != null) {
    const level = opp.difficulty <= 0.33 ? "낮음" : opp.difficulty <= 0.66 ? "보통" : "높음";
    meta.push({ label: "강도", value: level });
  }
  return meta;
}
