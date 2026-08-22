/**
 * apps/mobile/lib/auth.ts 계약 테스트.
 *
 * 카카오 OAuth 왕복(signInWithKakao) · 로컬→계정 승격(promoteLocalToAccount) ·
 * 서버 저장 목록 동기화(pullSavedFromServer) · 세션 부트스트랩(initAuthListener)을 검증한다.
 * supabase는 opportunities.test.ts와 동일한 getter 기반 목업으로 null/mock을
 * 케이스마다 교체한다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { state } = vi.hoisted(() => ({
  state: {
    client: null as null | Record<string, ReturnType<typeof vi.fn>>,
  },
}));

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return state.client;
  },
}));

const { storeState } = vi.hoisted(() => ({
  storeState: {
    anchors: {} as Record<string, unknown>,
    savedIds: [] as string[],
    setUser: vi.fn(),
    setSavedIds: vi.fn(),
  },
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: {
    getState: () => storeState,
  },
}));

const linkingMocks = vi.hoisted(() => ({
  createURL: vi.fn(() => "motungi://auth/callback"),
  parse: vi.fn(() => ({ queryParams: undefined as Record<string, unknown> | undefined })),
}));

vi.mock("expo-linking", () => ({
  createURL: linkingMocks.createURL,
  parse: linkingMocks.parse,
}));

const webBrowserMocks = vi.hoisted(() => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}));

vi.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: webBrowserMocks.maybeCompleteAuthSession,
  openAuthSessionAsync: webBrowserMocks.openAuthSessionAsync,
}));

import {
  initAuthListener,
  promoteLocalToAccount,
  pullSavedFromServer,
  signInWithKakao,
  signOut,
} from "./auth";

type SessionUser = { id: string; user_metadata?: Record<string, unknown> };

/** saved_opportunities/profiles upsert 체인을 흉내내는 최소 mock 클라이언트. */
function makeClient(overrides: Partial<{ signInWithOAuthResult: unknown }> = {}) {
  const signInWithOAuth = vi.fn(
    async () => overrides.signInWithOAuthResult ?? { data: { url: "https://kakao.example/auth" }, error: null },
  );
  const exchangeCodeForSession = vi.fn<(code: string) => Promise<{ error: { message: string } | null }>>(
    async () => ({ error: null }),
  );
  const signOut = vi.fn(async () => undefined);
  const getSession = vi.fn<() => Promise<{ data: { session: { user: SessionUser } | null } }>>(
    async () => ({ data: { session: null } }),
  );
  const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));

  const upsert = vi.fn(async () => ({ data: null, error: null }));
  const eq = vi.fn<(column: string, value: string) => Promise<{ data: { opportunity_id: string }[] | null; error: null }>>(
    async () => ({ data: [], error: null }),
  );
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ upsert, select }));

  return {
    auth: { signInWithOAuth, exchangeCodeForSession, signOut, getSession, onAuthStateChange },
    from,
    __upsert: upsert,
    __eq: eq,
    __select: select,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.client = null;
  storeState.anchors = {};
  storeState.savedIds = [];
  linkingMocks.createURL.mockReturnValue("motungi://auth/callback");
  linkingMocks.parse.mockReturnValue({ queryParams: undefined });
  webBrowserMocks.openAuthSessionAsync.mockResolvedValue({ type: "success", url: "motungi://auth/callback?code=abc" });
});

describe("signInWithKakao", () => {
  it("supabase가 설정되지 않았으면 에러를 반환한다", async () => {
    state.client = null;

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "Supabase 미설정" });
  });

  it("signInWithOAuth가 에러를 반환하면 그 메시지를 반환한다", async () => {
    const client = makeClient({
      signInWithOAuthResult: { data: null, error: { message: "OAuth 초기화 실패" } },
    });
    state.client = client as unknown as typeof state.client;

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "OAuth 초기화 실패" });
  });

  it("signInWithOAuth가 data.url 없이 성공하면 기본 에러 메시지를 반환한다", async () => {
    const client = makeClient({ signInWithOAuthResult: { data: null, error: null } });
    state.client = client as unknown as typeof state.client;

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "로그인 URL 생성 실패" });
  });

  it("openAuthSessionAsync가 cancel이면 취소 메시지를 반환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    webBrowserMocks.openAuthSessionAsync.mockResolvedValue({ type: "cancel" });

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "로그인이 취소됐어요" });
  });

  it("openAuthSessionAsync가 그 외 실패 타입이면 일반 실패 메시지를 반환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    webBrowserMocks.openAuthSessionAsync.mockResolvedValue({ type: "dismiss" });

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "로그인 실패" });
  });

  it("콜백 URL에 code가 없으면 인증 코드 누락 메시지를 반환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    linkingMocks.parse.mockReturnValue({ queryParams: {} });

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "인증 코드를 받지 못했어요" });
  });

  it("콜백 URL의 code가 문자열이 아니면 인증 코드 누락 메시지를 반환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    linkingMocks.parse.mockReturnValue({ queryParams: { code: 12345 } });

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "인증 코드를 받지 못했어요" });
  });

  it("exchangeCodeForSession이 에러를 반환하면 그 메시지를 반환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    linkingMocks.parse.mockReturnValue({ queryParams: { code: "abc" } });
    client.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "세션 교환 실패" } });

    const result = await signInWithKakao();

    expect(result).toEqual({ error: "세션 교환 실패" });
  });

  it("전체 왕복이 성공하면 빈 객체를 반환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    linkingMocks.parse.mockReturnValue({ queryParams: { code: "abc" } });

    const result = await signInWithKakao();

    expect(result).toEqual({});
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });
});

describe("signOut", () => {
  it("supabase가 없으면 아무 것도 하지 않는다", async () => {
    state.client = null;

    await expect(signOut()).resolves.toBeUndefined();
  });

  it("supabase가 있으면 auth.signOut을 호출한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;

    await signOut();

    expect(client.auth.signOut).toHaveBeenCalled();
  });
});

describe("promoteLocalToAccount", () => {
  it("savedIds가 있으면 saved_opportunities upsert가 호출된다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    storeState.savedIds = ["op-1", "op-2"];

    await promoteLocalToAccount("user-1");

    expect(client.from).toHaveBeenCalledWith("saved_opportunities");
    expect(client.__upsert).toHaveBeenCalledWith(
      [
        { user_id: "user-1", opportunity_id: "op-1" },
        { user_id: "user-1", opportunity_id: "op-2" },
      ],
      { onConflict: "user_id,opportunity_id", ignoreDuplicates: true },
    );
  });

  it("savedIds가 비어있으면 saved_opportunities upsert가 호출되지 않는다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    storeState.savedIds = [];

    await promoteLocalToAccount("user-1");

    expect(client.from).not.toHaveBeenCalledWith("saved_opportunities");
  });

  it("profiles upsert에 anchors.home/work 필드가 올바르게 매핑된다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    storeState.anchors = {
      home: { admCode: "11110", dongName: "청운동" },
      work: { admCode: "11680", dongName: "역삼동" },
    };

    await promoteLocalToAccount("user-1");

    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.__upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        home_adm_code: "11110",
        home_dong_name: "청운동",
        work_adm_code: "11680",
        work_dong_name: "역삼동",
      },
      { onConflict: "id" },
    );
  });

  it("anchors가 비어있으면 profiles upsert 필드가 null로 채워진다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    storeState.anchors = {};

    await promoteLocalToAccount("user-1");

    expect(client.__upsert).toHaveBeenCalledWith(
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

  it("supabase가 없으면 아무 것도 하지 않는다", async () => {
    state.client = null;

    await expect(promoteLocalToAccount("user-1")).resolves.toBeUndefined();
  });
});

describe("pullSavedFromServer", () => {
  it("supabase가 없으면 빈 배열을 반환한다", async () => {
    state.client = null;

    const result = await pullSavedFromServer("user-1");

    expect(result).toEqual([]);
  });

  it("서버 saved_opportunities 목록을 opportunity_id 배열로 변환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    client.__eq.mockResolvedValue({
      data: [{ opportunity_id: "op-1" }, { opportunity_id: "op-2" }],
      error: null,
    });

    const result = await pullSavedFromServer("user-1");

    expect(client.from).toHaveBeenCalledWith("saved_opportunities");
    expect(client.__select).toHaveBeenCalledWith("opportunity_id");
    expect(client.__eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual(["op-1", "op-2"]);
  });

  it("data가 null이면 빈 배열을 반환한다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    client.__eq.mockResolvedValue({ data: null, error: null });

    const result = await pullSavedFromServer("user-1");

    expect(result).toEqual([]);
  });
});

describe("initAuthListener", () => {
  it("supabase가 없으면 no-op cleanup 함수를 반환한다", () => {
    state.client = null;

    const cleanup = initAuthListener();

    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
  });

  it("userId가 null이면 setUser(null)만 호출되고 승격/동기화는 호출되지 않는다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    client.auth.getSession.mockResolvedValue({ data: { session: null } });

    initAuthListener();
    await vi.waitFor(() => expect(storeState.setUser).toHaveBeenCalledWith(null));

    expect(client.from).not.toHaveBeenCalled();
    expect(storeState.setSavedIds).not.toHaveBeenCalled();
  });

  it("서버·로컬 saved id가 중복 없이 병합된다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1", user_metadata: { name: "카를로스" } } } },
    });
    client.__eq.mockResolvedValue({
      data: [{ opportunity_id: "op-1" }, { opportunity_id: "op-2" }],
      error: null,
    });
    storeState.savedIds = ["op-2", "op-3"];

    initAuthListener();
    await vi.waitFor(() => expect(storeState.setSavedIds).toHaveBeenCalled());

    const merged = storeState.setSavedIds.mock.calls[0]![0] as string[];
    expect(new Set(merged)).toEqual(new Set(["op-1", "op-2", "op-3"]));
    expect(merged).toHaveLength(3);
    expect(storeState.setUser).toHaveBeenCalledWith({ id: "user-1", displayName: "카를로스" });
  });

  it("user_metadata.name이 문자열이 아니면(undefined) displayName은 undefined로 전달된다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1", user_metadata: {} } } },
    });

    initAuthListener();
    await vi.waitFor(() => expect(storeState.setUser).toHaveBeenCalled());

    expect(storeState.setUser).toHaveBeenCalledWith({ id: "user-1", displayName: undefined });
  });

  it("user_metadata.name이 문자열이 아니면(number) displayName은 undefined로 전달된다", async () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    client.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1", user_metadata: { name: 42 } } } },
    });

    initAuthListener();
    await vi.waitFor(() => expect(storeState.setUser).toHaveBeenCalled());

    expect(storeState.setUser).toHaveBeenCalledWith({ id: "user-1", displayName: undefined });
  });

  it("cleanup 호출 시 구독이 해제된다", () => {
    const client = makeClient();
    state.client = client as unknown as typeof state.client;
    const unsubscribe = vi.fn();
    client.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const cleanup = initAuthListener();
    cleanup();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
