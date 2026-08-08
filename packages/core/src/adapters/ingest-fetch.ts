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
 * 원소가 안전하게 `Record<string, string>`로 다룰 수 있는 "평범한 객체"인가(M-028).
 * null·배열·원시값은 제외 — 이런 값이 매핑 단계까지 새어나가면 mapper가 `.trim()` 등을
 * 문자열 전제 코드에서 던지고, 그 예외가 runSource의 catch까지 올라가 소스 전체 배치를
 * 통째로 버린다. 배열/응답 파싱 단계에서 미리 걷어낸다.
 */
export function isPlainRecord(x: unknown): x is Record<string, string> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * data.go.kr JSON 응답에서 item 배열 추출.
 * - 정상: response.body.items.item이 배열.
 * - quirk: 결과가 1건뿐이면 item이 배열이 아니라 단일 object로 오는 API가 있음 → 배열로 정규화.
 * - items가 없거나 빈 경우 → 빈 배열.
 * - 배열 원소 중 평범한 객체가 아닌 값(문자열/숫자/null/배열)은 걸러낸다(M-028) — 매퍼가
 *   `.trim()` 등을 던지게 두지 않고 여기서 미리 배제한다.
 */
export function parseJsonItems(json: unknown): Record<string, string>[] {
  const j = json as
    | { response?: { body?: { items?: { item?: unknown } } }; body?: { items?: unknown } }
    | null
    | undefined;
  const items = j?.response?.body?.items?.item ?? j?.body?.items ?? [];
  if (Array.isArray(items)) return items.filter(isPlainRecord);
  return isPlainRecord(items) ? [items] : [];
}

/**
 * mapper를 항목별로 실행해 예외를 이 함수 밖으로 새어나가지 않게 한다(M-028).
 *
 * 왜 필요한가: 외부 API 응답은 런타임 shape 검증 없이 신뢰되고 있었다. 한 항목이 예상 밖
 * shape면(예: 문자열 필드에 숫자가 와서 mapper가 `.trim()`을 호출) mapper가 던지고,
 * index.ts의 runSource catch가 **그 소스 전체 배치**를 버렸다 — 나머지 정상 항목까지
 * 같이 사라졌다. 여기서 항목 단위로 격리해 나쁜 항목만 건너뛴다.
 */
export function safeMapItems<T, R>(
  items: T[],
  mapper: (item: T) => R,
): { results: R[]; skipped: number } {
  const results: R[] = [];
  let skipped = 0;
  for (const item of items) {
    try {
      results.push(mapper(item));
    } catch {
      skipped++;
    }
  }
  return { results, skipped };
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

/**
 * cron 시크릿 검증 (순수 함수, M-026).
 *
 * Edge Function은 SERVICE_ROLE 키로 동작해 upsert/delete 권한을 갖는다. 인증 없이 배포되면
 * URL을 아는 누구나 임의 시점에 적재를 트리거할 수 있는 confused-deputy 경로가 된다(M-026).
 * 서버 시크릿이 비어 있으면(미설정) 항상 거부한다 — "시크릿 없음=통과"를 허용하지 않는다.
 */
export function isCronAuthorized(
  serverSecret: string | undefined | null,
  headerValue: string | undefined | null,
): boolean {
  if (!serverSecret) return false;
  return headerValue === serverSecret;
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
