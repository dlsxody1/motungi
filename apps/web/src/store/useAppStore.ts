/**
 * 앱 전역 상태 (Next.js 웹).
 * 화면 간 공유가 필요한: 위치 앵커 · 진단 답변 · 스코어링 결과 · 저장 목록.
 * localStorage로 영속화. 로그인 전에는 이 로컬 상태가 진실.
 */
import type { DiagnosisAnswers, Location, UserAnchors } from "@motungi/core";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MockOpportunity } from "@/data/opportunities";
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
  savedIds: string[];
  /** 로그인 사용자. null = 게스트. */
  user: AuthUser | null;

  setAnchor: (slot: AnchorSlot, location: Location) => void;
  setAnswers: (answers: DiagnosisAnswers) => void;
  setResults: (results: MockOpportunity[]) => void;
  setCatalog: (catalog: MockOpportunity[]) => void;
  setUser: (user: AuthUser | null) => void;
  setSavedIds: (ids: string[]) => void;
  toggleSaved: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      anchors: {},
      answers: null,
      results: [],
      catalog: [],
      savedIds: [],
      user: null,

      setAnchor: (slot, location) =>
        set((s) => ({ anchors: { ...s.anchors, [slot]: location } })),
      setAnswers: (answers) => set({ answers }),
      setResults: (results) => set({ results }),
      setCatalog: (catalog) => set({ catalog }),
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
        if (userId && supabase) {
          if (wasSaved) {
            void supabase
              .from("saved_opportunities")
              .delete()
              .eq("user_id", userId)
              .eq("opportunity_id", id);
          } else {
            void supabase
              .from("saved_opportunities")
              .upsert(
                { user_id: userId, opportunity_id: id },
                { onConflict: "user_id,opportunity_id" },
              );
          }
        }
      },
    }),
    {
      name: "motungi-app",
      storage: createJSONStorage(() => localStorage),
      // 결과는 파생 데이터라 영속화하지 않음(진단 시 재계산).
      partialize: (s) => ({
        anchors: s.anchors,
        answers: s.answers,
        savedIds: s.savedIds,
      }),
    },
  ),
);
