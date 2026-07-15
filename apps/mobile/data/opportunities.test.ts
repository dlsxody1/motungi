import type { OpportunityRow } from "@motungi/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * opportunities.ts 데이터 레이어 테스트.
 *
 * "@/lib/supabase"를 vi.mock으로 스텁해서:
 *  - rowToMock 변환(순수)을 fetchOpportunities의 "ok" 경로로 검증하고,
 *  - 상태 분기(ok/empty/error/unconfigured)를 각각 강제한다.
 * @motungi/core는 실제 구현(rowToOpportunity/costLabel 등)을 그대로 쓴다.
 *
 * fetchOpportunities는 모듈 로드 시점의 `supabase` 바인딩을 참조하므로,
 * 게터로 감싼 홀더를 각 테스트에서 바꿔 unconfigured(null)와 client(fake)를 오간다.
 */

// vi.hoisted: mock 팩토리보다 먼저 평가되어 팩토리 게터가 참조할 수 있는 가변 홀더.
const h = vi.hoisted(() => {
  // limit()가 resolve할 결과. 테스트마다 교체.
  const state: {
    result: { data: unknown; error: unknown };
    calls: { from: unknown[][]; select: unknown[][]; limit: unknown[][] };
    supabase: unknown;
  } = {
    result: { data: [], error: null },
    calls: { from: [], select: [], limit: [] },
    supabase: null,
  };
  return { state };
});

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return h.state.supabase;
  },
}));

// supabase.from(...).select(...).limit(...) 체인을 흉내내고 호출 인자를 기록한다.
function makeFakeClient() {
  return {
    from(...args: unknown[]) {
      h.state.calls.from.push(args);
      return {
        select(...sArgs: unknown[]) {
          h.state.calls.select.push(sArgs);
          return {
            limit(...lArgs: unknown[]) {
              h.state.calls.limit.push(lArgs);
              return Promise.resolve(h.state.result);
            },
          };
        },
      };
    },
  };
}

function makeRow(overrides: Partial<OpportunityRow> = {}): OpportunityRow {
  return {
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
    ...overrides,
  };
}

// 각 테스트 사이 홀더 초기화.
beforeEach(() => {
  h.state.result = { data: [], error: null };
  h.state.calls = { from: [], select: [], limit: [] };
  h.state.supabase = makeFakeClient();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("fetchOpportunities — 상태 분기", () => {
  it("supabase 미설정(null)이면 쿼리 없이 unconfigured", async () => {
    h.state.supabase = null;
    const { fetchOpportunities } = await import("./opportunities");

    const res = await fetchOpportunities();

    expect(res).toEqual({ data: [], status: "unconfigured" });
    // 클라이언트가 없으므로 어떤 쿼리도 시도하지 않아야 한다.
    expect(h.state.calls.from).toHaveLength(0);
  });

  it("조회 에러면 error 상태 + 빈 데이터", async () => {
    h.state.result = { data: null, error: { message: "boom" } };
    const { fetchOpportunities } = await import("./opportunities");

    const res = await fetchOpportunities();

    expect(res).toEqual({ data: [], status: "error" });
  });

  it("data가 null이어도(에러 없이) empty 상태", async () => {
    h.state.result = { data: null, error: null };
    const { fetchOpportunities } = await import("./opportunities");

    const res = await fetchOpportunities();

    expect(res).toEqual({ data: [], status: "empty" });
  });

  it("0건이면 empty 상태", async () => {
    h.state.result = { data: [], error: null };
    const { fetchOpportunities } = await import("./opportunities");

    const res = await fetchOpportunities();

    expect(res).toEqual({ data: [], status: "empty" });
  });

  it("1건 이상이면 ok 상태", async () => {
    h.state.result = { data: [makeRow()], error: null };
    const { fetchOpportunities } = await import("./opportunities");

    const res = await fetchOpportunities();

    expect(res.status).toBe("ok");
    expect(res.data).toHaveLength(1);
  });
});

describe("fetchOpportunities — Supabase 쿼리 계약", () => {
  it("opportunities 테이블을 최대 200건으로 조회한다", async () => {
    h.state.result = { data: [makeRow()], error: null };
    const { fetchOpportunities } = await import("./opportunities");

    await fetchOpportunities();

    expect(h.state.calls.from).toEqual([["opportunities"]]);
    expect(h.state.calls.limit).toEqual([[200]]);
    // select 대상 컬럼에 필수 필드가 포함돼야 한다(스코어링 입력).
    const selectArg = h.state.calls.select[0]?.[0] as string;
    expect(selectArg).toContain("id");
    expect(selectArg).toContain("cost_krw");
    expect(selectArg).toContain("time_start_hour");
    expect(selectArg).toContain("time_end_hour");
  });
});

describe("rowToMock 변환 (ok 경로로 검증)", () => {
  it("culture/무료 row → 화면용 파생 필드", async () => {
    const row = makeRow({
      category: "culture",
      cost_krw: 0,
      difficulty: 0.2,
      time_start_hour: 19,
      time_end_hour: 21,
    });
    h.state.result = { data: [row], error: null };
    const { fetchOpportunities } = await import("./opportunities");

    const { data } = await fetchOpportunities();
    const card = data[0];

    expect(card.id).toBe("op-1");
    expect(card.categoryLabel).toBe("동네 문화·공연");
    expect(card.costLabel).toBe("무료");
    expect(card.costUnit).toBe("1인");
    expect(card.costHeading).toBe("참가비");
    expect(card.tone).toBe("brand");
    // 스코어링 전이므로 항상 0으로 초기화.
    expect(card.matchScore).toBe(0);
    // meta: 시간대 + 강도(낮음, difficulty<=0.33).
    expect(card.meta).toEqual([
      { label: "시간대", value: "19시" },
      { label: "강도", value: "낮음" },
    ]);
    // core 변환이 실제로 적용됐는지(camelCase).
    expect(card.costKrw).toBe(0);
    expect(card.location?.point).toEqual({ lat: 37.5556, lng: 126.9019 });
  });

  it("active row → mint 톤", async () => {
    h.state.result = { data: [makeRow({ category: "active" })], error: null };
    const { fetchOpportunities } = await import("./opportunities");

    const { data } = await fetchOpportunities();

    expect(data[0].tone).toBe("mint");
    expect(data[0].categoryLabel).toBe("동네 산책·운동");
  });

  it("side_job row → 수입 성격 라벨/헤딩/단위", async () => {
    h.state.result = {
      data: [makeRow({ category: "side_job", cost_krw: 480_000 })],
      error: null,
    };
    const { fetchOpportunities } = await import("./opportunities");

    const { data } = await fetchOpportunities();
    const card = data[0];

    expect(card.costLabel).toBe("+48만 원");
    expect(card.costHeading).toBe("예상 수입");
    expect(card.costUnit).toBe("월");
    expect(card.tone).toBe("brand");
  });

  it("가격 미상(null) + 시간/난이도 없음 → 가격 문의 & 빈 meta", async () => {
    h.state.result = {
      data: [
        makeRow({
          category: "food",
          cost_krw: null,
          difficulty: null,
          time_start_hour: null,
          time_end_hour: null,
        }),
      ],
      error: null,
    };
    const { fetchOpportunities } = await import("./opportunities");

    const { data } = await fetchOpportunities();
    const card = data[0];

    expect(card.costLabel).toBe("가격 문의");
    expect(card.meta).toEqual([]);
    expect(card.costKrw).toBeUndefined();
  });

  it("여러 row를 순서 보존하며 모두 변환", async () => {
    h.state.result = {
      data: [
        makeRow({ id: "a", category: "culture" }),
        makeRow({ id: "b", category: "active" }),
        makeRow({ id: "c", category: "side_job", cost_krw: 300_000 }),
      ],
      error: null,
    };
    const { fetchOpportunities } = await import("./opportunities");

    const { data, status } = await fetchOpportunities();

    expect(status).toBe("ok");
    expect(data.map((d) => d.id)).toEqual(["a", "b", "c"]);
    expect(data.map((d) => d.tone)).toEqual(["brand", "mint", "brand"]);
  });
});
