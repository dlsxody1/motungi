/**
 * 활동 카탈로그 데이터 레이어 — Supabase 실데이터를 화면용 형태(MockOpportunity)로 변환한다.
 * (목업 배열은 없음: 화면은 서버 데이터에만 바인딩하고, 실패/빈결과는 상태로 노출한다.)
 *
 * web/mobile의 구 data/opportunities.ts에서 승격됨(M-008). 모듈 스코프의 `supabase` 전역
 * 대신 fetchOpportunities가 SupabaseClient를 인자로 받는다 — core는 부작용을 격리한 순수
 * 함수만 두고, 실제 클라이언트 생성/설정은 각 앱(web/mobile)의 책임으로 남긴다.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeoPoint, Opportunity, OpportunityCategory } from "./types";
import { isOpportunityCategory, isSourceKind } from "./database.types";
import {
  buildMeta,
  categoryTone,
  CATEGORY_LABEL,
  costHeading,
  costLabel,
  costUnit,
  rowToOpportunity,
  type OpportunityRow,
} from "./view";

/** 동네 선택 결과 — 검색·칩·현재위치 어디서 왔든 이 형태로 앵커에 주입한다. */
export interface NeighborhoodPick {
  admCode?: string;
  dongName: string;
  /** 시·구 표기(배너용, 예: "서울 마포구"). */
  region?: string;
  point: GeoPoint;
}

/**
 * 인기/추천 동네 — 검색어가 비었을 때 보여주는 기본 칩 목록이자 기본 선택.
 * 전체 행정동은 neighborhoods 테이블(+ /api/neighborhoods 검색)에서 오고, 이건 진입 UX용 소수.
 * (판교는 서울 밖이지만 초기 데모 동네로 유지.)
 */
export const POPULAR_NEIGHBORHOODS: NeighborhoodPick[] = [
  { dongName: "망원동", region: "서울 마포구", point: { lat: 37.5556, lng: 126.9019 } },
  { dongName: "성수동", region: "서울 성동구", point: { lat: 37.5445, lng: 127.0559 } },
  { dongName: "연남동", region: "서울 마포구", point: { lat: 37.5638, lng: 126.9256 } },
  { dongName: "판교동", region: "경기 성남시 분당구", point: { lat: 37.3948, lng: 127.1112 } },
  { dongName: "합정동", region: "서울 마포구", point: { lat: 37.5495, lng: 126.9138 } },
];

/** 기본 선택 동네(진입 시). */
export const DEFAULT_NEIGHBORHOOD: NeighborhoodPick = POPULAR_NEIGHBORHOODS[0]!;

/**
 * 화면 표시용 활동 카드 — core Opportunity + 파생 표시 필드.
 * (이름은 히스토리상 MockOpportunity지만, 이제 rowToMock으로 실데이터에서 생성된다.)
 */
export type MockOpportunity = Opportunity & {
  /** 카테고리 한글 라벨 (태그용) */
  categoryLabel: string;
  /** 비용 표시 문자열 (예: "무료", "₩12,000"). side_job이면 수입(예: "+48만 원") */
  costLabel: string;
  /** 비용 단위/맥락 (예: "1인", "회당", "월") */
  costUnit: string;
  /** 비용 값 앞 라벨. 일반 "참가비", side_job "예상 수입" */
  costHeading: string;
  /** 매칭도 0~100 */
  matchScore: number;
  /** 상세 메타(칩) */
  meta: { label: string; value: string }[];
  /** 참여 방법 스텝 (실데이터엔 없을 수 있음 → 상세에서 없으면 섹션 숨김) */
  steps?: string[];
  costNote?: string;
  tone: "brand" | "mint";
};

// ── Supabase 실데이터 연동 ─────────────────────────────────

/** DB row → 화면용 MockOpportunity (core 파생 헬퍼 사용). */
export function rowToMock(row: OpportunityRow): MockOpportunity {
  const opp = rowToOpportunity(row);
  return {
    ...opp,
    categoryLabel: CATEGORY_LABEL[opp.category],
    costLabel: costLabel(opp.costKrw, opp.category),
    costUnit: costUnit(opp.category),
    costHeading: costHeading(opp.category),
    matchScore: 0, // 스코어링에서 재계산됨
    meta: buildMeta(opp),
    tone: categoryTone(opp.category),
  };
}

/**
 * 카탈로그 로드 상태.
 * - ok: 데이터 1건 이상 정상 로드
 * - empty: 조회는 성공했지만 0건
 * - error: 조회 실패(네트워크/서버)
 * - unconfigured: Supabase 환경변수 미설정
 */
export type CatalogStatus = "ok" | "empty" | "error" | "unconfigured";

export interface CatalogResult {
  data: MockOpportunity[];
  status: CatalogStatus;
}

/** fetchOpportunities 조회 컬럼(전량 select 아님 — 화면이 바인딩하는 필드만). */
const CATALOG_COLUMNS =
  "id,source,category,external_id,title,summary,cost_krw,difficulty,dong_name,lat,lng,cta_url,image_url,deadline,source_label,time_start_hour,time_end_hour";

/** 조회 상한 기본값(옵션 미지정 시). */
const DEFAULT_LIMIT = 200;

export interface FetchOpportunitiesOptions {
  /** 관심 카테고리 화이트리스트. 없으면 카테고리 필터 없음. */
  categories?: OpportunityCategory[];
  /**
   * "오늘"(YYYY-MM-DD). 주어지면 마감이 지난 활동을 서버에서 제외한다
   * (deadline is null 또는 deadline >= today). core 순수성상 함수 내부에서
   * 현재 시각을 읽지 않으므로 호출부(앱 래퍼)가 주입한다.
   */
  today?: string;
  /** 조회 상한. 미지정 시 200. report는 소량, explore는 다량으로 구분해 넘긴다. */
  limit?: number;
  /** 대표 이미지(image_url)가 있는 활동만. 랜딩 캐러셀처럼 썸네일이 필수인 곳에서 서버에 위임. */
  withImageOnly?: boolean;
}

/**
 * Supabase에서 활동 후보를 읽어온다. 목업 폴백 없음 — 실패/빈결과는 상태로 반환한다.
 * data는 스코어링(pickTop)에 그대로 넣을 수 있는 형태.
 *
 * 무옵션 호출은 기존과 동일(무필터·상한 200). 옵션으로 카테고리·마감유효 필터와
 * 상한을 서버에 위임해, "전량 받아 클라에서 버리는" 낭비를 없앤다.
 *
 * @param client Supabase 클라이언트. 환경변수 미설정 등으로 앱단에서 생성하지 못했으면
 *   null을 넘긴다 — 이 경우 쿼리 시도 없이 unconfigured를 반환한다.
 * @param options 카테고리·오늘(마감 필터)·상한. 생략 시 기존 동작.
 */
export async function fetchOpportunities(
  client: SupabaseClient | null,
  options: FetchOpportunitiesOptions = {},
): Promise<CatalogResult> {
  if (!client) return { data: [], status: "unconfigured" };
  let query = client.from("opportunities").select(CATALOG_COLUMNS);
  // 마감 지난 활동 제외: deadline이 null(상시)이거나 today 이후인 것만.
  if (options.today) query = query.or(`deadline.is.null,deadline.gte.${options.today}`);
  // 관심 카테고리로 좁힌다(주어질 때만).
  if (options.categories?.length) query = query.in("category", options.categories);
  // 썸네일 필수 화면(랜딩 캐러셀)은 이미지 있는 행만 서버에서 거른다.
  if (options.withImageOnly) query = query.not("image_url", "is", null);
  // 마감 임박순(가까운 것 먼저), 상시(null)는 뒤로. 상한까지만.
  const { data, error } = await query
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(options.limit ?? DEFAULT_LIMIT);
  if (error) return { data: [], status: "error" };
  if (!data || data.length === 0) return { data: [], status: "empty" };
  // DB의 category/source enum에는 앱이 모르는 레거시 값이 남아있을 수 있다(§database.types.ts) —
  // 가드로 검증된 row만 남기고 캐스팅 없이 OpportunityRow로 좁힌다(M-011).
  const rows: OpportunityRow[] = data.filter(
    (row): row is OpportunityRow => isOpportunityCategory(row.category) && isSourceKind(row.source),
  );
  // 원본 조회는 1건 이상이었지만 전부 레거시 값이라 필터링되면 "empty"로 취급한다 —
  // status==="ok"는 항상 1건 이상 렌더 가능한 데이터를 의미하는 계약(위 CatalogStatus 주석)을 지킨다.
  if (rows.length === 0) return { data: [], status: "empty" };
  return { data: rows.map(rowToMock), status: "ok" };
}
