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

/** ilike().order().limit() 체인 fake. limit이 결과를 resolve. */
function makeClient(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn(() => ({ limit }));
  const ilike = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ ilike }));
  const from = vi.fn(() => ({ select }));
  return { from, select, ilike, order, limit };
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
        { adm_code: "SEO-강남구-역삼1동", dong_name: "역삼1동", sigungu: "강남구", lat: 37.5, lng: 127.0 },
      ],
      error: null,
    });
    state.supabase = client;

    const res = await GET(req("역삼"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [
        { admCode: "SEO-강남구-역삼1동", dongName: "역삼1동", sigungu: "강남구", lat: 37.5, lng: 127.0 },
      ],
    });
    expect(client.from).toHaveBeenCalledWith("neighborhoods");
    expect(client.ilike).toHaveBeenCalledWith("dong_name", "%역삼%");
  });

  it("LIKE 메타문자(%,_)는 리터럴로 이스케이프한다", async () => {
    const client = makeClient({ data: [], error: null });
    state.supabase = client;

    await GET(req("100%_동"));
    expect(client.ilike).toHaveBeenCalledWith("dong_name", "%100\\%\\_동%");
  });

  it("조회 실패면 502", async () => {
    const client = makeClient({ data: null, error: { message: "boom" } });
    state.supabase = client;

    const res = await GET(req("역삼"));
    expect(res.status).toBe(502);
  });
});
