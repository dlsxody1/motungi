/**
 * 규칙 기반 스코어링 ("퇴근하고 뭐하지?" 큐레이션).
 * 진단 답변 + 위치 앵커(집·회사)를 입력으로 후보 활동을 정렬해 상위 1~3개를 뽑는다.
 *
 * 축(뼈대): fit(관심사↔카테고리) · distance(2앵커 min) · time(퇴근후 겹침) · difficulty · cost.
 * v0: 규칙 가중합. 실데이터 연동 후 재보정 전제.
 */
import { isKidsOnly } from "./adapters/audience";
import type { DiagnosisAnswers, Energy, TimeSlot } from "./diagnosis";
import type { Location, Opportunity, TimeWindow, UserAnchors } from "./types";

interface ScoreWeights {
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

/**
 * 후보가 **이미 관심 카테고리로 걸러진** 경로용 가중치 (원픽/loading).
 *
 * 문제: `/loading`은 서버에 `categories: answers.interests`를 넘겨 사전 필터를 건다.
 * 그러면 남은 후보가 전부 관심 카테고리라 fit이 1.0 상수가 되고, **점수의 35%가
 * 움직이지 않는다**(실측 2026-09-03: fit σ=0.0000). 남은 0.65 안에서만 순위가 갈리니
 * 변별력이 그만큼 깎인다.
 *
 * 그래서 fit 몫 0.35를 살아있는 네 축에 **비례 배분**한다(0.2:0.15:0.15:0.15 비율 유지).
 * 사전 필터를 푸는 대안도 있었지만, 망원동 10km 실측이 culture 236 / side_job 19라
 * 필터를 풀면 "퇴근하고 뭐하지"에 부업 공고가 원픽으로 뜰 수 있다 — 컨셉이 무너진다.
 *
 * 탐색(explore)은 카테고리 필터 없이 전량을 받으므로 fit이 실제로 변별한다 →
 * 거기선 DEFAULT_WEIGHTS를 그대로 쓴다.
 */
export const PREFILTERED_WEIGHTS: ScoreWeights = {
  fit: 0,
  distance: 0.2 / 0.65,
  time: 0.15 / 0.65,
  difficulty: 0.15 / 0.65,
  cost: 0.15 / 0.65,
};

const ENERGY_DIFFICULTY_TOLERANCE: Record<Energy, number> = {
  drained: 0.3, // 방전형은 가벼운 것 위주
  moderate: 0.6,
  active: 1.0,
};

/**
 * timeSlot별 선호 시간창. time 축 겹침 판정 기준.
 * - weekday_evening: 퇴근 후 코어(18~22시)
 * - weekend: 늦은 오전~저녁 창(12~22시)
 * - flexible: 시간 선호 없음(null) → time 축 중립(0.5)
 *
 * weekend가 10시가 아니라 12시부터인 이유: 10~12시는 어린이 프로그램 피크 구간이다
 * (실측 — 10시 시작이 주간 최대 버킷이고 교육/체험에 쏠려 있다). 주말을 고른 성인이
 * 토요일 오전 10시 독서교실을 원한 게 아니다. 14시엔 정상적인 성인 마티네 공급이
 * 충분해 더 좁히지는 않는다.
 */
const TIMESLOT_WINDOW: Record<TimeSlot, TimeWindow | null> = {
  weekday_evening: { startHour: 18, endHour: 22 },
  weekend: { startHour: 12, endHour: 22 },
  flexible: null,
};

/** cost 스코어 정규화 기준(원). 무료=만점, 이 값 이상이면 0점. */
const COST_CEILING_KRW = 50_000;

interface ScoredOpportunity {
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
export function nearestAnchorKm(anchors: UserAnchors, target?: Location): number | null {
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

/**
 * 아동 전용 활동 배제 — 유일한 하드 필터다.
 *
 * 감점으로는 못 막는다. culture는 cost·difficulty가 전부 null이라 세 축이 0.5로 붕괴하고,
 * 사전 카테고리 필터 때문에 fit도 1.0 상수다. 남은 노이즈만으로 정렬되는 상태에서
 * 감점 몇 점은 어린이 프로그램을 원픽 자리에서 밀어내지 못한다.
 *
 * **culture에만 적용한다.** side_job의 "○○어린이집 · 보육 교사"는 성인이 지원하는
 * 정상 후보다(실측: 제목에 아동 토큰을 가진 49건 중 26건이 어린이집 구인).
 */
function isExcludedByAudience(opp: Opportunity): boolean {
  if (opp.category !== "culture") return false;
  return isKidsOnly(opp.audience, opp.title);
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

  // 시간: 진단 timeSlot의 선호 창과 활동 시간대 겹침 비율.
  // 활동 시간 정보가 없거나 flexible(선호 없음)이면 중립.
  //
  // 표시용 timeWindow가 아니라 scoringWindow를 쓴다 — seoul_culture는 종료시각을 주지
  // 않아 timeWindow가 영원히 undefined였고, 그래서 시작시각을 파싱해두고도 229행의
  // time 축이 0.5로 죽어 있었다(실측 2026-09-03). scoringWindow는 종료가 없으면
  // 기본 지속시간으로 추정하되 그 추정이 화면에는 새지 않는다(view.ts).
  //
  // 분모는 선호 창 폭이 아니라 **활동 길이**다. "이 활동 시간의 몇 %가 내가 원하는
  // 시간대인가"가 맞는 질문이기 때문. 선호 창 폭으로 나누면 활동이 창보다 짧을 때
  // 만점을 받을 수 없어, 19–21시 활동(겹침 2h / 창 4h = 0.5)이 **시간 정보가 아예 없는**
  // 활동의 중립값 0.5와 동점이 됐다 — 아는 것이 모르는 것보다 유리하지 않았다
  // (실측 2026-09-03: 19시시작·20시시작·시간미상이 총점 77로 전부 같았다).
  const prefWindow = TIMESLOT_WINDOW[answers.timeSlot];
  const scoringWindow = opp.scoringWindow ?? opp.timeWindow;
  const activityHours =
    scoringWindow == null ? 0 : scoringWindow.endHour - scoringWindow.startHour;
  const time =
    prefWindow == null || scoringWindow == null || activityHours <= 0
      ? 0.5
      : clamp01(overlapHours(prefWindow, scoringWindow) / activityHours);

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

/**
 * 후보 전체를 점수순 내림차순 정렬(상위 N 자르지 않음).
 * 탐색 목록처럼 카탈로그 전체를 진단 기준으로 랭킹할 때 사용한다.
 * 입력 타입 T(예: 표시용 파생 필드가 붙은 MockOpportunity)를 보존한다.
 */
export function scoreAll<T extends Opportunity>(
  candidates: T[],
  answers: DiagnosisAnswers,
  anchors: UserAnchors,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): (ScoredOpportunity & { opportunity: T })[] {
  return candidates
    .filter((c) => !isExcludedByAudience(c))
    .map((c) => ({ ...scoreOpportunity(c, answers, anchors, weights), opportunity: c }))
    .sort((a, b) => b.score - a.score);
}

/**
 * 후보를 점수순 정렬해 상위 topN(기본 3)개의 "원픽 + 보조" 리스트 반환.
 * scoreAll과 동일하게 입력 타입 T(예: 표시용 파생 필드가 붙은 MockOpportunity)를 보존한다.
 */
export function pickTop<T extends Opportunity>(
  candidates: T[],
  answers: DiagnosisAnswers,
  anchors: UserAnchors,
  topN = 3,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): (ScoredOpportunity & { opportunity: T })[] {
  return scoreAll(candidates, answers, anchors, weights).slice(0, topN);
}
