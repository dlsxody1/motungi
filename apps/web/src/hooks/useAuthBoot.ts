/**
 * 세션 부트스트랩 — 앱 시작 시 1회. 현재 세션을 store에 반영하고
 * 로그인/로그아웃 이벤트를 구독한다. 정리 함수를 반환.
 *
 * @/lib/auth.ts는 전역 상태를 모르는 순수 함수(promoteLocalToAccount 등)만 갖는다 —
 * store 구독·rehydrate는 이 훅이 대신 소유한다(M-101: lib→store 역참조 해소).
 */
import { promoteLocalToAccount, pullSavedFromServer } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";

export function initAuthListener(): () => void {
  if (!supabase) return () => {};
  const { setUser, setSavedIds } = useAppStore.getState();

  const applySession = async (userId: string | null, displayName?: string) => {
    if (!userId) {
      setUser(null);
      return;
    }
    setUser({ id: userId, displayName });
    // 로컬 저장을 서버로 승격 후, 서버 목록을 로컬로 재동기화(양방향 병합).
    const { anchors, savedIds } = useAppStore.getState();
    await promoteLocalToAccount(userId, anchors, savedIds);
    const serverSaved = await pullSavedFromServer(userId);
    const merged = Array.from(
      new Set([...useAppStore.getState().savedIds, ...serverSaved]),
    );
    setSavedIds(merged);
  };

  // 초기 세션.
  void supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    // user_metadata는 GoTrue의 Record<string, any> — DB 스키마 제네릭이 커버하지 못하므로 런타임 체크.
    const name = u?.user_metadata?.name;
    void applySession(u?.id ?? null, typeof name === "string" ? name : undefined);
  });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    const name = u?.user_metadata?.name;
    void applySession(u?.id ?? null, typeof name === "string" ? name : undefined);
  });

  return () => sub.subscription.unsubscribe();
}
