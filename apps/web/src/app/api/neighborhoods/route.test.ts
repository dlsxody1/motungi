/**
 * /api/neighborhoods 검색 라우트 테스트.
 * supabase 클라이언트를 모킹해 쿼리 계약(ilike 패턴·limit)과 응답 매핑을 검증한다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// @/lib/supabase의 `supabase`를 테스트별로 교체할 수 있도록 mock 훅을 노출.
const state: { supabase: unknown } = { supabase: null };
vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return state.supabase;
  },
}));

import { GET } from "./route";

function req(q: string | null): Request {
  const url = q === null ? "http://x/api/neighborhoods" : `http://x/api/neighborhoods?q=${encodeURIComponent(q)}`;
  return new Request(url);
}

/** or().order().order().limit() 체인 fake. order는 자기 자신을 반환(2회 체이닝). */
function makeClient(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const order: ReturnType<typeof vi.fn> = vi.fn(() => ({ order, limit }));
  const or = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ or }));
  const from = vi.fn(() => ({ select }));
  return { from, select, or, order, limit };
}

afterEach(() => {
  state.supabase = null;
  vi.clearAllMocks();
});

describe("GET /api/neighborhoods", () => {
  it("빈 검색어는 조회 없이 빈 배열을 반환한다", async () => {
    const client = makeClient({ data: [], error: null });
    state.supabase = client;

    const res = await GET(req(""));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("supabase 미설정이면 503", async () => {
    state.supabase = null;
    const res = await GET(req("역삼"));
    expect(res.status).toBe(503);
  });

  it("검색어를 ilike 부분일치로 조회하고 결과를 매핑한다", async () => {
    const client = makeClient({
      data: [
        {
          adm_code: "SEO-강남구-역삼1동",
          dong_name: "역삼1동",
          dong_display: "역삼동",
          sigungu: "강남구",
          lat: 37.5,
          lng: 127.0,
        },
      ],
      error: null,
    });
    state.supabase = client;

    const res = await GET(req("역삼"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      // 표시명(역삼동)으로 내려간다 — 사용자는 "역삼1동"이 아니라 "역삼동"에 산다고 말한다.
      items: [
        { admCode: "SEO-강남구-역삼1동", dongName: "역삼동", sigungu: "강남구", lat: 37.5, lng: 127.0 },
      ],
    });
    expect(client.from).toHaveBeenCalledWith("neighborhoods");
    expect(client.or).toHaveBeenCalledWith(
      "dong_display.ilike.%역삼%,dong_base.ilike.%역삼%,sigungu.ilike.%역삼%");
  });

  // 이 라우트가 고치려던 실제 버그: 테이블은 "역삼1동"을 저장하는데 사용자는 "역삼동"을 친다.
  // dong_name으로는 절대 안 잡히므로(426개 중 274개 도달 불가) 정규화 컬럼을 조회해야 한다.
  it("법정동명('역삼동')은 정규화 컬럼으로 조회한다", async () => {
    const client = makeClient({ data: [], error: null });
    state.supabase = client;

    await GET(req("역삼동"));
    expect(client.or).toHaveBeenCalledWith(
      "dong_display.ilike.%역삼동%,dong_base.ilike.%역삼동%,sigungu.ilike.%역삼동%");
    // dong_name 직접 비교로 돌아가면 이 버그가 재발한다.
    expect(client.or).not.toHaveBeenCalledWith(expect.stringContaining("dong_name.ilike"));
  });

  // 표시명은 '가'까지 빼므로(금호1가동 → 금호동), 화면에 보이는 이름으로 검색이 안 되면 안 된다.
  // dong_base('금호가동')만 조회하던 시절 "금호동"·"성수동"이 0건이던 회귀를 막는다.
  it("화면에 보이는 표시명(dong_display)으로도 조회한다", async () => {
    const client = makeClient({ data: [], error: null });
    state.supabase = client;

    await GET(req("금호동"));
    expect(client.or).toHaveBeenCalledWith(expect.stringContaining("dong_display.ilike.%금호동%"));
  });

  it("구 이름('강남구')도 sigungu로 조회된다", async () => {
    const client = makeClient({ data: [], error: null });
    state.supabase = client;

    await GET(req("강남구"));
    expect(client.or).toHaveBeenCalledWith(
      "dong_display.ilike.%강남구%,dong_base.ilike.%강남구%,sigungu.ilike.%강남구%");
  });

  it("LIKE 메타문자(%,_)는 리터럴로 이스케이프한다", async () => {
    const client = makeClient({ data: [], error: null });
    state.supabase = client;

    await GET(req("100%_동"));
    expect(client.or).toHaveBeenCalledWith(
      "dong_display.ilike.%100\\%\\_동%,dong_base.ilike.%100\\%\\_동%,sigungu.ilike.%100\\%\\_동%",
    );
  });

  // 쉼표·괄호는 PostgREST or() 문법의 구분자라 그대로 두면 필터가 깨진다.
  it("쉼표·괄호는 or() 문법을 깨지 않도록 공백으로 치환한다", async () => {
    const client = makeClient({ data: [], error: null });
    state.supabase = client;

    await GET(req("역삼,동"));
    expect(client.or).toHaveBeenCalledWith(
      "dong_display.ilike.%역삼 동%,dong_base.ilike.%역삼 동%,sigungu.ilike.%역삼 동%");
  });

  // 사용자는 "개포1동/2동/3동/4동"이 아니라 "개포동"을 고른다.
  it("같은 동네의 번호별 행정동은 하나로 묶어 표시명으로 내려준다", async () => {
    const row = (n: number) => ({
      adm_code: `SEO-강남구-개포${n}동`,
      dong_name: `개포${n}동`,
      dong_display: "개포동",
      sigungu: "강남구",
      lat: 37.4,
      lng: 127.05,
    });
    const client = makeClient({ data: [row(1), row(2), row(3), row(4)], error: null });
    state.supabase = client;

    const res = await GET(req("개포"));
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].dongName).toBe("개포동");
    // 대표는 첫 행정동 — 앵커는 좌표로 동작하므로 대표 admCode면 충분하다.
    expect(body.items[0].admCode).toBe("SEO-강남구-개포1동");
  });

  it("구가 다르면 같은 표시명이어도 따로 내려준다(신사동: 강남구·관악구)", async () => {
    const client = makeClient({
      data: [
        { adm_code: "a", dong_name: "신사동", dong_display: "신사동", sigungu: "강남구", lat: 37.5, lng: 127.0 },
        { adm_code: "b", dong_name: "신사동", dong_display: "신사동", sigungu: "관악구", lat: 37.4, lng: 126.9 },
      ],
      error: null,
    });
    state.supabase = client;

    const body = await (await GET(req("신사동"))).json();
    expect(body.items).toHaveLength(2);
    expect(body.items.map((i: { sigungu: string }) => i.sigungu)).toEqual(["강남구", "관악구"]);
  });

  it("조회 실패면 502", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });
    state.supabase = client;

    const res = await GET(req("역삼"));
    expect(res.status).toBe(502);
  });
});
