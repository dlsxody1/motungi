/**
 * backfill-culture-info-detail.ts — culture_info 154행 산문 백필(M-043).
 *
 * period2(목록) 적재는 description을 채우지 않는다(실측 0% — packages/core/src/adapters/
 * culture-info-detail.ts 헤더 참조). 이 스크립트는 opportunities 테이블에서
 * `source = 'culture_info' AND description IS NULL`인 행을 골라, 같은 API 패밀리의
 * detail2 엔드포인트(seq 단건 조회)로 산문(contents1)을 받아 그 행에 한 건씩 되써넣는다.
 *
 * 순수 로직(URL 조립·파싱·쿼터에러 판정·백오프 계산·대상 선정·결과 집계)은 전부
 * packages/core/src/adapters/culture-info-detail.ts SoT — 여기는 그 함수들을 실제
 * fetch + Supabase에 배선하는 얇은 오케스트레이션이다. 이 파일 자체는 vitest 게이트
 * 대상이 아니다(gen-neighborhoods.ts와 동일한 위치 — scripts/는 pnpm 워크스페이스
 * 패키지가 아니라 `pnpm test`/`turbo run typecheck`(apps/*, packages/* 한정) 어느 쪽에도
 * 안 걸린다. tsconfig.base.json/turbo.json에 scripts/ 포함 안 됨을 확인했다).
 *
 * 체크포인트/재개(architect 결정 — 새 마이그레이션 없음):
 *   description을 **행 하나 성공할 때마다 즉시** 써넣는다(끝에 몰아쓰지 않음). 중간에
 *   죽어도 이미 성공한 행은 description이 non-null로 남고, 다음 실행이 같은
 *   `description IS NULL` 쿼리로 자동으로 남은 행만 다시 고른다 — 별도 상태 테이블 불필요.
 *
 * 환경변수(process.env만 신뢰 — CLI 인자로 시크릿을 받지 않는다):
 *   DATA_GO_KR_SERVICE_KEY       — data.go.kr 서비스키(원문, 이 스크립트가 인코딩)
 *   SUPABASE_URL                 — Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_ROLE_KEY    — Supabase service role 키(SERVICE_ROLE 권한 필요, upsert)
 *     (SUPABASE_SECRET_KEY로도 fallback — supabase/functions/ingest/index.ts와 동일 관례)
 *   BACKFILL_LIMIT                — 1회 실행 최대 처리 건수(선택, 기본 50)
 * 키 값은 절대 로그로 찍지 않는다 — 로그에는 건수·seq·상태만 남긴다.
 *
 * 플래그: --dry-run — 실제 DB write/외부 fetch 없이 대상 건수·URL만 만들고 멈춘다.
 *
 * 실행법(중요 — pnpm isolated node-linker라 @supabase/supabase-js가 scripts/에서
 * 기본적으로 안 풀린다. scripts/는 pnpm-workspace.yaml의 워크스페이스 패키지가 아니라
 * 자체 node_modules가 없고, 루트도 hoist하지 않는다 — .npmrc: node-linker=isolated):
 *   NODE_PATH=packages/core/node_modules npx tsx scripts/backfill-culture-info-detail.ts --dry-run
 * (NODE_PATH가 packages/core/node_modules를 추가 탐색 경로로 얹어 bare import를 풀어준다.
 *  gen-neighborhoods.ts는 외부 의존성이 없어 이 트릭이 필요 없었지만, 이 스크립트는
 *  @supabase/supabase-js를 쓰므로 필요하다.)
 *
 * 이 샌드박스는 시크릿·네트워크가 없는 상태로 확인됐다(architect 결정) — 여기서는
 * dry-run조차 DB에 붙지 못한다. 코드 경로가 맞는지가 중요하지, 이 세션에서 실제
 * 실행 결과를 만드는 게 목적이 아니다. 실사용은 사람/QA가 real data.go.kr·Supabase
 * 자격증명이 있는 환경에서 돌린다.
 */
import { createClient } from "@supabase/supabase-js";
import {
  buildDetail2Url,
  isRateLimitError,
  nextRetryDelayMs,
  parseDetail2Description,
  selectPendingSeqs,
  summarizeBackfillOutcomes,
  type BackfillOutcome,
  type PendingBackfillRow,
} from "../packages/core/src/adapters/culture-info-detail";

const DEFAULT_LIMIT = 50;
const MAX_RETRY_ATTEMPTS = 3; // 3회(0,1,2) — 이 이상은 사람이 개입해야 할 지속 장애로 본다.
const BASE_RETRY_MS = 2_000;

interface CultureInfoRow extends PendingBackfillRow {
  id: string;
}

function isDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** DATA_GO_KR_SERVICE_KEY/Supabase 접속 정보를 process.env에서만 읽는다(CLI 인자 폴백 없음). */
function readEnv() {
  const serviceKey = (process.env.DATA_GO_KR_SERVICE_KEY ?? "").trim();
  const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ""
  ).trim();
  const limit = Number(process.env.BACKFILL_LIMIT ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
  return { serviceKey, supabaseUrl, supabaseKey, limit };
}

/**
 * detail2 fetch + 쿼터 재시도. 순수 판정(isRateLimitError/nextRetryDelayMs)은
 * core가 SoT — 여기는 그걸 실제 fetch/setTimeout에 배선만 한다.
 */
async function fetchDescriptionWithRetry(
  serviceKey: string,
  seq: string,
): Promise<string | undefined> {
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    const url = buildDetail2Url(serviceKey, seq);
    const res = await fetch(url);
    const body = await res.text();
    if (isRateLimitError(body)) {
      const delay = nextRetryDelayMs(attempt, BASE_RETRY_MS);
      console.warn(`[backfill] seq=${seq} 쿼터 초과 — ${delay}ms 후 재시도(attempt ${attempt + 1})`);
      await sleep(delay);
      continue;
    }
    if (!res.ok) throw new Error(`detail2 HTTP ${res.status} (seq=${seq})`);
    return parseDetail2Description(body);
  }
  throw new Error(`재시도 ${MAX_RETRY_ATTEMPTS}회 후에도 쿼터 초과 (seq=${seq})`);
}

async function main() {
  const dryRun = isDryRun(process.argv.slice(2));
  const { serviceKey, supabaseUrl, supabaseKey, limit } = readEnv();

  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
  if (!supabaseUrl || !supabaseKey) throw new Error("SUPABASE_URL/SERVICE_ROLE_KEY 없음");

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // 백필 대상 조회 — 체크포인트: description이 채워진 행은 다음 실행에서 자동 제외된다.
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, external_id, source, description")
    .eq("source", "culture_info")
    .is("description", null)
    .limit(limit);
  if (error) throw new Error(`opportunities 조회 실패: ${error.message}`);

  const rows = (data ?? []) as CultureInfoRow[];
  const seqs = selectPendingSeqs(rows, limit);
  const bySeq = new Map(rows.map((r) => [r.external_id, r]));

  if (dryRun) {
    for (const seq of seqs) {
      // 실제 호출 없이 URL만 만들어 경로가 맞는지 확인 — 로그엔 키 값을 남기지 않는다.
      buildDetail2Url(serviceKey, seq);
    }
    console.log(`[backfill] ${seqs.length}건 대상, dry-run — 실제 호출 없음`);
    return;
  }

  const outcomes: BackfillOutcome[] = [];
  for (const seq of seqs) {
    const row = bySeq.get(seq);
    if (!row) {
      outcomes.push({ status: "skipped" });
      continue;
    }
    try {
      const description = await fetchDescriptionWithRetry(serviceKey, seq);
      if (!description) {
        console.warn(`[backfill] seq=${seq} 산문 없음(contents1 빈값) — 스킵`);
        outcomes.push({ status: "skipped" });
        continue;
      }
      // 체크포인트: 행 하나 성공할 때마다 즉시 write. 배치 끝까지 모았다가 한 번에 쓰지 않는다 —
      // 중간에 죽어도 여기까지 쓴 건 description IS NULL 재조회에서 자동으로 빠진다.
      const { error: updateError } = await supabase
        .from("opportunities")
        .update({ description })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      outcomes.push({ status: "success" });
    } catch (e) {
      console.error(`[backfill] seq=${seq} 실패: ${e instanceof Error ? e.message : String(e)}`);
      outcomes.push({ status: "failed" });
    }
  }

  const summary = summarizeBackfillOutcomes(outcomes);
  console.log(
    `[backfill] 완료 — success=${summary.success} failed=${summary.failed} skipped=${summary.skipped}`,
  );
}

main().catch((e) => {
  console.error(`[backfill] 실행 실패: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
