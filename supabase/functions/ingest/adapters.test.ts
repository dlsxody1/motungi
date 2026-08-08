/**
 * 적재 어댑터 테스트 — **Deno 테스트다**(`deno test`), vitest 아님.
 *
 * 왜 여기 있나: 이 디렉토리는 Deno 런타임이고 상대경로 `.ts` import가 규약이다.
 * 같은 파일을 vitest(core 패키지)에서 import하면 tsconfig의 rootDir·
 * allowImportingTsExtensions와 충돌해 워크스페이스 typecheck가 깨진다 — 실제로 깨뜨려봤다.
 * 그래서 런타임 경계를 그대로 두고 테스트도 Deno 쪽에 둔다.
 *
 * 왜 필요한가: **필드 매핑의 SoT는 이 파일**이고 core/adapters는 비권위 미러다.
 * 검증이 없으면 "core 로직은 맞는데 실제 적재는 틀린" 상태가 조용히 유지된다 —
 * 이번 버그가 정확히 그거였다(USE_TRGT가 응답에 100% 오는데 매핑에서 누락).
 *
 * 실행: deno test supabase/functions/ingest/adapters.test.ts
 * (게이트에는 넣지 않았다 — CI에 Deno 러너가 아직 없다. 백로그 감.)
 */
import { assertEquals, assertNotEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapCultureInfo, mapSeoulCulture, mapSeoulJob } from "./adapters.ts";

Deno.test("아동 전용(USE_TRGT)은 적재하지 않는다", () => {
  assertEquals(mapSeoulCulture({ TITLE: "여름 독서교실", USE_TRGT: "어린이" }), null);
});

/** 함정 1 — "이상"은 하한 표기라 성인을 포함한다. 지우면 정상 후보가 잘린다. */
Deno.test("'8세 이상'은 성인도 포함하므로 통과시킨다", () => {
  const row = mapSeoulCulture({
    TITLE: "클래식 콘서트",
    USE_TRGT: "8세 이상 관람 가능",
    CODENAME: "콘서트",
  });
  assertNotEquals(row, null);
});

/** 함정 2 — 제목의 "이상"은 대상 표기가 아니다(인명·전시명). 실측 8건 전부 오탐이었다. */
Deno.test("제목의 '이상'(인명)은 대상 표기로 읽지 않는다", () => {
  assertNotEquals(mapSeoulCulture({ TITLE: "이상원 개인전", CODENAME: "전시/미술" }), null);
});

Deno.test("genre=CODENAME · audience=USE_TRGT 원문을 싣는다", () => {
  const row = mapSeoulCulture({
    TITLE: "재즈의 밤",
    CODENAME: "콘서트",
    USE_TRGT: "성인",
    PRO_TIME: "19:00",
  });
  assertEquals(row?.genre, "콘서트");
  assertEquals(row?.audience, "성인");
  assertEquals(row?.time_start_hour, 19);
});

/**
 * 종료시각 날조 금지. 예전엔 start+2로 추정해 카드에 "10–12시" 같은 사실이 아닌
 * 시간대가 찍혔다. API가 안 주는 값은 null이 정답이다(seoul_jobs도 같은 실수를 고쳤다).
 */
Deno.test("종료시각은 지어내지 않는다(null)", () => {
  const row = mapSeoulCulture({ TITLE: "재즈의 밤", PRO_TIME: "19:00" });
  assertEquals(row?.time_end_hour, null);
});

Deno.test("culture_info — 대상 필드가 없어 제목 폴백으로 거른다", () => {
  assertEquals(mapCultureInfo({ seq: "1", title: "어린이 인형극" }), null);
});

Deno.test("culture_info — genre=realmName, audience는 null(미상)", () => {
  const row = mapCultureInfo({ seq: "2", title: "현대미술전", realmName: "전시" });
  assertEquals(row?.genre, "전시");
  assertEquals(row?.audience, null);
});

/**
 * M-028 — 이 테스트는 "가드가 필요한 이유"를 문서화한다. 매퍼 본문에는 방어 코드를
 * 넣지 않는다(그건 이 클러스터의 결정이 아니다) — 대신 index.ts가 safeMapItems로
 * 호출부에서 항목 단위 격리를 한다(packages/core/src/adapters/ingest-fetch.ts).
 * 이 테스트는 매퍼가 여전히 이런 입력에 던진다는 사실만 고정해 둔다.
 */
Deno.test("M-028: TITLE이 문자열이 아니면(예: 숫자) mapSeoulCulture가 예외를 던진다", () => {
  assertThrows(() => mapSeoulCulture({ TITLE: 42 as unknown as string }));
});

Deno.test("M-028: EMPLYM_STLE_CMMN_MM이 문자열이 아니면 mapSeoulJob이 예외를 던진다", () => {
  assertThrows(() =>
    mapSeoulJob({ EMPLYM_STLE_CMMN_MM: 42 as unknown as string }),
  );
});
