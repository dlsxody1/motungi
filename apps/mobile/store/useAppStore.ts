/**
 * 앱 전역 상태 (Expo/RN).
 * 화면 간 공유가 필요한: 위치 앵커 · 진단 답변 · 스코어링 결과 · 저장 목록.
 * AsyncStorage로 영속화해 앱 재시작에도 유지. 로그인 전에는 이 로컬 상태가 진실.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiagnosisAnswers, Location, UserAnchors } from "@motungi/core";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { supabase } from "@/lib/supabase";

type AnchorSlot = "home" | "work";

/** 최소 사용자 정보(카카오 로그인). null이면 게스트. */
export interface AuthUser {
  id: string;
  displayName?: string;
}

interface AppState {
  anchors: UserAnchors;
  answers: DiagnosisAnswers | null;
  /** 스코어링 결과(원픽 + 함께보면좋아요). 로딩 화면에서 채워진다. */
  results: MockOpportunity[];
  /** 전체 활동 카탈로그(서버 실데이터). 탐색/상세/보관함이 참조. 세션 캐시. */
  catalog: MockOpportunity[];
  /** 카탈로그 로드 상태. 아직 안 불러왔으면 "idle". */
  catalogStatus: CatalogStatus | "idle";
  savedIds: string[];
  /** 로그인 사용자. null = 게스트. */
  user: AuthUser | null;

  setAnchor: (slot: AnchorSlot, location: Location) => void;
  setAnswers: (answers: DiagnosisAnswers) => void;
  setResults: (results: MockOpportunity[]) => void;
  setCatalog: (catalog: MockOpportunity[], status: CatalogStatus) => void;
  setUser: (user: AuthUser | null) => void;
  setSavedIds: (ids: string[]) => void;
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
}

export const useAppStore = create<AppState>()(
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
      setCatalog: (catalog, status) => set({ catalog, catalogStatus: status }),
      setUser: (user) => set({ user }),
      setSavedIds: (savedIds) => set({ savedIds }),
      toggleSaved: (id) => {
        const s = get();
        const nextSaved = s.savedIds.includes(id);
        set({
          savedIds: nextSaved
            ? s.savedIds.filter((x) => x !== id)
            : [...s.savedIds, id],
        });
        // 로그인 상태면 서버에도 반영(비로그인은 로컬만).
        const userId = s.user?.id;
        if (userId && supabase) {
          if (nextSaved) {
            void supabase
              .from("saved_opportunities")
              .delete()
              .eq("user_id", userId)
              .eq("opportunity_id", id);
          } else {
            void supabase
              .from("saved_opportunities")
              .upsert({ user_id: userId, opportunity_id: id }, { onConflict: "user_id,opportunity_id" });
          }
        }
      },
      isSaved: (id) => get().savedIds.includes(id),
    }),
    {
      name: "motungi-app",
      storage: createJSONStorage(() => AsyncStorage),
      // 결과는 파생 데이터라 영속화하지 않음(진단 시 재계산).
      partialize: (s) => ({
        anchors: s.anchors,
        answers: s.answers,
        savedIds: s.savedIds,
      }),
    },
  ),
);
