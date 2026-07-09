/**
 * 활동 데이터 레이어 — Supabase 실데이터를 화면용 형태(MockOpportunity)로 변환한다.
 * (목업 배열은 제거됨: 화면은 서버 데이터에만 바인딩하고, 실패/빈결과는 상태로 노출한다.)
 */
import type { GeoPoint, Opportunity, OpportunityRow } from "@motungi/core";
import {
  buildMeta,
  categoryTone,
  CATEGORY_LABEL,
  costHeading,
  costLabel,
  costUnit,
  rowToOpportunity,
} from "@motungi/core";
import { supabase } from "@/lib/supabase";

/** 동네 → 대표 좌표. 위치 앵커(집) 좌표 주입에 사용(행정동 API 전까지 근사값). */
export const NEIGHBORHOOD_POINTS: Record<string, GeoPoint> = {
  망원동: { lat: 37.5556, lng: 126.9019 },
  성수동: { lat: 37.5445, lng: 127.0559 },
  연남동: { lat: 37.5638, lng: 126.9256 },
  판교동: { lat: 37.3948, lng: 127.1112 },
  합정동: { lat: 37.5495, lng: 126.9138 },
};

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
function rowToMock(row: OpportunityRow): MockOpportunity {
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

/**
 * Supabase에서 활동 후보를 읽어온다. 목업 폴백 없음 — 실패/빈결과는 상태로 반환한다.
 * data는 스코어링(pickTop)에 그대로 넣을 수 있는 형태.
 */
export async function fetchOpportunities(): Promise<CatalogResult> {
  if (!supabase) return { data: [], status: "unconfigured" };
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id,source,category,external_id,title,summary,cost_krw,difficulty,dong_name,lat,lng,cta_url,deadline,source_label,time_start_hour,time_end_hour",
    )
    .limit(200);
  if (error) return { data: [], status: "error" };
  if (!data || data.length === 0) return { data: [], status: "empty" };
  return { data: (data as OpportunityRow[]).map(rowToMock), status: "ok" };
}
