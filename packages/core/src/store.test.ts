/**
 * createAppStore(zustand vanilla) 팩토리의 상태 전이를 검증한다.
 * 실제 앱(web/mobile)의 SavedOpportunitiesClient(supabase)는 체이너블 가짜로,
 * StateStorage(persist용)는 동기/비동기 두 버전 모두로 주입해 팩토리가
 * 두 환경(localStorage sync, AsyncStorage async) 모두를 지원함을 확인한다.
 */
import type { StateStorage } from "zustand/middleware";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore, type SavedOpportunitiesClient } from "./store";

interface TestOpportunity {
  id: string;
  title: string;
}

type TestCatalogStatus = "ok" | "empty" | "error";

/** 저장 목록 서버 동기화용 체이너블 가짜 supabase 클라이언트. */
function createFakeSupabase() {
  const eq = vi.fn(() => chain);
  const del = vi.fn(() => chain);
  const upsert = vi.fn(() => chain);
  const chain = { eq, delete: del, upsert } as const;
  const from = vi.fn((..._args: unknown[]) => chain);
  const client: SavedOpportunitiesClient = {
    from: (table) => from(table) as never,
  };
  return { client, from, del, upsert, eq };
}

/** 동기 in-memory StateStorage (localStorage와 동일한 계약). */
function createSyncStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: (name) => {
      map.delete(name);
    },
  };
}

/** 비동기(Promise) in-memory StateStorage (AsyncStorage와 동일한 계약). */
function createAsyncStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (name) => map.get(name) ?? null,
    setItem: async (name, value) => {
      map.set(name, value);
    },
    removeItem: async (name) => {
      map.delete(name);
    },
  };
}

const OPP: TestOpportunity = { id: "op-1", title: "망원동 동네 전시" };

describe("createAppStore", () => {
  describe("동기 storage(localStorage 계약)로 인스턴스화", () => {
    let supa: ReturnType<typeof createFakeSupabase>;
    let store: ReturnType<
      typeof createAppStore<TestOpportunity, TestCatalogStatus>
    >;

    beforeEach(() => {
      supa = createFakeSupabase();
      store = createAppStore<TestOpportunity, TestCatalogStatus>({
        storage: createSyncStorage(),
        supabase: supa.client,
      });
    });

    it("초기 상태는 게스트 기본값이다", () => {
      const s = store.getState();
      expect(s.anchors).toEqual({});
      expect(s.answers).toBeNull();
      expect(s.results).toEqual([]);
      expect(s.catalog).toEqual([]);
      expect(s.catalogStatus).toBe("idle");
      expect(s.savedIds).toEqual([]);
      expect(s.user).toBeNull();
    });

    it("setAnchor는 슬롯별로 병합하며 다른 슬롯을 덮지 않는다", () => {
      const home = { dongName: "망원동" };
      const work = { dongName: "역삼동" };

      store.getState().setAnchor("home", home);
      expect(store.getState().anchors).toEqual({ home });

      store.getState().setAnchor("work", work);
      expect(store.getState().anchors).toEqual({ home, work });

      const home2 = { dongName: "합정동" };
      store.getState().setAnchor("home", home2);
      expect(store.getState().anchors).toEqual({ home: home2, work });
    });

    it("setAnswers / setResults / setUser / setSavedIds가 각 슬라이스를 교체한다", () => {
      const answers = {
        interests: ["culture"] as const,
        timeSlot: "evening",
        energy: "low",
      } as never;
      store.getState().setAnswers(answers);
      expect(store.getState().answers).toBe(answers);

      store.getState().setResults([OPP]);
      expect(store.getState().results).toEqual([OPP]);

      const user = { id: "u1", displayName: "카를로스" };
      store.getState().setUser(user);
      expect(store.getState().user).toEqual(user);

      store.getState().setUser(null);
      expect(store.getState().user).toBeNull();

      store.getState().setSavedIds(["a", "b"]);
      expect(store.getState().savedIds).toEqual(["a", "b"]);
    });

    it("setCatalog는 catalog와 status를 함께 설정한다", () => {
      store.getState().setCatalog([OPP], "ok");
      expect(store.getState().catalog).toEqual([OPP]);
      expect(store.getState().catalogStatus).toBe("ok");

      store.getState().setCatalog([], "empty");
      expect(store.getState().catalog).toEqual([]);
      expect(store.getState().catalogStatus).toBe("empty");
    });

    it("toggleSaved는 없으면 추가하고 있으면 제거한다(토글)", () => {
      store.getState().toggleSaved("op-1");
      expect(store.getState().savedIds).toEqual(["op-1"]);

      store.getState().toggleSaved("op-1");
      expect(store.getState().savedIds).toEqual([]);
    });

    it("toggleSaved는 기존 목록을 유지한 채 대상만 토글한다", () => {
      store.getState().setSavedIds(["x", "op-1", "y"]);

      store.getState().toggleSaved("op-1"); // 제거
      expect(store.getState().savedIds).toEqual(["x", "y"]);

      store.getState().toggleSaved("z"); // 추가는 뒤에 append
      expect(store.getState().savedIds).toEqual(["x", "y", "z"]);
    });

    it("isSaved는 현재 savedIds 포함 여부를 반환한다", () => {
      expect(store.getState().isSaved("p1")).toBe(false);
      store.getState().toggleSaved("p1");
      expect(store.getState().isSaved("p1")).toBe(true);
      store.getState().toggleSaved("p1");
      expect(store.getState().isSaved("p1")).toBe(false);
    });

    it("게스트(user=null)면 toggleSaved가 supabase를 호출하지 않는다", () => {
      store.getState().toggleSaved("op-1");
      expect(supa.from).not.toHaveBeenCalled();
      expect(supa.upsert).not.toHaveBeenCalled();
      expect(supa.del).not.toHaveBeenCalled();
    });

    it("로그인 상태에서 추가하면 saved_opportunities에 upsert한다", () => {
      store.getState().setUser({ id: "u1" });

      store.getState().toggleSaved("op-1");

      expect(supa.from).toHaveBeenCalledWith("saved_opportunities");
      expect(supa.upsert).toHaveBeenCalledWith(
        { user_id: "u1", opportunity_id: "op-1" },
        { onConflict: "user_id,opportunity_id" },
      );
      expect(supa.del).not.toHaveBeenCalled();
    });

    it("로그인 상태에서 제거하면 user_id/opportunity_id로 delete한다", () => {
      store.getState().setUser({ id: "u1" });
      store.getState().setSavedIds(["op-1"]);

      store.getState().toggleSaved("op-1");

      expect(supa.from).toHaveBeenCalledWith("saved_opportunities");
      expect(supa.del).toHaveBeenCalledTimes(1);
      expect(supa.eq).toHaveBeenNthCalledWith(1, "user_id", "u1");
      expect(supa.eq).toHaveBeenNthCalledWith(2, "opportunity_id", "op-1");
      expect(supa.upsert).not.toHaveBeenCalled();
    });

    it("로그아웃 후 toggleSaved는 다시 로컬 전용이 된다", () => {
      store.getState().setUser({ id: "u1" });
      store.getState().setUser(null);
      supa.from.mockClear();

      store.getState().toggleSaved("x");
      expect(supa.from).not.toHaveBeenCalled();
      expect(store.getState().savedIds).toEqual(["x"]);
    });

    it("supabase가 null(게스트 전용 인스턴스)이면 어떤 경우에도 호출하지 않는다", () => {
      const guestOnlyStore = createAppStore<TestOpportunity, TestCatalogStatus>(
        { storage: createSyncStorage(), supabase: null },
      );
      guestOnlyStore.getState().setUser({ id: "u1" });
      expect(() => guestOnlyStore.getState().toggleSaved("op-1")).not.toThrow();
      expect(guestOnlyStore.getState().savedIds).toEqual(["op-1"]);
    });
  });

  describe("persist partialize", () => {
    it("anchors/answers/savedIds만 영속화하고 results/catalog/catalogStatus는 제외한다", async () => {
      const storage = createSyncStorage();
      const store = createAppStore<TestOpportunity, TestCatalogStatus>({
        storage,
        supabase: null,
      });

      store.getState().setAnchor("home", { dongName: "망원동" });
      store.getState().setAnswers({
        interests: ["culture"],
        timeSlot: "evening",
        energy: "low",
      } as never);
      store.getState().setSavedIds(["p1", "p2"]);
      store.getState().setResults([OPP]);
      store.getState().setCatalog([OPP], "ok");

      const raw = storage.getItem("motungi-app");
      expect(raw).not.toBeNull();
      const persisted = JSON.parse(raw as string);

      expect(persisted.state).toEqual({
        anchors: { home: { dongName: "망원동" } },
        answers: {
          interests: ["culture"],
          timeSlot: "evening",
          energy: "low",
        },
        savedIds: ["p1", "p2"],
      });
      expect(persisted.state.results).toBeUndefined();
      expect(persisted.state.catalog).toBeUndefined();
      expect(persisted.state.catalogStatus).toBeUndefined();
    });
  });

  describe("비동기 storage(AsyncStorage 계약)로 인스턴스화", () => {
    it("동기 시나리오와 동일하게 동작하고 setItem이 비동기로 호출된다", async () => {
      const storage = createAsyncStorage();
      const setItemSpy = vi.spyOn(storage, "setItem");
      const supa = createFakeSupabase();
      const store = createAppStore<TestOpportunity, TestCatalogStatus>({
        storage,
        supabase: supa.client,
      });

      store.getState().setUser({ id: "u1" });
      store.getState().toggleSaved("op-1");

      expect(store.getState().savedIds).toEqual(["op-1"]);
      expect(supa.upsert).toHaveBeenCalledWith(
        { user_id: "u1", opportunity_id: "op-1" },
        { onConflict: "user_id,opportunity_id" },
      );

      // persist 미들웨어가 비동기 storage에도 쓰기를 시도한다(await로 반영 대기).
      await Promise.resolve();
      expect(setItemSpy).toHaveBeenCalled();
    });
  });
});
