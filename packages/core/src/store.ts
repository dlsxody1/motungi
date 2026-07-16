/**
 * 앱 전역 상태 팩토리 (웹·앱 공용).
 * 화면 간 공유가 필요한: 위치 앵커 · 진단 답변 · 스코어링 결과 · 저장 목록.
 * persist 미들웨어로 영속화. 로그인 전에는 이 로컬 상태가 진실.
 *
 * core는 React 훅 바인딩을 모른다("zustand"의 create가 아니라 "zustand/vanilla"의
 * createStore만 사용) — 훅 바인딩은 앱(web/mobile) 쪽 책임.
 * 또한 core는 @supabase/supabase-js를 의존하지 않는다 — toggleSaved가 필요로 하는
 * 최소한의 구조적 인터페이스(SavedOpportunitiesClient)만 정의해 실제
 * SupabaseClient가 구조적으로 이를 만족하도록 한다.
 */
import type { StateStorage } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { DiagnosisAnswers } from "./diagnosis";
import type { Location, UserAnchors } from "./types";

export type AnchorSlot = "home" | "work";

/** 최소 사용자 정보(카카오 로그인). null이면 게스트. */
export interface AuthUser {
  id: string;
  displayName?: string;
}

/**
 * toggleSaved의 서버 동기화에 필요한 최소 구조적 인터페이스.
 * 실제 SupabaseClient(`from().upsert()` / `from().delete().eq().eq()` 체인)가
 * 구조적으로 이를 만족한다. core는 @supabase/supabase-js를 의존하지 않는다.
 */
export interface SavedOpportunitiesClient {
  from(table: "saved_opportunities"): {
    upsert(
      values: { user_id: string; opportunity_id: string },
      options: { onConflict: string },
    ): unknown;
    delete(): {
      eq(
        column: "user_id" | "opportunity_id",
        value: string,
      ): { eq(column: "user_id" | "opportunity_id", value: string): unknown };
    };
  };
}

export interface AppState<
  TOpportunity extends { id: string },
  TCatalogStatus extends string,
> {
  anchors: UserAnchors;
  answers: DiagnosisAnswers | null;
  /** 스코어링 결과(원픽 + 함께보면좋아요). 로딩 화면에서 채워진다. */
  results: TOpportunity[];
  /** 전체 활동 카탈로그(서버 실데이터). 탐색/상세/보관함이 참조. 세션 캐시. */
  catalog: TOpportunity[];
  /** 카탈로그 로드 상태. 아직 안 불러왔으면 "idle". */
  catalogStatus: TCatalogStatus | "idle";
  savedIds: string[];
  /** 로그인 사용자. null = 게스트. */
  user: AuthUser | null;

  setAnchor: (slot: AnchorSlot, location: Location) => void;
  setAnswers: (answers: DiagnosisAnswers) => void;
  setResults: (results: TOpportunity[]) => void;
  setCatalog: (catalog: TOpportunity[], status: TCatalogStatus) => void;
  setUser: (user: AuthUser | null) => void;
  setSavedIds: (ids: string[]) => void;
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
}

export interface CreateAppStoreDeps {
  /** zustand StateStorage(sync/async 겸용). 웹은 localStorage, 앱은 AsyncStorage 등. */
  storage: StateStorage;
  /** 로그인 시 저장 목록 서버 동기화용. 게스트 전용이면 null. */
  supabase: SavedOpportunitiesClient | null;
}

/**
 * 앱 전역 상태 스토어 팩토리.
 * `TOpportunity`/`TCatalogStatus`는 앱별 도메인 타입(MockOpportunity/CatalogStatus)을
 * core가 알 필요 없게 하기 위한 제네릭.
 */
export function createAppStore<
  TOpportunity extends { id: string },
  TCatalogStatus extends string,
>(
  deps: CreateAppStoreDeps,
): StoreApi<AppState<TOpportunity, TCatalogStatus>> {
  return createStore<AppState<TOpportunity, TCatalogStatus>>()(
    persist(
      (set, get) => ({
        anchors: {},
        answers: null,
        results: [],
        catalog: [],
        catalogStatus: "idle",
        savedIds: [],
        user: null,

        setAnchor: (slot, location) =>
          set((s) => ({ anchors: { ...s.anchors, [slot]: location } })),
        setAnswers: (answers) => set({ answers }),
        setResults: (results) => set({ results }),
        setCatalog: (catalog, status) =>
          set({ catalog, catalogStatus: status }),
        setUser: (user) => set({ user }),
        setSavedIds: (savedIds) => set({ savedIds }),
        toggleSaved: (id) => {
          const s = get();
          const wasSaved = s.savedIds.includes(id);
          set({
            savedIds: wasSaved
              ? s.savedIds.filter((x) => x !== id)
              : [...s.savedIds, id],
          });
          // 로그인 상태면 서버에도 반영(비로그인은 로컬만).
          const userId = s.user?.id;
          if (userId && deps.supabase) {
            if (wasSaved) {
              void deps.supabase
                .from("saved_opportunities")
                .delete()
                .eq("user_id", userId)
                .eq("opportunity_id", id);
            } else {
              void deps.supabase
                .from("saved_opportunities")
                .upsert(
                  { user_id: userId, opportunity_id: id },
                  { onConflict: "user_id,opportunity_id" },
                );
            }
          }
        },
        isSaved: (id) => get().savedIds.includes(id),
      }),
      {
        name: "motungi-app",
        storage: createJSONStorage(() => deps.storage),
        // 결과는 파생 데이터라 영속화하지 않음(진단 시 재계산).
        partialize: (s) => ({
          anchors: s.anchors,
          answers: s.answers,
          savedIds: s.savedIds,
        }),
      },
    ),
  );
}
