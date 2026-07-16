/**
 * 앱 전역 상태 (Expo/RN).
 * 화면 간 공유가 필요한: 위치 앵커 · 진단 답변 · 스코어링 결과 · 저장 목록.
 * AsyncStorage로 영속화해 앱 재시작에도 유지. 로그인 전에는 이 로컬 상태가 진실.
 *
 * 실제 상태 전이 로직은 @motungi/core의 createAppStore 팩토리에 있다(core/src/store.test.ts로
 * 검증됨). 여기서는 mobile 전용 어댑터(AsyncStorage/supabase)를 주입해 vanilla 스토어를
 * 만들고, zustand의 useStore로 React 훅으로 감싼다.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnchorSlot, AppState, AuthUser } from "@motungi/core";
import { createAppStore } from "@motungi/core";
import { useStore } from "zustand";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { supabase } from "@/lib/supabase";

export type { AnchorSlot, AuthUser };

const store = createAppStore<MockOpportunity, CatalogStatus>({
  storage: AsyncStorage,
  supabase,
});

/**
 * useAppStore(selector) 훅. 반환값은 vanilla StoreApi라 React 컴포넌트에서
 * 바로 쓸 수 없으므로 useStore로 감싼다.
 * getState/setState/subscribe는 apps/mobile/lib/auth.ts가 컴포넌트 밖에서
 * 직접 호출하므로, 표준 zustand vanilla+React 결합 관례대로 정적 메서드를
 * 훅 함수에 재부착한다.
 */
export const useAppStore = Object.assign(
  <T,>(selector: (state: AppState<MockOpportunity, CatalogStatus>) => T) =>
    useStore(store, selector),
  store,
);
