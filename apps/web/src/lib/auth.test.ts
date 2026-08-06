/**
 * @/lib/auth의 promoteLocalToAccount 테스트.
 * 로그인 직후 로컬 상태(anchors/savedIds)를 서버(profiles/saved_opportunities)로
 * 승격하는 함수. supabase·useAppStore 둘 다 모킹해 upsert 호출 계약을 검증한다.
 * supabase 모킹은 api/neighborhoods/route.test.ts의 swappable state 관례를 따른다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const state: { supabase: unknown } = { supabase: null };
vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return state.supabase;
  },
}));

interface FakeAnchors {
  home?: { admCode?: string; dongName?: string };
  work?: { admCode?: string; dongName?: string };
}

const appState: { anchors: FakeAnchors; savedIds: string[] } = {
  anchors: {},
  savedIds: [],
};
vi.mock("@/store/useAppStore", () => ({
  useAppStore: {
    getState: () => appState,
  },
}));

import { promoteLocalToAccount } from "./auth";

/** from().upsert() 체인 fake. 두 테이블 모두 upsert 후 체이닝 없이 바로 await된다. */
function makeClient() {
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi.fn(() => ({ upsert }));
  return { from, upsert };
}

afterEach(() => {
  state.supabase = null;
  appState.anchors = {};
  appState.savedIds = [];
  vi.clearAllMocks();
});

describe("promoteLocalToAccount", () => {
  it("supabase가 미설정이면 즉시 반환하고 아무 upsert도 호출하지 않는다", async () => {
    state.supabase = null;
    appState.anchors = { home: { admCode: "11", dongName: "역삼동" } };
    appState.savedIds = ["opp-1"];

    // 예외 없이 끝나야 하고, from()을 부를 클라이언트 자체가 없으므로 호출 흔적이 없어야 한다.
    await expect(promoteLocalToAccount("user-1")).resolves.toBeUndefined();
  });

  it("anchors와 savedIds가 모두 있으면 profiles·saved_opportunities 둘 다 upsert한다", async () => {
    const client = makeClient();
    state.supabase = client;
    appState.anchors = {
      home: { admCode: "11", dongName: "역삼동" },
      work: { admCode: "22", dongName: "성수동" },
    };
    appState.savedIds = ["opp-1", "opp-2"];

    await promoteLocalToAccount("user-1");

    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        home_adm_code: "11",
        home_dong_name: "역삼동",
        work_adm_code: "22",
        work_dong_name: "성수동",
      },
      { onConflict: "id" },
    );

    expect(client.from).toHaveBeenCalledWith("saved_opportunities");
    expect(client.upsert).toHaveBeenCalledWith(
      [
        { user_id: "user-1", opportunity_id: "opp-1" },
        { user_id: "user-1", opportunity_id: "opp-2" },
      ],
      { onConflict: "user_id,opportunity_id", ignoreDuplicates: true },
    );
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it("anchors가 비어 있으면 null 필드로 profiles를 upsert한다", async () => {
    const client = makeClient();
    state.supabase = client;
    appState.anchors = {};
    appState.savedIds = [];

    await promoteLocalToAccount("user-1");

    expect(client.upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        home_adm_code: null,
        home_dong_name: null,
        work_adm_code: null,
        work_dong_name: null,
      },
      { onConflict: "id" },
    );
  });

  it("savedIds가 비어 있으면 saved_opportunities upsert는 건너뛴다", async () => {
    const client = makeClient();
    state.supabase = client;
    appState.anchors = { home: { admCode: "11", dongName: "역삼동" } };
    appState.savedIds = [];

    await promoteLocalToAccount("user-1");

    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.from).not.toHaveBeenCalledWith("saved_opportunities");
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(client.upsert).toHaveBeenCalledTimes(1);
  });
});
