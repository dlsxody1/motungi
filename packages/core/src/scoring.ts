/**
 * 규칙 기반 스코어링 ("퇴근하고 뭐하지?" 큐레이션).
 * 진단 답변 + 위치 앵커(집·회사)를 입력으로 후보 활동을 정렬해 상위 1~3개를 뽑는다.
 *
 * 축(뼈대): fit(관심사↔카테고리) · distance(2앵커 min) · time(퇴근후 겹침) · difficulty · cost.
 * v0: 규칙 가중합. 실데이터 연동 후 재보정 전제.
 */
import type { DiagnosisAnswers, Energy } from "./diagnosis";
import type { Location, Opportunity, TimeWindow, UserAnchors } from "./types";

export interface ScoreWeights {
  fit: number; // 적합도(관심사↔카테고리)
  distance: number; // 거리(가까울수록 가점, 2앵커 중 min)
  time: number; // 시간 겹침(퇴근후 18~22시 / timeSlot)
  difficulty: number; // 난이도(에너지 성향 반영)
  cost: number; // 비용(무료·저예산 가점)
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  fit: 0.35,
  distance: 0.2,
  time: 0.15,
  difficulty: 0.15,
  cost: 0.15,
};

const ENERGY_DIFFICULTY_TOLERANCE: Record<Energy, number> = {
  drained: 0.3, // 방전형은 가벼운 것 위주
  moderate: 0.6,
  active: 1.0,
};

/** 퇴근 후 코어 시간대(18~22시). time 축 겹침 판정 기준. */
const AFTERWORK_WINDOW: TimeWindow = { startHour: 18, endHour: 22 };

/** cost 스코어 정규화 기준(원). 무료=만점, 이 값 이상이면 0점. */
const COST_CEILING_KRW = 50_000;

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

/** 집·회사 두 앵커 중 가까운 쪽 거리(km). 둘 다 없으면 null. */
function nearestAnchorKm(anchors: UserAnchors, target?: Location): number | null {
  const dists = [
    distanceKm(anchors.home, target),
    distanceKm(anchors.work, target),
  ].filter((d): d is number => d != null);
  return dists.length ? Math.min(...dists) : null;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** 두 시간대 겹침(시간). 겹치지 않으면 0. */
function overlapHours(a: TimeWindow, b: TimeWindow): number {
  return Math.max(0, Math.min(a.endHour, b.endHour) - Math.max(a.startHour, b.startHour));
}

/** 개별 활동 점수(0~1) 계산. */
export function scoreOpportunity(
  opp: Opportunity,
  answers: DiagnosisAnswers,
  anchors: UserAnchors,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoredOpportunity {
  // 적합도: 관심사에 이 활동 카테고리가 포함되면 만점, 아니면 중립.
  const fit = answers.interests.includes(opp.category) ? 1 : 0.3;

  // 거리: 5km 기준 선형 감쇠, 집·회사 중 가까운 쪽. 좌표 없으면 중립.
  const d = nearestAnchorKm(anchors, opp.location);
  const distance = d == null ? 0.5 : clamp01(1 - d / 5);

  // 시간: 퇴근후 코어(18~22시)와 활동 시간대 겹침 비율. 정보 없으면 중립.
  const time =
    opp.timeWindow == null
      ? 0.5
      : clamp01(
          overlapHours(AFTERWORK_WINDOW, opp.timeWindow) /
            (AFTERWORK_WINDOW.endHour - AFTERWORK_WINDOW.startHour),
        );

  // 난이도: 성향 허용치 이내면 만점, 넘으면 감점.
  const tolerance = ENERGY_DIFFICULTY_TOLERANCE[answers.energy];
  const difficulty =
    opp.difficulty == null ? 0.5 : clamp01(1 - Math.max(0, opp.difficulty - tolerance));

  // 비용: 무료(0원)=만점, COST_CEILING 이상=0점. side_job(벌이 성격)은 감점 대상 아님 → 중립.
  const cost =
    opp.category === "side_job" || opp.costKrw == null
      ? 0.5
      : clamp01(1 - opp.costKrw / COST_CEILING_KRW);

  const breakdown = { fit, distance, time, difficulty, cost } as const;
  const score =
    fit * weights.fit +
    distance * weights.distance +
    time * weights.time +
    difficulty * weights.difficulty +
    cost * weights.cost;

  return { opportunity: opp, score, breakdown };
}

/** 후보를 점수순 정렬해 상위 topN(기본 3)개의 "원픽 + 보조" 리스트 반환. */
export function pickTop(
  candidates: Opportunity[],
  answers: DiagnosisAnswers,
  anchors: UserAnchors,
  topN = 3,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): ScoredOpportunity[] {
  return candidates
    .map((c) => scoreOpportunity(c, answers, anchors, weights))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
