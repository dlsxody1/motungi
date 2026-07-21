/**
 * 이 파일은 수기 작성됨 — `supabase gen types typescript`를 이 세션에서 실행할 수 없어
 * (Docker 데몬 없음, 원격 access token 없음) supabase/migrations/0001~0004 SQL 스키마를
 * 근거로 손으로 작성. 추후 실행 가능해지면 생성 결과로 교체할 것.
 *
 * 근거 파일:
 *  - supabase/migrations/0001_init.sql           (opportunities/profiles/saved_opportunities 초기 스키마)
 *  - supabase/migrations/0002_source_kind_seoul_jobs.sql (source_kind += seoul_jobs)
 *  - supabase/migrations/0003_pivot_categories.sql       (category/source enum 확장, estimated_income_krw → cost_krw,
 *                                                          time_start_hour/time_end_hour, work_adm_code/work_dong_name)
 *  - supabase/migrations/0004_latlng_geom_trigger.sql    (lat/lng 컬럼 + geom 자동 동기화 트리거)
 */

import type { OpportunityCategory, SourceKind } from "./types";

/**
 * DB의 `opportunity_category` enum 전체 값.
 * Postgres enum은 값 삭제가 까다로워(§0003 마이그레이션 주석) 옛 값이 잔존한다.
 * 앱이 실제로 쓰는 값은 `./types`의 `OpportunityCategory` 6종뿐 — 그 외는 DB에만 남은 레거시.
 */
export type OpportunityCategoryDb =
  | "side_job" // 부업 (레거시 기획 잔재지만 카테고리 자체는 유지 — 앱에서도 사용)
  | "subsidy" // 레거시, 미사용, DB에만 잔존 (구 기획: 지원금/청년정책)
  | "gig_deal" // 레거시, 미사용, DB에만 잔존 (구 기획: 긱·딜)
  | "class_talent" // 레거시, 미사용, DB에만 잔존 (구 기획: 클래스·재능)
  | "space_used" // 레거시, 미사용, DB에만 잔존 (구 기획: 공간·중고)
  | "culture" // 공연·전시
  | "active" // 운동·산책·걷기길
  | "class" // 클래스·배움
  | "food" // 먹거리·맛집
  | "market"; // 마켓·플리마켓

/**
 * DB의 `source_kind` enum 전체 값.
 * 앱이 실제로 쓰는 값은 `./types`의 `SourceKind` 6종뿐 — 그 외는 DB에만 남은 레거시.
 */
export type SourceKindDb =
  | "commercial_area" // 소상공인 상권정보 (food 보조 + 근거 맥락)
  | "youth_policy" // 레거시, 미사용, DB에만 잔존 (구 기획: 온통청년 등)
  | "affiliate_feed" // 레거시, 미사용, DB에만 잔존 (구 기획: 제휴 피드)
  | "seoul_jobs" // 서울시 일자리플러스센터
  | "seoul_culture" // 서울시 문화행사
  | "culture_info" // 한눈에보는문화정보 data.go.kr
  | "sports_facility" // 공공체육시설 data.go.kr
  | "trail"; // 두루누비 걷기길 data.go.kr

/**
 * PostGIS geography(Point, 4326) 컬럼.
 * supabase-js가 select 시 반환하는 실제 표현(WKB hex 문자열 등)은 쿼리 방식에 따라 달라지고
 * 앱 코드는 이 컬럼을 직접 읽지 않는다(위치는 lat/lng 컬럼 경유, geom은 트리거가 파생 생성).
 * 임의로 단정하지 않기 위해 unknown으로 잡는다.
 */
export type PostgisGeographyPoint = unknown;

export interface Database {
  public: {
    Tables: {
      opportunities: {
        Row: {
          id: string;
          source: SourceKindDb;
          category: OpportunityCategoryDb;
          external_id: string | null;
          title: string;
          summary: string;
          cost_krw: number | null;
          difficulty: number | null;
          adm_code: string | null;
          dong_name: string | null;
          geom: PostgisGeographyPoint | null;
          cta_url: string | null;
          image_url: string | null;
          deadline: string | null; // date (ISO)
          source_label: string | null;
          fetched_at: string; // timestamptz (ISO)
          created_at: string; // timestamptz (ISO)
          time_start_hour: number | null;
          time_end_hour: number | null;
          lat: number | null;
          lng: number | null;
        };
        Insert: {
          id?: string;
          source: SourceKindDb;
          category: OpportunityCategoryDb;
          external_id?: string | null;
          title: string;
          summary: string;
          cost_krw?: number | null;
          difficulty?: number | null;
          adm_code?: string | null;
          dong_name?: string | null;
          geom?: PostgisGeographyPoint | null;
          cta_url?: string | null;
          image_url?: string | null;
          deadline?: string | null;
          source_label?: string | null;
          fetched_at?: string;
          created_at?: string;
          time_start_hour?: number | null;
          time_end_hour?: number | null;
          lat?: number | null;
          lng?: number | null;
        };
        Update: {
          id?: string;
          source?: SourceKindDb;
          category?: OpportunityCategoryDb;
          external_id?: string | null;
          title?: string;
          summary?: string;
          cost_krw?: number | null;
          difficulty?: number | null;
          adm_code?: string | null;
          dong_name?: string | null;
          geom?: PostgisGeographyPoint | null;
          cta_url?: string | null;
          image_url?: string | null;
          deadline?: string | null;
          source_label?: string | null;
          fetched_at?: string;
          created_at?: string;
          time_start_hour?: number | null;
          time_end_hour?: number | null;
          lat?: number | null;
          lng?: number | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          home_adm_code: string | null;
          home_dong_name: string | null;
          created_at: string; // timestamptz (ISO)
          work_adm_code: string | null;
          work_dong_name: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          home_adm_code?: string | null;
          home_dong_name?: string | null;
          created_at?: string;
          work_adm_code?: string | null;
          work_dong_name?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          home_adm_code?: string | null;
          home_dong_name?: string | null;
          created_at?: string;
          work_adm_code?: string | null;
          work_dong_name?: string | null;
        };
      };
      saved_opportunities: {
        Row: {
          user_id: string;
          opportunity_id: string;
          saved_at: string; // timestamptz (ISO)
        };
        Insert: {
          user_id: string;
          opportunity_id: string;
          saved_at?: string;
        };
        Update: {
          user_id?: string;
          opportunity_id?: string;
          saved_at?: string;
        };
      };
      neighborhoods: {
        Row: {
          adm_code: string;
          sido: string;
          sigungu: string;
          dong_name: string;
          lat: number;
          lng: number;
          coord_level: string; // 'seed' | 'sigungu' | 'dong'
          geom: PostgisGeographyPoint | null;
        };
        Insert: {
          adm_code: string;
          sido: string;
          sigungu: string;
          dong_name: string;
          lat: number;
          lng: number;
          coord_level?: string;
          geom?: PostgisGeographyPoint | null;
        };
        Update: {
          adm_code?: string;
          sido?: string;
          sigungu?: string;
          dong_name?: string;
          lat?: number;
          lng?: number;
          coord_level?: string;
          geom?: PostgisGeographyPoint | null;
        };
      };
    };
  };
}

/** 앱이 실제로 쓰는 카테고리 6종 (`./types`의 `OpportunityCategory`와 동기화 유지). */
const APP_OPPORTUNITY_CATEGORIES = new Set<string>([
  "culture",
  "active",
  "side_job",
  "class",
  "food",
  "market",
] satisfies OpportunityCategory[]);

/** 앱이 실제로 쓰는 소스 6종 (`./types`의 `SourceKind`와 동기화 유지). */
const APP_SOURCE_KINDS = new Set<string>([
  "seoul_culture",
  "culture_info",
  "sports_facility",
  "trail",
  "seoul_jobs",
  "commercial_area",
] satisfies SourceKind[]);

/**
 * DB에서 읽어온 값이 앱이 실제로 취급하는 `OpportunityCategory` 6종에 속하는지 검사한다.
 * DB에는 레거시 값(subsidy/gig_deal/class_talent/space_used)이 남아있을 수 있으므로,
 * 경계에서 이 가드로 좁혀 쓰지 않으면 안전하지 않다.
 */
export function isOpportunityCategory(v: unknown): v is OpportunityCategory {
  return typeof v === "string" && APP_OPPORTUNITY_CATEGORIES.has(v);
}

/**
 * DB에서 읽어온 값이 앱이 실제로 취급하는 `SourceKind` 6종에 속하는지 검사한다.
 * DB에는 레거시 값(youth_policy/affiliate_feed)이 남아있을 수 있으므로,
 * 경계에서 이 가드로 좁혀 쓰지 않으면 안전하지 않다.
 */
export function isSourceKind(v: unknown): v is SourceKind {
  return typeof v === "string" && APP_SOURCE_KINDS.has(v);
}
