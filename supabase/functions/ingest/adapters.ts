/**
 * 소스 어댑터 (Deno/Edge 런타임용).
 *
 * ⚠️ 로직 원본은 packages/core/src/adapters (TDD 테스트 소유).
 *    Edge Function은 Deno라 npm 워크스페이스(패키지명) import는 불가하지만,
 *    상대경로(.ts 확장자 명시) import는 가능하므로 공통 파서(parseFeeKrw/parseHour/
 *    toIsoDate/hashKey/parsePoint)는 core/adapters/util.ts를 그대로 import해 중복을 없앤다.
 *    필드 매핑 규칙(mapSeoulCulture 등)은 이 파일이 SoT — core adapters(seoul-culture.ts 등)와
 *    필드명이 다르므로 함께 수정할 것.
 */
import { hashKey, joinDescription, parseFeeKrw, parseHour, parseHttpUrl, parsePoint, parseTrailGuide, toIsoDate } from "../../../packages/core/src/adapters/util.ts";
// 퇴근후 판정은 core가 SoT(테스트 소유: core/adapters/seoul-jobs.test.ts).
import { isAfterWorkShift, parseShiftHours, parseWorkRegion } from "../../../packages/core/src/adapters/seoul-jobs.ts";
// 아동 전용 판정도 core가 SoT(테스트 소유: core/adapters/audience.test.ts).
import { isKidsOnly } from "../../../packages/core/src/adapters/audience.ts";

/** DB opportunities row (upsert 페이로드). */
export interface OppRow {
  source: string;
  category: string;
  external_id: string;
  title: string;
  summary: string;
  /**
   * 설명 원문(산문). 마이그레이션 0015. summary(메타데이터 조인)와 별개.
   * 소스별 채움률이 크게 달라 없는 게 정상 — 실측 trail 100% / seoul_culture 약 20% / culture_info 0%.
   */
  description?: string | null;
  /**
   * 원본 장르 문자열(0017). seoul_culture=CODENAME, culture_info=realmName.
   * 소스별 어휘가 달라 통합 enum을 두지 않고 원문을 보존한다.
   */
  genre?: string | null;
  /**
   * 관람/참여 대상 원문(0017). seoul_culture=USE_TRGT(실측 채움률 100%).
   * null=미상이며 "성인 가능"으로 취급한다 — 모르는 걸 배제하지 않는다.
   */
  audience?: string | null;
  cost_krw: number | null;
  difficulty: number | null;
  dong_name: string | null;
  lat: number | null;
  lng: number | null;
  /**
   * 좌표 정밀도 표식(0018). null=소스 원본 좌표, "sigungu"=구 중심 폴백.
   * 어댑터는 채우지 않는다 — 적재 계층(upsertRows)의 applyGuCoordFallback이 붙인다.
   */
  coord_level?: string;
  cta_url: string | null;
  image_url: string | null;
  deadline: string | null;
  source_label: string;
  time_start_hour: number | null;
  time_end_hour: number | null;
  /**
   * 공연장명(kopis 전용, DB 컬럼 아님 — 적재 계층이 좌표 백필에 쓰고 upsert 전에 버린다).
   * summary 문자열을 되파싱하면 공연장 이름에 " · "가 들어갈 때 깨지므로 원본을 따로 들고 간다.
   */
  venue_name?: string | null;
  /** 걷기길 코스 안내(trail 전용, 그 외 소스는 미지정). 마이그레이션 0013. */
  course_start?: string | null;
  course_end?: string | null;
  course_notes?: string | null;
  duration_min?: number | null;
  is_loop?: boolean | null;
  gpx_url?: string | null;
}

// ── 서울시 문화행사 → culture ──────────────────────────────

export function mapSeoulCulture(raw: Record<string, string>): OppRow | null {
  const title = raw.TITLE?.trim();
  if (!title) return null;
  /**
   * 컨셉 게이트 — "퇴근하고 뭐하지"는 성인 직장인용이라 아동 전용 프로그램은 적재하지 않는다.
   * (seoul_jobs의 isAfterWorkShift와 같은 성격. 판정 로직은 core가 SoT.)
   * USE_TRGT는 실응답에 100% 오므로 제목 추측이 아니라 실제 필드로 판정한다.
   */
  if (isKidsOnly(raw.USE_TRGT, title)) return null;
  const externalId = hashKey(`${title}|${raw.STRTDATE ?? ""}|${raw.PLACE ?? ""}`);
  const cost = raw.IS_FREE?.includes("무료") ? 0 : parseFeeKrw(raw.USE_FEE);
  const startHour = parseHour(raw.PRO_TIME);
  const point = parsePoint(raw.LAT, raw.LOT);
  return {
    source: "seoul_culture",
    category: "culture",
    external_id: externalId,
    title,
    summary: [raw.GUNAME, raw.PLACE, raw.CODENAME].filter(Boolean).join(" · ") || title,
    // PROGRAM(프로그램 소개)·PLAYER(출연진)·ETC_DESC(기타 안내)는 응답에 오는데 여태 버려졌다.
    // 채움률은 낮다 — 실측 2026-08-03 300건: PROGRAM 14% · PLAYER 11% · ETC_DESC 3%.
    // 그래도 있는 행은 유일하게 "무슨 공연인지"를 담고 있어 검색·LLM 입력으로 값이 크다.
    description: joinDescription([raw.PROGRAM, raw.PLAYER, raw.ETC_DESC]) ?? null,
    // 장르·대상은 여태 summary 조인 문자열로만 남거나(CODENAME) 아예 버려졌다(USE_TRGT).
    // 필터·스코어링이 쓰려면 컬럼으로 서야 한다(0017).
    genre: raw.CODENAME?.trim() || null,
    audience: raw.USE_TRGT?.trim() || null,
    cost_krw: cost ?? null,
    difficulty: null,
    dong_name: raw.GUNAME || null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    cta_url: parseHttpUrl(raw.ORG_LINK) ?? null,
    image_url: raw.MAIN_IMG?.trim() || null,
    deadline: toIsoDate(raw.END_DATE) ?? null,
    source_label: "서울시 문화행사",
    time_start_hour: startHour ?? null,
    /**
     * 종료시각은 **지어내지 않는다.** 예전엔 start+2로 추정했는데, API가 주지 않는 값을
     * 만들어낸 것이라 카드에 "10–12시"처럼 사실이 아닌 시간대가 찍혔다.
     * seoul_jobs가 이미 같은 실수를 고쳤다(start+4 추정 → 실제 파싱). 모르면 null이 정답이다.
     */
    time_end_hour: null,
  };
}

// ── 한눈에보는문화정보 → culture ──────────────────────────

export function mapCultureInfo(raw: Record<string, string>): OppRow | null {
  const seq = raw.seq?.trim();
  const title = raw.title?.trim();
  if (!seq || !title) return null;
  // 이 소스엔 대상(USE_TRGT) 필드가 없다 — 제목 폴백으로만 판정한다(core 함정 2 참조).
  if (isKidsOnly(null, title)) return null;
  const point = parsePoint(raw.gpsY, raw.gpsX);
  return {
    source: "culture_info",
    category: "culture",
    external_id: seq,
    title,
    summary: [raw.sigungu, raw.place, raw.realmName].filter(Boolean).join(" · ") || title,
    genre: raw.realmName?.trim() || null,
    // 이 소스는 대상 정보를 주지 않는다 — 지어내지 않고 null(미상=성인 가능).
    audience: null,
    // cost_krw·difficulty는 API가 실제로 주지 않는다. 값을 지어내는 건 지금 고치는 버그와 같은 부류다.
    cost_krw: null,
    difficulty: null,
    dong_name: [raw.area, raw.sigungu].filter(Boolean).join(" ") || null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    cta_url: null,
    image_url: raw.thumbnail?.trim() || null,
    deadline: toIsoDate(raw.endDate) ?? null,
    source_label: "한눈에보는문화정보",
    time_start_hour: null,
    time_end_hour: null,
  };
}

// ── KOPIS 공연 → culture ──────────────────────────────────
//
// 왜 넣었나: seoul_culture는 공공 주최 행사 위주라 소극장 연극·클래식·재즈 같은
// "퇴근 후 1픽"에 맞는 민간 공연이 통째로 빠져 있었다. KOPIS가 그 구멍을 메운다.
//
// 좌표는 이 함수가 채우지 않는다 — KOPIS 공연목록엔 좌표도 시설ID도 없고 공연장
// '이름'만 온다. 적재 계층(index.ts)이 시설 색인으로 좌표·구를 백필한다(core kopis.ts).
// trail이 GPX로 좌표를 채우는 것과 같은 2단 구조다.

export function mapKopis(raw: Record<string, string>): OppRow | null {
  const id = raw.mt20id?.trim();
  const title = raw.prfnm?.trim();
  if (!id || !title) return null;
  // 공연완료는 적재하지 않는다(목록 API가 기간과 무관하게 끼워 보내는 경우가 있다).
  if (raw.prfstate?.includes("완료")) return null;
  // 컨셉 게이트 — 성인 직장인용. 이 소스엔 대상 필드가 없어 제목 폴백으로만 판정한다.
  if (isKidsOnly(null, title)) return null;
  return {
    source: "kopis",
    category: "culture",
    external_id: id,
    title,
    // area는 "서울특별시"까지만 와서 구 단위가 아니다 — 공연장명이 더 쓸모 있다.
    summary: [raw.fcltynm?.trim(), raw.genrenm?.trim()].filter(Boolean).join(" · ") || title,
    // 목록 API는 줄거리(sty)를 주지 않는다. 상세를 부르지 않으므로 없는 게 정상.
    description: null,
    genre: raw.genrenm?.trim() || null,
    // 대상 정보를 주지 않는다 — 지어내지 않고 null(미상=성인 가능).
    audience: null,
    // 티켓가격(pcseguidance)은 상세에만 있다. 목록만 쓰므로 미상 — 0으로 두면
    // "무료"로 표시돼 사실이 아닌 정보가 카드에 찍힌다.
    cost_krw: null,
    difficulty: null,
    // 적재 계층이 시설 주소에서 구를 채운다. 실패하면 null로 남는다.
    dong_name: null,
    lat: null,
    lng: null,
    cta_url: `https://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?mt20Id=${encodeURIComponent(id)}`,
    image_url: raw.poster?.trim() || null,
    // prfpdto는 "2026.09.22" 형식 — toIsoDate가 점 구분을 읽는다.
    deadline: toIsoDate(raw.prfpdto) ?? null,
    source_label: "KOPIS 공연예술통합전산망",
    // 공연시간(dtguidance)도 상세 전용이다. 추정하지 않는다(seoul_culture의 start+2 전례).
    time_start_hour: null,
    time_end_hour: null,
    // 좌표 백필용 — upsert 전에 적재 계층이 제거한다(DB 컬럼이 아니다).
    venue_name: raw.fcltynm?.trim() || null,
  };
}

// ── 두루누비 걷기길 → active ──────────────────────────────

export function mapTrail(raw: Record<string, string>): OppRow | null {
  const id = raw.crsIdx?.trim();
  const title = raw.crsKorNm?.trim();
  if (!id || !title) return null;
  const level = Number(raw.crsLevel);
  const difficulty =
    Number.isFinite(level) && level >= 1 && level <= 3 ? (level - 1) / 2 : null;
  const km = raw.crsDstnc?.trim();
  const summary =
    [raw.sigun, km ? `${km}km` : undefined, raw.crsSummary?.replace(/<[^>]+>/g, "").trim()]
      .filter(Boolean)
      .join(" · ") || title;
  // 두루누비엔 이미지가 없다(courseList 16개 필드에 image 계열 0개) — 대신 시점·종점·교통편이
  // 오므로 코스 안내로 채운다. 형식이 두 가지라 parseTrailGuide가 구분한다(수도권 실측 7/11/1).
  const guide = parseTrailGuide(raw.travelerinfo);
  const durationMin = Number(raw.crsTotlRqrmHour);
  return {
    source: "trail",
    category: "active",
    external_id: id,
    title,
    summary,
    // 두루누비는 산문 3종이 100% 채워져 온다(실측 2026-08-03, 100건 표본:
    // crsSummary 중앙값 104자 · crsContents 97자 · crsTourInfo 115자).
    // summary는 "지역 · 거리 · 요약"으로 잘리므로 검색·LLM용 원문은 따로 보존한다.
    description: joinDescription([raw.crsSummary, raw.crsContents, raw.crsTourInfo]) ?? null,
    cost_krw: 0,
    difficulty,
    dong_name: raw.sigun || null,
    // lat/lng는 여기서 못 채운다 — 좌표가 GPX 파일 안에 있어 fetch가 필요하다.
    // 적재 계층(index.ts)의 enrichTrailCoords가 GPX 첫 trkpt로 채운다.
    lat: null,
    lng: null,
    // cta_url은 두루누비 코스 페이지로. gpx_url과 분리하지 않으면 "보러 가기"가 파일 다운로드가 된다.
    cta_url: `https://www.durunubi.kr/trail-course-detail.do?crsIdx=${encodeURIComponent(id)}`,
    image_url: null,
    deadline: null,
    source_label: "두루누비",
    time_start_hour: null,
    time_end_hour: null,
    course_start: guide.start ?? null,
    course_end: guide.end ?? null,
    course_notes: guide.notes?.length ? guide.notes.join("\n") : null,
    duration_min: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : null,
    is_loop: raw.crsCycle ? raw.crsCycle.includes("순환") && !raw.crsCycle.includes("비순환") : null,
    gpx_url: raw.gpxpath || null,
  };
}

// ── 공공체육시설 → active ─────────────────────────────────
// ⚠️ 필드명 미확정(추정) — 발급 응답 확정 후 교체. core sports-facility.ts 미러.

export function mapSportsFacility(raw: Record<string, string>): OppRow | null {
  const title = raw.FCLTY_NM?.trim();
  if (!title) return null;
  const addr = raw.RDNMADR?.trim() || raw.LNMADR?.trim();
  const externalId = raw.FCLTY_SN?.trim() || hashKey(`${title}|${addr ?? ""}`);
  const point = parsePoint(raw.LATITUDE, raw.LONGITUDE);
  const summary =
    [raw.FCLTY_TY_NM, raw.SIGNGU_NM, addr].map((s) => s?.trim()).filter(Boolean).join(" · ") ||
    title;
  return {
    source: "sports_facility",
    category: "active",
    external_id: externalId,
    title,
    summary,
    // 시설은 무료·유료가 섞임 — 요금 미상이면 0이 아니라 null.
    cost_krw: parseFeeKrw(raw.UTILIZA_CHRGE) ?? null,
    difficulty: null,
    dong_name: raw.SIGNGU_NM?.trim() || null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    cta_url: parseHttpUrl(raw.HMPG_URL) ?? null,
    image_url: null,
    deadline: null,
    source_label: "공공체육시설",
    time_start_hour: null,
    time_end_hour: null,
  };
}

// ── 서울시 일자리 → side_job (파트/단기만) ─────────────────

// ⚠️ 분류 규칙 SoT는 core seoul-jobs.ts(PART_TIME_KEYWORDS). 여기 목록은 그 미러다.
// (계약직은 단기 보장이 없어 core와 함께 제외 — 목록을 core와 일치시킨다.)
const PART_KEYWORDS = ["파트", "시간제", "단기", "아르바이트", "알바", "일용"];

export function mapSeoulJob(raw: Record<string, string>): OppRow | null {
  const empType = raw.EMPLYM_STLE_CMMN_MM || "";
  // 정규직/기간의 정함 없음 등 풀타임 제외.
  if (empType.includes("정규") || empType.includes("정함이 없")) return null;
  // 파트/시간제/단기만 채택(미상은 제외 — 문화·여가 컨셉 유지).
  if (empType && !PART_KEYWORDS.some((k) => empType.includes(k))) return null;

  const id = raw.JO_REQST_NO?.trim();
  const jobName = raw.JOBCODE_NM?.trim();
  if (!id || !jobName) return null;

  // ⭐ 컨셉 게이트 — "퇴근하고 뭐하지"는 퇴근 후에 할 수 있는 일만 뜻한다.
  // 시간제라도 종료가 낮이면(9~12시 요양보호사 등) 제외한다. 이 필터가 없으면
  // 수도권 시간제 6,294건이 통째로 들어와 낮 근무가 부업 탭을 덮는다(→ 309건).
  const workTime = raw.WORK_TIME_NM || raw.DTY_CN;
  if (!isAfterWorkShift(workTime)) return null;

  const title = raw.CMPNY_NM ? `${raw.CMPNY_NM} · ${jobName}` : jobName;
  const shift = parseShiftHours(workTime);
  const region = parseWorkRegion(raw.WORK_PARAR_BASS_ADRES_CN);
  return {
    source: "seoul_jobs",
    category: "side_job",
    external_id: id,
    title,
    summary: [raw.CMPNY_NM, empType, region].filter(Boolean).join(" · ") || title,
    // side_job의 cost_krw는 지출이 아니라 벌이(income) — UI에서 카테고리로 분기 표기.
    cost_krw: parseFeeKrw(raw.HOPE_WAGE) ?? null,
    difficulty: null,
    // 원문은 "경기 구리시대림어린이집"처럼 상세주소가 붙어 온다 — 시군구까지만 잘라
    // 넣지 않으면 normalizeGu가 못 걷어내 지역 필터에 안 걸린다.
    dong_name: region ?? null,
    lat: null,
    lng: null,
    cta_url: null,
    image_url: null,
    // RCEPT_CLOS는 실응답에 없다 — RCEPT_CLOS_NM이고 값이 "마감일 (2026-09-26)"이라
    // toIsoDate(^앵커)로는 못 읽는다. 괄호 안 날짜만 뽑아 넘긴다.
    // 이게 null이면 마감 지난 공고가 purge되지 않고 계속 쌓인다.
    deadline: toIsoDate(raw.RCEPT_CLOS_NM?.match(/\d{4}-\d{2}-\d{2}/)?.[0]) ?? null,
    source_label: "서울시 일자리플러스센터",
    // 종료시각은 실측을 쓴다(예전엔 start+4 추정이라 19시 필터와 어긋났다).
    time_start_hour: shift?.start ?? null,
    time_end_hour: shift?.end ?? null,
  };
}
