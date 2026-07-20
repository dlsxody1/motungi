/**
 * 앱 전역 상태 (Next.js 웹).
 * 화면 간 공유가 필요한: 위치 앵커 · 진단 답변 · 스코어링 결과 · 저장 목록.
 * localStorage로 영속화. 로그인 전에는 이 로컬 상태가 진실.
 *
 * 실제 상태 전이 로직은 @motungi/core의 createAppStore 팩토리에 있다(core/src/store.test.ts로
 * 검증됨). 여기서는 web 전용 어댑터(localStorage/supabase)를 주입해 vanilla 스토어를
 * 만들고, zustand의 useStore로 React 훅으로 감싼다.
 */
import type { AnchorSlot, AppState, AuthUser, SavedOpportunitiesClient } from "@motungi/core";
import { createAppStore } from "@motungi/core";
import { useStore } from "zustand";
import type { StateStorage } from "zustand/middleware";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { supabase } from "@/lib/supabase";

export type { AnchorSlot, AuthUser };

/**
 * localStorage를 감싼 StateStorage 어댑터.
 * `localStorage` 전역은 브라우저에만 있어, 모듈 스코프에서 식별자를 직접
 * 참조하면(예: `storage: localStorage`) Next.js SSR/빌드(Node) 환경에서
 * ReferenceError로 즉시 죽는다. 메서드 본문 안에서만 참조해 지연시킨다
 * (persist 미들웨어는 클라이언트에서 실제 호출될 때만 이 메서드들을 부른다).
 */
const webStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

// createAppStore는 저장 동기화에 필요한 최소 write 인터페이스(SavedOpportunitiesClient)만 쓴다.
// 전체 SupabaseClient<Database> 제네릭을 그대로 넘기면 postgrest 재귀 타입이 TS2589로 폭발하므로,
// 이 스토어가 실제로 요구하는 구조로 좁혀서 주입한다.
const store = createAppStore<MockOpportunity, CatalogStatus>({
  storage: webStorage,
  supabase: supabase as SavedOpportunitiesClient | null,
});

/**
 * useAppStore(selector) 훅. 반환값은 vanilla StoreApi라 React 컴포넌트에서
 * 바로 쓸 수 없으므로 useStore로 감싼다.
 * getState/setState/subscribe는 apps/web/src/lib/auth.ts가 컴포넌트 밖에서
 * 직접 호출하므로, 표준 zustand vanilla+React 결합 관례대로 정적 메서드를
 * 훅 함수에 재부착한다.
 */
export const useAppStore = Object.assign(
  <T,>(selector: (state: AppState<MockOpportunity, CatalogStatus>) => T) =>
    useStore(store, selector),
  store,
);
