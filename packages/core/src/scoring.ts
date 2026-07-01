/**
 * 규칙 기반 스코어링 (기획서 §7).
 * 위치 + 진단 답변을 입력으로 후보 기회를 정렬해 상위 1~3개를 뽑는다.
 *
 * v0 스텁: 가중합 골격만. 실데이터 연동 후 재보정(§11) 전제.
 */
import type { DiagnosisAnswers, Energy, IncomeGoal } from "./diagnosis";
import type { Location, Opportunity } from "./types";

export interface ScoreWeights {
  fit: number; // 적합도(진단↔카테고리)
  distance: number; // 거리(가까울수록 가점)
  difficulty: number; // 난이도(체력 성향 반영)
  income: number; // 목표 수익 부합
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  fit: 0.4,
  distance: 0.2,
  difficulty: 0.2,
  income: 0.2,
};

const ENERGY_DIFFICULTY_TOLERANCE: Record<Energy, number> = {
  drained: 0.3, // 방전형은 쉬운 것 위주
  moderate: 0.6,
  active: 1.0,
};

const INCOME_GOAL_TARGET_KRW: Record<IncomeGoal, number> = {
  under_30: 300_000,
  "30_to_50": 500_000,
  "50_to_100": 1_000_000,
  over_100: 1_500_000,
};

export interface ScoredOpportunity {
  opportunity: Opportunity;
  score: number;
  breakdown: Record<keyof ScoreWeights, number>;
}

/** haversine 거리(km). point 없으면 null. */
function distanceKm(a?: Location, b?: Location): number | null {
  if (!a?.point || !b?.point) return null;
  const R = 6371;
  const dLat = ((b.point.lat - a.point.lat) * Math.PI) / 180;
  const dLng = ((b.point.lng - a.point.lng) * Math.PI) / 180;
  const lat1 = (a.point.lat * Math.PI) / 180;
  const lat2 = (b.point.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** 개별 기회 점수(0~1) 계산. */
export function scoreOpportunity(
  opp: Opportunity,
  answers: DiagnosisAnswers,
  userLocation: Location,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoredOpportunity {
  // 적합도: TODO 진단↔카테고리 매핑 테이블로 대체. 지금은 중립값.
  const fit = 0.5;

  // 거리: 5km 기준 선형 감쇠. 좌표 없으면 중립.
  const d = distanceKm(userLocation, opp.location);
  const distance = d == null ? 0.5 : clamp01(1 - d / 5);

  // 난이도: 성향 허용치 이내면 만점, 넘으면 감점.
  const tolerance = ENERGY_DIFFICULTY_TOLERANCE[answers.energy];
  const difficulty =
    opp.difficulty == null ? 0.5 : clamp01(1 - Math.max(0, opp.difficulty - tolerance));

  // 수익: 목표 대비 근접도(초과는 감점 없음).
  const target = INCOME_GOAL_TARGET_KRW[answers.incomeGoal];
  const income =
    opp.estimatedIncomeKrw == null
      ? 0.5
      : clamp01(Math.min(opp.estimatedIncomeKrw, target) / target);

  const breakdown = { fit, distance, difficulty, income } as const;
  const score =
    fit * weights.fit +
    distance * weights.distance +
    difficulty * weights.difficulty +
    income * weights.income;

  return { opportunity: opp, score, breakdown };
}

/** 후보를 점수순 정렬해 상위 topN(기본 3)개의 "원픽 + 보조" 리스트 반환. */
export function pickTop(
  candidates: Opportunity[],
  answers: DiagnosisAnswers,
  userLocation: Location,
  topN = 3,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoredOpportunity[] {
  return candidates
    .map((c) => scoreOpportunity(c, answers, userLocation, weights))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
