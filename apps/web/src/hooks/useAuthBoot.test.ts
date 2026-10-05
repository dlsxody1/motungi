/**
 * initAuthListener — 로컬↔서버 저장 병합과 세션 분기 검증 (M-127).
 * supabase 클라이언트·auth 헬퍼는 전부 mock; store는 실제 zustand 스토어를 쓴다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/useAppStore";
import { initAuthListener } from "./useAuthBoot";

type Session = { user: { id: string; user_metadata?: Record<string, unknown> } } | null;
type AuthCb = (event: string, session: Session) => void;

const h = vi.hoisted(() => ({
  client: null as unknown,
  promote: vi.fn(),
  pull: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return h.client;
  },
}));
vi.mock("@/lib/auth", () => ({
  promoteLocalToAccount: h.promote,
  pullSavedFromServer: h.pull,
}));

function makeClient(session: Session) {
  const unsubscribe = vi.fn();
  let cb: AuthCb | undefined;
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      onAuthStateChange: vi.fn((fn: AuthCb) => {
        cb = fn;
        return { data: { subscription: { unsubscribe } } };
      }),
    },
  };
  return { client, unsubscribe, emit: (e: string, s: Session) => cb?.(e, s) };
}

/** applySession은 fire-and-forget 이라 마이크로태스크를 충분히 비운다. */
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  h.client = null;
  h.promote.mockReset().mockResolvedValue(undefined);
  h.pull.mockReset().mockResolvedValue([]);
  useAppStore.setState({
    anchors: {},
    savedIds: [],
    user: null,
  });
});
afterEach(() => {
  h.client = null;
});

describe("initAuthListener (M-127)", () => {
  it("supabase가 null이면 no-op cleanup을 반환하고 아무것도 호출하지 않는다", () => {
    const cleanup = initAuthListener();
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
    expect(h.promote).not.toHaveBeenCalled();
    expect(h.pull).not.toHaveBeenCalled();
  });

  it("세션+user면 promoteLocalToAccount를 (userId, anchors, savedIds)로 호출하고 savedIds를 합집합으로 만든다", async () => {
    const anchors = { home: { lat: 37.5, lng: 127.0 } } as never;
    useAppStore.setState({ anchors, savedIds: ["a", "b"] });
    h.pull.mockResolvedValue(["b", "c"]);
    const { client } = makeClient({ user: { id: "u1", user_metadata: { name: "민수" } } });
    h.client = client;

    initAuthListener();
    await flush();

    expect(h.promote).toHaveBeenCalledWith("u1", anchors, ["a", "b"]);
    expect(h.pull).toHaveBeenCalledWith("u1");
    expect(useAppStore.getState().savedIds).toEqual(["a", "b", "c"]);
    expect(useAppStore.getState().user).toEqual({ id: "u1", displayName: "민수" });
  });

  it("세션이 없으면(userId==null) setUser(null)만 하고 promote/pull을 부르지 않는다", async () => {
    useAppStore.setState({ user: { id: "old", displayName: "x" } });
    const { client } = makeClient(null);
    h.client = client;

    initAuthListener();
    await flush();

    expect(useAppStore.getState().user).toBeNull();
    expect(h.promote).not.toHaveBeenCalled();
    expect(h.pull).not.toHaveBeenCalled();
  });

  it("user_metadata.name이 문자열이 아니면 displayName은 undefined", async () => {
    const { client } = makeClient({ user: { id: "u2", user_metadata: { name: 123 } } });
    h.client = client;

    initAuthListener();
    await flush();

    const user = useAppStore.getState().user;
    expect(user?.id).toBe("u2");
    expect(user?.displayName).toBeUndefined();
  });

  it("onAuthStateChange가 새 세션을 다시 적용한다", async () => {
    const { client, emit } = makeClient(null);
    h.client = client;
    initAuthListener();
    await flush();
    expect(useAppStore.getState().user).toBeNull();

    emit("SIGNED_IN", { user: { id: "u3", user_metadata: { name: "지은" } } });
    await flush();

    expect(useAppStore.getState().user).toEqual({ id: "u3", displayName: "지은" });
    expect(h.promote).toHaveBeenCalledWith("u3", {}, []);

    emit("SIGNED_OUT", null);
    await flush();
    expect(useAppStore.getState().user).toBeNull();
  });

  it("cleanup이 구독을 해제한다", () => {
    const { client, unsubscribe } = makeClient(null);
    h.client = client;
    const cleanup = initAuthListener();
    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
