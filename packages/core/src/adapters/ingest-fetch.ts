/**
 * 적재(ingest) 공용 파싱/필터 유틸 (순수 함수, import 없음).
 *
 * Edge Function(Deno)에서 이 파일을 상대경로로 직접 import한다.
 * import가 있으면 Deno 쪽 상대경로 해석이 깨질 수 있으므로 이 파일은
 * 어떤 모듈도 import하지 않는 leaf 모듈로 유지할 것.
 */

/** data.go.kr/공공 API의 XML 응답에서 <item>...</item> 블록별 태그를 레코드로 추출(경량 파서). */
export function parseXmlItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  for (const block of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const inner = block[1]!;
    const rec: Record<string, string> = {};
    for (const tag of inner.matchAll(/<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g)) {
      rec[tag[1]!] = tag[2]!
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
    }
    if (Object.keys(rec).length) items.push(rec);
  }
  return items;
}

/**
 * data.go.kr JSON 응답에서 item 배열 추출.
 * - 정상: response.body.items.item이 배열.
 * - quirk: 결과가 1건뿐이면 item이 배열이 아니라 단일 object로 오는 API가 있음 → 배열로 정규화.
 * - items가 없거나 빈 경우 → 빈 배열.
 */
export function parseJsonItems(json: unknown): Record<string, string>[] {
  const j = json as
    | { response?: { body?: { items?: { item?: unknown } } }; body?: { items?: unknown } }
    | null
    | undefined;
  const items = j?.response?.body?.items?.item ?? j?.body?.items ?? [];
  if (Array.isArray(items)) return items as Record<string, string>[];
  return items ? [items as Record<string, string>] : [];
}

/** 수도권 필터(전국 소스용). dong/지역 문자열이 서울/경기/인천으로 시작하면 true. 미기재(null/undefined)는 통과. */
export function inMetro(dong?: string | null): boolean {
  if (!dong) return true;
  const METRO_PREFIXES = ["서울", "경기", "인천"];
  return METRO_PREFIXES.some((p) => dong.startsWith(p));
}

/** 소스별 적재 결과(성공 건수 또는 에러). ingest 함수의 runSource 반환 형태. */
export interface IngestSourceResult {
  source: string;
  fetched: number;
  upserted: number;
  error?: string;
}

/** 적재 1회 실행의 판정 결과. */
export interface IngestOutcome {
  /** 전 소스가 실패했는가 — 이때는 5xx로 응답하고 purge를 건너뛴다. */
  allFailed: boolean;
  /** 실패한 소스 이름들(부분 실패 표기용). */
  failedSources: string[];
  /** upsert된 총 건수. */
  total: number;
}

/**
 * 적재 결과 판정 (순수 함수).
 *
 * 왜 분리했나: Edge Function 본문은 Deno·네트워크·DB에 묶여 테스트가 어렵다.
 * 반면 "전부 실패했는가 / 몇 건 들어갔는가"는 순수 판정이라 여기서 테스트한다.
 *
 * 이 판정이 중요한 이유(M-040): 예전엔 전 소스가 실패해도 `ok: true`를 반환해
 * **실패가 성공처럼 보였다**. 키 secret이 비어 있는 동안 cron이 매일 "성공"을 반환하며
 * 아무것도 적재하지 않았고 아무도 알아채지 못했다.
 *
 * 빈 배열은 allFailed=false — 실행할 소스가 없었던 것과 전부 실패한 것은 다르다.
 */
export function judgeIngest(results: IngestSourceResult[]): IngestOutcome {
  const failedSources = results.filter((r) => r.error != null).map((r) => r.source);
  return {
    allFailed: results.length > 0 && failedSources.length === results.length,
    failedSources,
    total: results.reduce((s, r) => s + r.upserted, 0),
  };
}

/** key가 이미 등장한 이후 항목을 제거(첫 등장만 유지). */
export function dedupByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
