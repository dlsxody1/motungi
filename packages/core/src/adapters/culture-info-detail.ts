/**
 * culture_info(한눈에보는문화정보) 산문 백필 — detail2 배치(M-043).
 *
 * period2(목록) 응답엔 산문 설명이 없다(OppRow.description 실측 채움률 0% — adapters.ts
 * mapCultureInfo 주석 참조). 같은 API 패밀리(B553457/cultureinfo)의 detail2 엔드포인트가
 * seq 단건 조회로 산문 필드(contents1)를 준다 — 이 파일은 그 호출을 만들고 파싱하는
 * **순수 로직**만 담는다. fetch/Supabase 호출은 여기 없음 — 실제 I/O는
 * scripts/backfill-culture-info-detail.ts가 이 함수들을 조합해 수행한다.
 *
 * period2 URL 컨벤션의 sibling(supabase/functions/ingest/index.ts:201 부근):
 *   `https://apis.data.go.kr/B553457/cultureinfo/period2?serviceKey=${enc}&numOfRows=10&PageNo=${page}&from=...&to=...`
 * detail2는 목록이 아니라 단건 조회라 numOfRows/PageNo/from/to가 없고 seq만 받는다.
 */
import { parseXmlItems } from "./ingest-fetch";
import { joinDescription } from "./util";
import type { OpportunityRow } from "../view";

/** detail2 응답에서 산문 설명이 들어있는 필드명(백로그 실측: contents1). */
export const DETAIL2_DESCRIPTION_FIELD = "contents1";

/**
 * culture_info detail2 조회 URL 조립 — period2(index.ts:201)와 동일한 base/인증 컨벤션의 sibling.
 * serviceKey는 호출부가 encodeURIComponent 없이 원문으로 넘긴다(period2와 동일하게 여기서 인코딩).
 */
export function buildDetail2Url(serviceKey: string, seq: string | number): string {
  const enc = encodeURIComponent(serviceKey);
  return `https://apis.data.go.kr/B553457/cultureinfo/detail2?serviceKey=${enc}&seq=${encodeURIComponent(String(seq))}`;
}

/**
 * detail2 XML 응답 → 산문 설명 추출.
 * item이 여러 개 와도 seq 단건 조회이므로 첫 item만 본다. HTML/공백 정리는
 * joinDescription(→stripHtml)이 담당 — 다른 어댑터와 동일한 정규화 규칙을 쓴다.
 */
export function parseDetail2Description(
  xmlBody: string,
  field: string = DETAIL2_DESCRIPTION_FIELD,
): string | undefined {
  const [first] = parseXmlItems(xmlBody);
  if (!first) return undefined;
  return joinDescription([first[field]]);
}

/**
 * data.go.kr 쿼터 초과 에러 판정(순수 문자열 매칭).
 * 실측(백로그 노트): 쿼터 초과 시 정상 XML 스키마 대신 OpenAPI_ServiceResponse 에러 포맷으로
 * `LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR`가 온다. 이 문자열 유무만 본다 —
 * 에러 포맷 전체를 파싱하려 하지 않는다(포맷이 바뀌어도 이 판정은 안 깨지도록).
 */
export function isRateLimitError(xmlBody: string): boolean {
  return xmlBody.includes("LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR");
}

/** 백오프 상한(60초). data.go.kr 쿼터는 초/분 단위 창이라 그 이상 대기는 이득이 없다. */
const MAX_RETRY_DELAY_MS = 60_000;

/**
 * 지수 백오프 지연(ms) 계산 — 타이머 없는 순수 산술.
 * attempt(0-based)가 커질수록 baseMs * 2^attempt로 늘어나되 MAX_RETRY_DELAY_MS에서 멈춘다.
 * attempt가 음수로 들어와도(방어) 0번째로 취급한다.
 */
export function nextRetryDelayMs(attempt: number, baseMs: number): number {
  const exp = Math.max(0, attempt);
  return Math.min(baseMs * 2 ** exp, MAX_RETRY_DELAY_MS);
}

/** 백필 대상 판정에 쓰는 row 최소 형태 — opportunities 테이블 row(view.ts OpportunityRow)의 부분집합. */
export type PendingBackfillRow = Pick<OpportunityRow, "external_id" | "source" | "description">;

/**
 * 백필 대상 seq 선택(순수, in-memory) — 최대 limit개.
 *
 * 호출부(scripts/backfill-culture-info-detail.ts)는 이미
 * `source = 'culture_info' AND description IS NULL`로 걸러 조회하지만, 이 함수는 그 전제에
 * 기대지 않고 스스로 재검증한다 — 다른 source가 섞이거나 description이 이미 채워진 행이
 * 실수로 넘어와도 조용히 새 API 호출을 낭비하지 않도록.
 */
export function selectPendingSeqs(rows: PendingBackfillRow[], limit: number): string[] {
  const out: string[] = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    if (r.source !== "culture_info") continue;
    if (r.description != null) continue;
    if (!r.external_id) continue;
    out.push(r.external_id);
  }
  return out;
}

/** 백필 1건의 결과 상태. */
export type BackfillOutcomeStatus = "success" | "failed" | "skipped";

export interface BackfillOutcome {
  status: BackfillOutcomeStatus;
}

/**
 * 백필 실행 결과 집계(순수 리듀서).
 * 부분 실패가 조용히 사라지지 않게 하는 게 목적 — success/failed/skipped를 전부 센다.
 */
export function summarizeBackfillOutcomes(
  outcomes: BackfillOutcome[],
): { success: number; failed: number; skipped: number } {
  const summary = { success: 0, failed: 0, skipped: 0 };
  for (const o of outcomes) summary[o.status]++;
  return summary;
}
