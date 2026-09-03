/**
 * index.ts(Deno Edge Function 엔트리포인트) 테스트 — **Deno 테스트**(`deno test`), vitest 아님.
 * 실행: deno test supabase/functions/ingest/index.test.ts
 * (게이트에는 없다 — adapters.test.ts와 같은 이유, CI에 Deno 러너가 아직 없다.)
 *
 * M-036 — 이 파일이 다루는 범위와 의도적으로 다루지 않는 범위를 먼저 밝힌다.
 *
 * index.ts는 `Deno.serve(async (req) => {...})`를 모듈 최상단에서 호출하고, 그 안에서만
 * `runSource`/`fetchSeoul`/`upsertRows` 등이 쓰인다 — 전부 `export` 없이 파일 스코프에
 * 갇혀 있고, `supabase` 클라이언트도 모듈 로드 시점에 `Deno.env.get(...)!`(non-null
 * assertion)로 즉시 생성된다. 즉 이 파일을 그대로 `import`하면:
 *   1. env가 없으면 `createClient(undefined, undefined, ...)`가 즉시 던지거나,
 *   2. env를 흉내내 넘겨도 `Deno.serve(...)`가 실제 포트를 바인딩하는 부작용이 실행되고,
 *   3. 그렇게 띄운 서버에 진짜 HTTP 요청을 보내지 않는 한 `runSource`에 도달할 방법이 없다
 *      (외부로 내보낸 참조가 전혀 없다).
 * `runSource`를 직접 단위 테스트하려면 export를 붙이는 production 코드 변경이 필요한데,
 * 이번 커밋은 "테스트만 추가, production 코드 변경 없음"이 조건이라 그 변경은 하지 않는다.
 * `deno test`가 이 환경에 없어 위 가설(포트 바인딩이 sanitizer를 통과하는지 등)을 실제로
 * 검증할 수도 없다 — 그래서 index.ts를 직접 import하는 테스트는 작성하지 않았다. 억지로
 * 만들면 fetch/Supabase 클라이언트 전체를 흉내내는 거대하고 깨지기 쉬운 mock이 되거나,
 * 서버를 실제로 띄워야 하는데 그 값어치가 낮다(아키텍트 계획서도 이 경우 스코프를
 * 좁히는 걸 허용했다).
 *
 * 대신 아래 두 가지는 **실제 production 코드/의미를 근거로** 의미 있게 검증한다:
 *   - culture_info 페이지네이션의 누적·중복제거 패턴: index.ts가 실제로 쓰는
 *     `dedupByKey`(core, 이 파일과 동일한 상대경로 import)를 그 사용 패턴 그대로 구동한다.
 *   - 마감(deadline) purge 필터의 의도된 의미: `.not("deadline","is",null).lt("deadline", today)`
 *     가 무엇을 지우고 무엇을 보존해야 하는지의 **명세**를 고정한다. Postgrest 쿼리
 *     빌더 자체를 실행하는 게 아니라 그 필터가 표현하는 판정 규칙을 검증하는
 *     캐릭터라이제이션 테스트임을 밝힌다 — 실제 Postgres 호출을 흉내내지 않는다.
 *
 * **명시적으로 다루지 않음(deferred)**: runSource의 소스별 격리(한 loader가 던져도
 * 다른 소스는 정상 처리되는가)는 위 이유로 이 커밋에서 다루지 않는다. `Promise.all` +
 * 각 `runSource`가 개별 try/catch로 감싸여 있다는 점은 index.ts를 읽고 손으로 확인했다
 * (`async function runSource(...) { try { ... } catch (e) { return { ...error } } }`,
 * 그리고 네 소스 모두 `runSource(...)`로 개별 감싸여 `Promise.all`에 들어간다) — 이 자체는
 * `Promise.all`이 개별 promise의 거부를 전파하지 않고 각 runSource가 자기 예외를 잡아
 * `{error}` 형태로 resolve하므로 한 소스의 실패가 다른 소스의 결과를 막지 않는다는
 * 뜻이다. 코드를 읽고 손으로 추적한 결론이며, 실행 검증은 아니다.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dedupByKey } from "../../../packages/core/src/adapters/ingest-fetch.ts";

// ── culture_info 페이지네이션 누적 패턴(index.ts의 실제 알고리즘을 그대로 구동) ──
//
// index.ts의 culture_info runSource는 페이지마다:
//   1. 그 페이지의 매핑 결과를 candidates에 append
//   2. rows = dedupByKey(candidates, r => r.external_id)  ← 매 페이지마다 전체 재중복제거
//   3. rows.length >= LIMIT이면 루프 종료
// 아래는 그 정확한 형태를 실제 dedupByKey(core, production 함수)로 재현한다.

interface FakeRow {
  external_id: string;
  page: number;
}

function simulateCultureInfoPagination(pages: FakeRow[][], limit: number): FakeRow[] {
  let candidates: FakeRow[] = [];
  let rows: FakeRow[] = [];
  for (const page of pages) {
    if (page.length === 0) break; // 마지막 페이지(index.ts와 동일한 종료 조건)
    candidates = candidates.concat(page);
    rows = dedupByKey(candidates, (r) => r.external_id);
    if (rows.length >= limit) break;
  }
  return rows;
}

Deno.test("M-036: culture_info 페이지네이션 — 같은 external_id가 다음 페이지에 다시 와도 첫 페이지 값이 유지된다", () => {
  const pages: FakeRow[][] = [
    [{ external_id: "a", page: 1 }, { external_id: "b", page: 1 }],
    // data.go.kr 응답이 겹치는 경우(실측에서 실제로 있었다) — "a"가 2페이지에도 나옴.
    [{ external_id: "a", page: 2 }, { external_id: "c", page: 2 }],
  ];
  const rows = simulateCultureInfoPagination(pages, 300);
  assertEquals(rows.length, 3);
  assertEquals(rows.find((r) => r.external_id === "a")?.page, 1); // 첫 등장 유지
  assertEquals(rows.map((r) => r.external_id), ["a", "b", "c"]);
});

Deno.test("M-036: culture_info 페이지네이션 — 빈 페이지(마지막 페이지)를 만나면 이후 페이지를 돌지 않는다", () => {
  const pages: FakeRow[][] = [
    [{ external_id: "a", page: 1 }],
    [], // 마지막 페이지 — index.ts는 여기서 break
    [{ external_id: "z", page: 3 }], // 도달하면 안 됨
  ];
  const rows = simulateCultureInfoPagination(pages, 300);
  assertEquals(rows.map((r) => r.external_id), ["a"]);
});

Deno.test("M-036: culture_info 페이지네이션 — LIMIT에 도달하면 더 이상 페이지를 돌지 않는다", () => {
  // index.ts의 for-루프 조건(rows.length < LIMIT)은 "다음" 페이지를 돌기 전에 검사된다 —
  // 그래서 limit에 도달한 바로 다음 페이지는 처리되지 않는다.
  const pages: FakeRow[][] = [
    [{ external_id: "a", page: 1 }], // 처리 후 rows.length=1 < 2 → 계속
    [{ external_id: "b", page: 2 }], // 처리 후 rows.length=2 >= 2 → 멈춤(3페이지는 안 봄)
    [{ external_id: "z", page: 3 }], // 도달하면 안 됨
  ];
  const rows = simulateCultureInfoPagination(pages, 2);
  assertEquals(rows.map((r) => r.external_id), ["a", "b"]);
});

// ── 마감(deadline) purge 필터의 명세(캐릭터라이제이션) ──────────────────────
//
// index.ts: supabase.from("opportunities").delete().not("deadline","is",null).lt("deadline", today)
// 이 필터는 "deadline이 not null이고 오늘보다 과거인 행만 지운다"는 뜻이다. 아래
// isPurged는 그 판정을 코드로 고정해 둔 것이다 — 실제 Postgrest 호출을 흉내내는 게
// 아니라 "무엇이 지워지고 무엇이 보존돼야 하는가"의 스펙을 못 박아 둔다. deadline은
// core의 toIsoDate가 만드는 YYYY-MM-DD라 문자열 사전식 비교가 날짜 비교와 일치한다.
function isPurged(deadline: string | null, today: string): boolean {
  return deadline != null && deadline < today;
}

Deno.test("M-036: deadline purge 명세 — 과거 deadline은 지워진다", () => {
  assertEquals(isPurged("2026-07-01", "2026-08-08"), true);
});

Deno.test("M-036: deadline purge 명세 — null(상시)은 보존된다", () => {
  assertEquals(isPurged(null, "2026-08-08"), false);
});

Deno.test("M-036: deadline purge 명세 — 미래 deadline은 보존된다", () => {
  assertEquals(isPurged("2026-12-31", "2026-08-08"), false);
});

Deno.test("M-036: deadline purge 명세 — 오늘 날짜(경계값)는 보존된다(< 이므로 당일은 아직 안 지운다)", () => {
  assertEquals(isPurged("2026-08-08", "2026-08-08"), false);
});
