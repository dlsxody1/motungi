/**
 * catalog.ts 테스트 — M-008로 apps/web·apps/mobile의 구 data/opportunities.ts 테스트를
 * 전부 이 파일로 승격 통합했다. fetchOpportunities가 이제 SupabaseClient를 인자로
 * 직접 받으므로("@/lib/supabase" 전역 모듈 모킹 불필요) fake client 객체를 만들어 주입한다.
 *
 * 이관 대조표 (원본 → 이 파일의 위치):
 *  - apps/web/src/data/opportunities.test.ts
 *      · "상태 분기" describe → 아래 "CatalogStatus 4분기" describe
 *      · "쿼리 계약" → 아래 "Supabase 쿼리 계약" describe
 *      · "rowToMock 변환" → 아래 "rowToMock — ok 경로 통합 스냅샷" + 각 파생 describe
 *  - apps/web/src/data/opportunities.rowToMock.test.ts
 *      · "비용 표시 파생" → 아래 "rowToMock — 비용 표시 파생" describe (그대로)
 *      · "라벨/톤/스코어 파생" → 아래 동일 이름 describe (그대로)
 *      · "meta 칩 파생" → 아래 동일 이름 describe (그대로)
 *      · "쿼리 계약 및 다건 매핑" → 아래 "Supabase 쿼리 계약" + "다건 매핑" describe
 *  - apps/mobile/data/opportunities.test.ts
 *      · "상태 분기" (unconfigured/error/data-null-no-error/empty/ok)
 *        → 아래 "CatalogStatus 4분기" describe. data가 null인데 error가 없는 케이스는
 *          web 버전엔 없던 엣지케이스라 별도 케이스로 보존했다.
 *      · "쿼리 계약" → 아래 "Supabase 쿼리 계약" describe에 통합(from/limit 호출 인자 검증 포함)
 *      · "rowToMock 변환" (culture/active/side_job/가격미상/다건순서) → 각 해당 describe로 흡수
 *
 * web·mobile 세 파일의 시나리오는 전부 여기 반영됐다 (중복은 통합, 엣지케이스는 보존).
 */
import type { OpportunityRow } from "./view";
import type { OpportunityCategory } from "./types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOpportunities, rowToMock } from "./catalog";

type FakeClient = { from: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn> };
type SupabaseClientLike = import("@supabase/supabase-js").SupabaseClient;

/**
 * opportunities.select().limit()가 result를 resolve하는 fake SupabaseClient.
 * from/select/limit 호출 인자를 vi.fn으로 기록해 쿼리 계약(테이블명·컬럼·limit)을 검증할 수 있다.
 * fetchOpportunities는 client.from(...).select(...).limit(...)만 사용하므로
 * 실제 SupabaseClient 타입 전체를 구현할 필요는 없다 — 호출부에서만 as unknown으로 캐스팅한다.
 */
function makeClient(result: { data: unknown; error: unknown }): FakeClient {
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ select }));
  return { from, select, limit };
}

function asClient(fake: FakeClient): SupabaseClientLike {
  return fake as unknown as SupabaseClientLike;
}

const ROW: OpportunityRow = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  external_id: null,
  title: "망원동 재즈 공연",
  summary: "동네 소극장에서 열리는 무료 재즈 공연",
  cost_krw: 0,
  difficulty: 0.2,
  dong_name: "망원동",
  lat: 37.5556,
  lng: 126.9019,
  cta_url: "https://example.com/jazz",
  deadline: "2026-08-01",
  source_label: "서울문화포털",
  time_start_hour: 19,
  time_end_hour: 21,
};

/** 최소 필드만 채운 row 팩토리 — 테스트별로 필요한 필드만 override. */
function makeRow(over: Partial<OpportunityRow> & { category: OpportunityCategory }): OpportunityRow {
  return {
    id: "op-x",
    source: "seoul_culture",
    external_id: null,
    title: "제목",
    summary: "요약",
    cost_krw: 0,
    difficulty: null,
    dong_name: "망원동",
    lat: null,
    lng: null,
    cta_url: null,
    deadline: null,
    source_label: null,
    time_start_hour: null,
    time_end_hour: null,
    ...over,
  };
}

/** 단일 row를 ok로 로드해 변환된 첫 항목을 돌려주는 헬퍼. */
async function loadOne(row: OpportunityRow) {
  const client = makeClient({ data: [row], error: null });
  const result = await fetchOpportunities(asClient(client));
  expect(result.status).toBe("ok");
  return result.data[0]!;
}

describe("fetchOpportunities — CatalogStatus 4분기", () => {
  it("데이터가 1건 이상이면 ok 상태로 매핑된 데이터를 반환한다", async () => {
    const client = makeClient({ data: [ROW], error: null });

    const result = await fetchOpportunities(asClient(client));

    expect(result.status).toBe("ok");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: "op-1",
      title: "망원동 재즈 공연",
      categoryLabel: "동네 문화·공연",
      costLabel: "무료",
    });
  });

  it("조회는 성공했지만 0건이면 empty 상태를 반환한다", async () => {
    const client = makeClient({ data: [], error: null });

    const result = await fetchOpportunities(asClient(client));

    expect(result.status).toBe("empty");
    expect(result.data).toEqual([]);
  });

  it("data가 null이어도(에러 없이) empty 상태를 반환한다", async () => {
    const client = makeClient({ data: null, error: null });

    const result = await fetchOpportunities(asClient(client));

    expect(result).toEqual({ data: [], status: "empty" });
  });

  it("카테고리/소스가 알 수 없는(레거시) 값인 row는 제외하고 유효한 것만 매핑한다(M-011)", async () => {
    const client = makeClient({
      data: [
        makeRow({ id: "ok-row", category: "culture" }),
        { ...makeRow({ id: "legacy-category", category: "culture" }), category: "subsidy" },
        { ...makeRow({ id: "legacy-source", category: "culture" }), source: "youth_policy" },
      ],
      error: null,
    });

    const result = await fetchOpportunities(asClient(client));

    expect(result.status).toBe("ok");
    expect(result.data.map((d) => d.id)).toEqual(["ok-row"]);
  });

  it("모든 row가 레거시 값이라 하나도 남지 않으면 empty 상태를 반환한다(M-011)", async () => {
    const client = makeClient({
      data: [{ ...makeRow({ id: "legacy-only", category: "culture" }), category: "subsidy" }],
      error: null,
    });

    const result = await fetchOpportunities(asClient(client));

    expect(result).toEqual({ data: [], status: "empty" });
  });

  it("조회 실패(query error)면 error 상태를 반환한다", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });

    const result = await fetchOpportunities(asClient(client));

    expect(result.status).toBe("error");
    expect(result.data).toEqual([]);
  });

  it("Supabase 클라이언트가 없으면(env 미설정) unconfigured 상태를 반환하고 쿼리를 시도하지 않는다", async () => {
    const result = await fetchOpportunities(null);

    expect(result.status).toBe("unconfigured");
    expect(result.data).toEqual([]);
  });
});

describe("rowToMock — 비용 표시 파생(costLabel/costHeading/costUnit)", () => {
  it("side_job: 만원 단위 수입 라벨 + '예상 수입' 헤딩 + '월' 단위", async () => {
    const card = await loadOne(makeRow({ category: "side_job", cost_krw: 480_000 }));
    expect(card.costLabel).toBe("+48만 원");
    expect(card.costHeading).toBe("예상 수입");
    expect(card.costUnit).toBe("월");
  });

  it("side_job: 만원 반올림이 0이면 원 단위 그대로 표기한다", async () => {
    const card = await loadOne(makeRow({ category: "side_job", cost_krw: 4_000 }));
    expect(card.costLabel).toBe("4,000원");
  });

  it("side_job: 반올림 경계(4999→0만, 5000→1만)를 확인한다", async () => {
    const low = await loadOne(makeRow({ category: "side_job", cost_krw: 4_999 }));
    expect(low.costLabel).toBe("4,999원");
    const high = await loadOne(makeRow({ category: "side_job", cost_krw: 5_000 }));
    expect(high.costLabel).toBe("+1만 원");
  });

  it("일반 카테고리: 0원이면 '무료'", async () => {
    const card = await loadOne(makeRow({ category: "culture", cost_krw: 0 }));
    expect(card.costLabel).toBe("무료");
    expect(card.costHeading).toBe("참가비");
    expect(card.costUnit).toBe("1인");
  });

  it("일반 카테고리: 유료면 천단위 구분 원화 표기", async () => {
    const card = await loadOne(makeRow({ category: "food", cost_krw: 12_000 }));
    expect(card.costLabel).toBe("₩12,000");
  });

  it("비용 미상(null)이면 '가격 문의'", async () => {
    const card = await loadOne(makeRow({ category: "class", cost_krw: null }));
    expect(card.costLabel).toBe("가격 문의");
    expect(card.costKrw).toBeUndefined();
  });
});

describe("rowToMock — 라벨/톤/스코어 파생", () => {
  it("categoryLabel은 CATEGORY_LABEL 매핑을 따른다", async () => {
    const card = await loadOne(makeRow({ category: "market" }));
    expect(card.categoryLabel).toBe("마켓·플리마켓");
  });

  it("active 카테고리만 tone이 mint, 나머지는 brand", async () => {
    const active = await loadOne(makeRow({ category: "active" }));
    expect(active.tone).toBe("mint");
    const culture = await loadOne(makeRow({ category: "culture" }));
    expect(culture.tone).toBe("brand");
  });

  it("matchScore는 항상 0으로 초기화된다(스코어링에서 재계산)", async () => {
    const card = await loadOne(makeRow({ category: "culture", cost_krw: 0 }));
    expect(card.matchScore).toBe(0);
  });
});

describe("rowToMock — meta 칩(buildMeta) 파생", () => {
  it("timeWindow와 difficulty가 있으면 시간대·강도 칩이 생성된다", async () => {
    const card = await loadOne(
      makeRow({ category: "culture", time_start_hour: 18, time_end_hour: 21, difficulty: 0.8 }),
    );
    expect(card.meta).toEqual([
      { label: "시간대", value: "18시" },
      { label: "강도", value: "높음" },
    ]);
  });

  it("난이도 경계로 강도 라벨이 낮음/보통/높음으로 나뉜다", async () => {
    const low = await loadOne(makeRow({ category: "active", difficulty: 0.33 }));
    expect(low.meta).toContainEqual({ label: "강도", value: "낮음" });
    const mid = await loadOne(makeRow({ category: "active", difficulty: 0.5 }));
    expect(mid.meta).toContainEqual({ label: "강도", value: "보통" });
  });

  it("시간대/난이도가 모두 없으면 meta는 빈 배열", async () => {
    const card = await loadOne(
      makeRow({ category: "food", time_start_hour: null, time_end_hour: null, difficulty: null }),
    );
    expect(card.meta).toEqual([]);
  });
});

describe("fetchOpportunities — Supabase 쿼리 계약", () => {
  it("opportunities 테이블을 최대 200건, 지정 컬럼으로 조회한다", async () => {
    const client = makeClient({ data: [makeRow({ category: "culture" })], error: null });

    await fetchOpportunities(asClient(client));

    expect(client.from).toHaveBeenCalledWith("opportunities");
    const selectedCols = client.select.mock.calls[0]?.[0] as string;
    expect(selectedCols).toContain("id");
    expect(selectedCols).toContain("cost_krw");
    expect(selectedCols).toContain("time_start_hour");
    expect(selectedCols).toContain("time_end_hour");
    expect(client.limit).toHaveBeenCalledWith(200);
  });
});

describe("fetchOpportunities — 다건 매핑 및 순서 보존", () => {
  it("여러 row를 순서를 보존하며 각각 변환한다(2건)", async () => {
    const client = makeClient({
      data: [
        makeRow({ id: "a", category: "side_job", cost_krw: 300_000 }),
        makeRow({ id: "b", category: "culture", cost_krw: 0 }),
      ],
      error: null,
    });

    const result = await fetchOpportunities(asClient(client));

    expect(result.data.map((d) => d.id)).toEqual(["a", "b"]);
    expect(result.data[0]!.costLabel).toBe("+30만 원");
    expect(result.data[1]!.costLabel).toBe("무료");
  });

  it("여러 row를 순서를 보존하며 각각 변환한다(3건, tone 포함)", async () => {
    const client = makeClient({
      data: [
        makeRow({ id: "a", category: "culture" }),
        makeRow({ id: "b", category: "active" }),
        makeRow({ id: "c", category: "side_job", cost_krw: 300_000 }),
      ],
      error: null,
    });

    const { data, status } = await fetchOpportunities(asClient(client));

    expect(status).toBe("ok");
    expect(data.map((d) => d.id)).toEqual(["a", "b", "c"]);
    expect(data.map((d) => d.tone)).toEqual(["brand", "mint", "brand"]);
  });
});

describe("rowToMock — ok 경로 통합 스냅샷 (core 변환 camelCase 확인 포함)", () => {
  it("culture/무료 row → 화면용 파생 필드 전체", async () => {
    const row = makeRow({
      id: "op-1",
      category: "culture",
      cost_krw: 0,
      difficulty: 0.2,
      time_start_hour: 19,
      time_end_hour: 21,
      lat: 37.5556,
      lng: 126.9019,
    });
    const card = await loadOne(row);

    expect(card.id).toBe("op-1");
    expect(card.categoryLabel).toBe("동네 문화·공연");
    expect(card.costLabel).toBe("무료");
    expect(card.costUnit).toBe("1인");
    expect(card.costHeading).toBe("참가비");
    expect(card.tone).toBe("brand");
    expect(card.matchScore).toBe(0);
    expect(card.meta).toEqual([
      { label: "시간대", value: "19시" },
      { label: "강도", value: "낮음" },
    ]);
    // core 변환(rowToOpportunity)이 실제로 적용됐는지(camelCase).
    expect(card.costKrw).toBe(0);
    expect(card.location?.point).toEqual({ lat: 37.5556, lng: 126.9019 });
  });

  it("active row → mint 톤 + categoryLabel", async () => {
    const card = await loadOne(makeRow({ category: "active" }));
    expect(card.tone).toBe("mint");
    expect(card.categoryLabel).toBe("동네 산책·운동");
  });

  it("side_job row → 수입 성격 라벨/헤딩/단위 + brand 톤", async () => {
    const card = await loadOne(makeRow({ category: "side_job", cost_krw: 480_000 }));
    expect(card.costLabel).toBe("+48만 원");
    expect(card.costHeading).toBe("예상 수입");
    expect(card.costUnit).toBe("월");
    expect(card.tone).toBe("brand");
  });
});

describe("rowToMock 함수 직접 호출 (fetchOpportunities 경유 없이)", () => {
  it("fetchOpportunities와 동일한 결과를 순수 함수 호출로도 얻는다", () => {
    const card = rowToMock(makeRow({ category: "market", cost_krw: 5_000 }));
    expect(card.categoryLabel).toBe("마켓·플리마켓");
    expect(card.costLabel).toBe("₩5,000");
    expect(card.tone).toBe("brand");
  });
});

describe("NEIGHBORHOOD_POINTS", () => {
  it("주요 동네 좌표를 노출한다", async () => {
    const { NEIGHBORHOOD_POINTS } = await import("./catalog");
    expect(NEIGHBORHOOD_POINTS["망원동"]).toEqual({ lat: 37.5556, lng: 126.9019 });
    expect(Object.keys(NEIGHBORHOOD_POINTS)).toEqual(
      expect.arrayContaining(["망원동", "성수동", "연남동", "판교동", "합정동"]),
    );
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
