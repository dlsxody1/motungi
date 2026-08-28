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
import { mapCultureInfo, mapSeoulCulture, mapSeoulJob, mapSportsFacility, mapTrail } from "./adapters.ts";

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

/**
 * M-029 — packages/core/src/adapters/seoul-culture.ts(죽은 SoT 미러, 삭제됨)에
 * 있던 시나리오 중 이 파일(adapters.test.ts)에 없던 것만 이식한다. joinDescription
 * (PROGRAM/PLAYER/ETC_DESC 원문 보존)은 mapSeoulCulture의 실동작인데 여태 검증이
 * 없었다 — core 미러 쪽에만 테스트가 있었다.
 */
Deno.test("M-029(이식) — PROGRAM·PLAYER·ETC_DESC를 빈 줄로 이어 description에 싣는다", () => {
  const row = mapSeoulCulture({
    TITLE: "재즈의 밤",
    PROGRAM: "크리스마스 캐롤 명곡을 재즈 트리오가 연주",
    PLAYER: "Piano : Kazumi Tateishi",
    ETC_DESC: "8세 이상 입장 가능",
  });
  assertEquals(
    row?.description,
    "크리스마스 캐롤 명곡을 재즈 트리오가 연주\n\nPiano : Kazumi Tateishi\n\n8세 이상 입장 가능",
  );
});

Deno.test("M-029(이식) — PROGRAM/PLAYER/ETC_DESC가 전부 없으면 description은 null", () => {
  const row = mapSeoulCulture({ TITLE: "재즈의 밤" });
  assertEquals(row?.description, null);
});

Deno.test("M-029(이식) — IS_FREE=무료면 USE_FEE와 무관하게 cost_krw=0", () => {
  const row = mapSeoulCulture({
    TITLE: "무료 야외 공연",
    IS_FREE: "무료",
    USE_FEE: "",
  });
  assertEquals(row?.cost_krw, 0);
});

/**
 * M-029 — packages/core/src/adapters/culture-info.ts(죽은 SoT 미러, 삭제됨)의
 * 정규화 happy-path를 이식한다. 이 파일엔 그동안 필드없음/genre 테스트뿐이라
 * deadline(endDate)·좌표(gpsX/gpsY)·이미지(thumbnail)·지역(area+sigungu) 조합은
 * 검증된 적이 없었다.
 */
Deno.test("M-029(이식) — culture_info: endDate→deadline, area+sigungu→dong_name, gpsX/Y→lat/lng, thumbnail→image_url", () => {
  const row = mapCultureInfo({
    seq: "386189",
    title: "미술은행 20주년 특별전",
    endDate: "20260731",
    place: "국립현대미술관 청주관",
    realmName: "전시",
    area: "충북",
    sigungu: "청주시",
    thumbnail: "http://www.culture.go.kr/img.png",
    gpsX: "127.4290",
    gpsY: "36.6357",
  });
  assertEquals(row?.deadline, "2026-07-31");
  assertEquals(row?.dong_name, "충북 청주시");
  assertEquals(row?.lat, 36.6357);
  assertEquals(row?.lng, 127.429);
  assertEquals(row?.image_url, "http://www.culture.go.kr/img.png");
  // 이 소스는 요금/난이도를 API가 안 준다 — 지어내지 않고 null이 정답.
  assertEquals(row?.cost_krw, null);
  assertEquals(row?.difficulty, null);
});

// ── M-036: mapTrail — 실응답 이전엔 이 매퍼에 테스트가 0건이었다. ────────────

Deno.test("M-036: mapTrail — 걷기길을 active로 정규화하고 코스 안내(course_start/end/gpx_url)를 채운다", () => {
  const row = mapTrail({
    crsIdx: "T_CRS_MNG0000005117",
    crsKorNm: "남파랑길 2코스",
    crsLevel: "2",
    crsDstnc: "19",
    sigun: "부산 중구",
    crsSummary: "부산역에서 시작하여 걷기 좋은 봉래산을 지나는 코스",
    travelerinfo: "- 시점: 부산역<br>- 종점: 봉래산 입구",
    crsTotlRqrmHour: "450",
    crsCycle: "편도(비순환)",
    gpxpath: "https://www.durunubi.kr/gpx/x.gpx",
  });
  assertEquals(row?.source, "trail");
  assertEquals(row?.category, "active");
  assertEquals(row?.external_id, "T_CRS_MNG0000005117");
  assertEquals(row?.cost_krw, 0); // 걷기길은 무료
  assertEquals(row?.difficulty, 0.5); // crsLevel 2 → (2-1)/2
  assertEquals(row?.dong_name, "부산 중구");
  assertEquals(row?.course_start, "부산역");
  assertEquals(row?.course_end, "봉래산 입구");
  assertEquals(row?.duration_min, 450);
  assertEquals(row?.is_loop, false); // "비순환" 표기라 순환 아님
  assertEquals(row?.gpx_url, "https://www.durunubi.kr/gpx/x.gpx");
  // 좌표는 GPX 안에만 있다 — index.ts의 enrichTrailCoords가 나중에 채운다. 매퍼 단독으론 null.
  assertEquals(row?.lat, null);
  assertEquals(row?.lng, null);
});

Deno.test("M-036: mapTrail — crsIdx 또는 코스명 없으면 제외", () => {
  assertEquals(mapTrail({ crsIdx: "", crsKorNm: "코스명" }), null);
  assertEquals(mapTrail({ crsIdx: "id", crsKorNm: "" }), null);
});

// ── M-036: mapSportsFacility — 미배선(⚠️ index.ts에 아직 연결 안 됨)이지만 매퍼 자체는 테스트 가능. ──

Deno.test("M-036: mapSportsFacility — 체육시설을 active로 정규화한다", () => {
  const row = mapSportsFacility({
    FCLTY_SN: "1234",
    FCLTY_NM: "망원한강공원 수영장",
    FCLTY_TY_NM: "수영장",
    RDNMADR: "서울특별시 마포구 마포나루길 467",
    SIGNGU_NM: "마포구",
    LATITUDE: "37.5556",
    LONGITUDE: "126.9019",
    UTILIZA_CHRGE: "1회 5,000원",
    HMPG_URL: "https://hangang.seoul.go.kr/mangwon",
  });
  assertEquals(row?.source, "sports_facility");
  assertEquals(row?.category, "active");
  assertEquals(row?.external_id, "1234");
  assertEquals(row?.cost_krw, 5000);
  assertEquals(row?.dong_name, "마포구");
  assertEquals(row?.lat, 37.5556);
  assertEquals(row?.lng, 126.9019);
  assertEquals(row?.cta_url, "https://hangang.seoul.go.kr/mangwon");
  assertEquals(row?.source_label, "공공체육시설");
});

Deno.test("M-036: mapSportsFacility — FCLTY_SN 없으면 시설명+주소 해시로 external_id 생성(결정적)", () => {
  const raw = { FCLTY_NM: "테스트시설", RDNMADR: "서울 어딘가" };
  const a = mapSportsFacility(raw);
  const b = mapSportsFacility({ ...raw });
  assertEquals(a?.external_id, b?.external_id);
  assertNotEquals(a?.external_id, undefined);
});

Deno.test("M-036: mapSportsFacility — 시설명 없으면 제외", () => {
  assertEquals(mapSportsFacility({ FCLTY_NM: "" }), null);
});

// ── M-036: mapSeoulJob — 퇴근후 게이트(isAfterWorkShift)까지 통과하는 실제 매퍼 경로. ──

Deno.test("M-036: mapSeoulJob — 퇴근후(종료 19시+) 시간제만 side_job으로 정규화한다", () => {
  const row = mapSeoulJob({
    JO_REQST_NO: "SJ-2026-0001",
    JOBCODE_NM: "바리스타",
    CMPNY_NM: "망원동 카페",
    EMPLYM_STLE_CMMN_MM: "상용직(시간제)",
    WORK_TIME_NM: "(근무시간) (오후) 4시 00분 ~ (오후) 7시 00분",
    HOPE_WAGE: "시급 / 10320원 ",
    WORK_PARAR_BASS_ADRES_CN: "서울 마포구 월드컵로 100",
    RCEPT_CLOS_NM: "마감일 (2026-09-26)",
  });
  assertEquals(row?.source, "seoul_jobs");
  assertEquals(row?.category, "side_job");
  assertEquals(row?.external_id, "SJ-2026-0001");
  assertEquals(row?.title, "망원동 카페 · 바리스타");
  assertEquals(row?.cost_krw, 10320);
  assertEquals(row?.dong_name, "서울 마포구");
  assertEquals(row?.deadline, "2026-09-26");
  assertEquals(row?.time_start_hour, 16);
  assertEquals(row?.time_end_hour, 19);
});

Deno.test("M-036: mapSeoulJob — 종료 18시(정시퇴근)는 제외한다", () => {
  assertEquals(
    mapSeoulJob({
      JO_REQST_NO: "SJ-2026-0002",
      JOBCODE_NM: "바리스타",
      EMPLYM_STLE_CMMN_MM: "상용직(시간제)",
      WORK_TIME_NM: "월~금 : 15:00 ~ 18:00",
    }),
    null,
  );
});

Deno.test("M-036: mapSeoulJob — 정규직은 제외한다", () => {
  assertEquals(
    mapSeoulJob({
      JO_REQST_NO: "SJ-2026-0003",
      JOBCODE_NM: "매니저",
      EMPLYM_STLE_CMMN_MM: "정규직",
      WORK_TIME_NM: "(근무시간) (오후) 4시 00분 ~ (오후) 7시 00분",
    }),
    null,
  );
});
