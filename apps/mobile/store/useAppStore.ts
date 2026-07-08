/**
 * 앱 전역 상태 (Expo/RN).
 * 화면 간 공유가 필요한: 위치 앵커 · 진단 답변 · 스코어링 결과 · 저장 목록.
 * AsyncStorage로 영속화해 앱 재시작에도 유지. 로그인 전에는 이 로컬 상태가 진실.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiagnosisAnswers, Location, UserAnchors } from "@motungi/core";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MockOpportunity } from "@/data/opportunities";

type AnchorSlot = "home" | "work";

interface AppState {
  anchors: UserAnchors;
  answers: DiagnosisAnswers | null;
  /** 스코어링 결과(원픽 + 함께보면좋아요). 로딩 화면에서 채워진다. */
  results: MockOpportunity[];
  /** 전체 활동 카탈로그(서버 실데이터). 탐색/상세/보관함이 참조. 세션 캐시. */
  catalog: MockOpportunity[];
  savedIds: string[];

  setAnchor: (slot: AnchorSlot, location: Location) => void;
  setAnswers: (answers: DiagnosisAnswers) => void;
  setResults: (results: MockOpportunity[]) => void;
  setCatalog: (catalog: MockOpportunity[]) => void;
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
      savedIds: [],

      setAnchor: (slot, location) =>
        set((s) => ({ anchors: { ...s.anchors, [slot]: location } })),
      setAnswers: (answers) => set({ answers }),
      setResults: (results) => set({ results }),
      setCatalog: (catalog) => set({ catalog }),
      toggleSaved: (id) =>
        set((s) => ({
          savedIds: s.savedIds.includes(id)
            ? s.savedIds.filter((x) => x !== id)
            : [...s.savedIds, id],
        })),
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
