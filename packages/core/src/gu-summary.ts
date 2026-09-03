/**
 * 구(區) 단위 집계 — AEO용 지역 페이지의 데이터 층 (M-073).
 *
 * ## 왜 동(洞)이 아니라 구인가
 * `neighborhoods` 426행 중 418행이 구 중심좌표를 공유한다(`coord_level='sigungu'`).
 * 그래서 반경 집계를 돌리면 종로구 15개 동이 전부 같은 숫자로 나온다 — 동별 페이지를
 * 만들면 235개 중 대다수가 같은 활동을 나열하는 중복 콘텐츠가 된다. 근거·실측은
 * `docs/AEO.md`. 동 단위는 좌표 백필(M-076) 이후로 미룬다.
 *
 * ## 왜 반경이 아니라 dong_name 그룹인가
 * 반경 3km 집계는 종로구를 105건으로 세지만 그중 상당수가 옆 구 활동이다("종로구
 * 페이지인데 중구 활동이 나온다"). `dong_name` 그룹은 74건으로 더 작지만 **"종로구라고
 * 적힌 활동"만** 센다. 페이지에 "74개"라고 쓸 때 그 숫자가 정확히 무엇인지 설명할 수
 * 있어야 하므로 후자를 택했다.
 *
 * ## 이 집계는 그대로 산문이 된다
 * 결과 숫자가 페이지 상단 요약 문장으로 나가고, 그 문장이 답변 엔진에 인용된다.
 * 그래서 **세지 않은 것을 세었다고 말하지 않는 것**이 이 모듈의 핵심 계약이다.
 * 문장을 만드는 `summarySentence`도 여기 둔 이유가 그것이다 — 숫자와 문장이 갈라지면
 * 그 순간 오보가 된다.
 */
import type { MockOpportunity } from "./catalog";
import { normalizeGu } from "./view";

/** 서울 25개 자치구. `neighborhoods.sigungu` distinct와 일치(2026-09-03 실측). */
export const SEOUL_GU = [
  "강남구", "강동구", "강북구", "강서구", "관악구",
  "광진구", "구로구", "금천구", "노원구", "도봉구",
  "동대문구", "동작구", "마포구", "서대문구", "서초구",
  "성동구", "성북구", "송파구", "양천구", "영등포구",
  "용산구", "은평구", "종로구", "중구", "중랑구",
] as const;

export type SeoulGu = (typeof SEOUL_GU)[number];

const SEOUL_GU_SET: ReadonlySet<string> = new Set(SEOUL_GU);

/**
 * 페이지를 만들 최소 활동 수.
 *
 * 이보다 적으면 페이지를 만들지 않는다 — 활동 2~3개짜리 페이지는 검색에서 들어온
 * 사람에게도 실망이고, 그런 얇은 페이지가 쌓이면 사이트 전체 품질 평가에 불리하다.
 * AEO에서 얻는 것보다 잃는 게 크다는 판단(`docs/AEO.md`).
 */
export const GU_MIN_ACTIVITIES = 5;

/** 시도 접두사를 벗겨 서울 자치구인지 판정한다. `"서울 종로구"`도 참. */
export function isSeoulGu(dongName: string | null | undefined): boolean {
  const gu = normalizeGu(dongName);
  return gu !== null && SEOUL_GU_SET.has(gu);
}

/** 구 1개의 집계 결과. 페이지 본문의 모든 숫자가 여기서 나온다. */
export interface GuSummary {
  gu: string;
  /** 마감 안 지난 활동 수. */
  total: number;
  /** 그중 참가비 0원. 비용 미상(null)은 세지 않는다. */
  freeCount: number;
  /** 가장 많은 카테고리의 한글 라벨. */
  topCategoryLabel: string;
}

/**
 * 활동 목록 → 구별 집계. 임계 미달 구는 제외하고 활동 많은 순으로 정렬한다.
 *
 * 호출부가 마감 필터를 이미 걸었다고 가정한다(`fetchOpportunities`의 `today` 옵션) —
 * 여기서 또 거르면 "무엇이 걸러졌는지"가 두 곳에 흩어져 숫자를 설명하기 어려워진다.
 */
export function summarizeGu(items: readonly MockOpportunity[]): GuSummary[] {
  const buckets = new Map<string, MockOpportunity[]>();
  for (const o of items) {
    const gu = normalizeGu(o.location?.dongName);
    // 서울 밖이거나 동네 정보가 없으면 이번 범위 밖이다 — 지어내서 채우지 않는다.
    if (!gu || !SEOUL_GU_SET.has(gu)) continue;
    const bucket = buckets.get(gu);
    if (bucket) bucket.push(o);
    else buckets.set(gu, [o]);
  }

  const out: GuSummary[] = [];
  for (const [gu, group] of buckets) {
    if (group.length < GU_MIN_ACTIVITIES) continue;
    out.push({
      gu,
      total: group.length,
      freeCount: group.filter((o) => o.costKrw === 0).length,
      topCategoryLabel: topCategoryLabelOf(group),
    });
  }
  // 활동이 많은 구부터. 동수면 이름순으로 고정해 빌드마다 순서가 흔들리지 않게 한다.
  return out.sort((a, b) => b.total - a.total || a.gu.localeCompare(b.gu));
}

/** 최빈 카테고리의 라벨. 동수면 먼저 나온 것을 쓴다(정렬 안정성은 total로 이미 확보). */
function topCategoryLabelOf(group: readonly MockOpportunity[]): string {
  const counts = new Map<string, number>();
  for (const o of group) {
    counts.set(o.categoryLabel, (counts.get(o.categoryLabel) ?? 0) + 1);
  }
  let best = "";
  let bestN = -1;
  for (const [label, n] of counts) {
    if (n > bestN) {
      best = label;
      bestN = n;
    }
  }
  return best;
}

/**
 * 집계 → 인용 가능한 한 문장.
 *
 * 답변 엔진이 통째로 집어갈 수 있게 **자족적으로** 쓴다 — 앞뒤 맥락 없이 이 문장만
 * 떼어놔도 "어디의 무엇이 몇 개인지"가 성립해야 한다. 그래서 구 이름을 문장 안에 넣는다.
 *
 * 모든 수치는 인자로 받은 집계에서 나온다. 여기서 계산하거나 추정하지 않는다.
 */
export function summarySentence(s: GuSummary): string {
  // 0건을 "무료 0개"라고 쓰면 없는 걸 있는 것처럼 읽힌다 — 아예 언급하지 않는다.
  const free = s.freeCount > 0 ? ` 이 가운데 ${s.freeCount}개는 참가비가 없다.` : "";
  return `서울 ${s.gu}에서 퇴근 후나 주말에 갈 만한 활동은 지금 ${s.total}개다. 가장 많은 갈래는 ${withCopula(s.topCategoryLabel)}.${free}`;
}

/**
 * 받침 유무에 맞는 서술격 조사를 붙인다 — "공연이다" / "운동이다" vs "산책이다".
 *
 * 카테고리 라벨은 `CATEGORY_LABEL`에서 오므로 값이 정해져 있지만, 하드코딩된 대응표
 * 대신 받침을 계산한다. 라벨이 늘거나 바뀌어도 문장이 깨지지 않아야 하기 때문이다.
 * 조사 오류는 사소해 보여도 인용됐을 때 "기계가 쓴 문장"으로 읽힌다.
 */
function withCopula(label: string): string {
  const last = label.at(-1) ?? "";
  const code = last.charCodeAt(0);
  // 한글 음절 영역이 아니면(영문·숫자 등) 판단하지 않고 안전한 쪽으로 붙인다.
  if (code < 0xac00 || code > 0xd7a3) return `${label}이다`;
  // 한글 음절 = (초성*21 + 중성)*28 + 종성. 나머지가 0이면 받침 없음.
  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return hasBatchim ? `${label}이다` : `${label}다`;
}
