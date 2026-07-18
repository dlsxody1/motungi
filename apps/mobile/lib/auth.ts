/**
 * 카카오 소셜로그인 (Supabase OAuth) — Expo/RN.
 * signInWithOAuth(skipBrowserRedirect) → WebBrowser로 카카오 인증 →
 * 딥링크(motungi://) 콜백의 code를 exchangeCodeForSession으로 세션 교환.
 *
 * 로그인 성공 시 로컬 저장(savedIds)·위치를 서버(profiles/saved_opportunities)로 승격.
 */
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";

WebBrowser.maybeCompleteAuthSession();

/** 카카오 로그인 왕복. 성공 시 세션이 설정되고 onAuthStateChange가 발화한다. */
export async function signInWithKakao(): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase 미설정" };

  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error?.message ?? "로그인 URL 생성 실패" };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    return { error: result.type === "cancel" ? "로그인이 취소됐어요" : "로그인 실패" };
  }

  // 콜백 딥링크(motungi://auth/callback?code=...)에서 code 추출 → 세션 교환.
  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  if (typeof code !== "string" || !code) return { error: "인증 코드를 받지 못했어요" };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return { error: exchangeError.message };

  return {};
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/**
 * 로컬 상태를 로그인 사용자 계정으로 승격.
 * - profiles: 위치(집 앵커) upsert
 * - saved_opportunities: 로컬 savedIds를 서버에 병합(중복 무시)
 * 로그인 직후 1회 호출.
 */
export async function promoteLocalToAccount(userId: string): Promise<void> {
  if (!supabase) return;
  const { anchors, savedIds } = useAppStore.getState();

  // 프로필(위치) 저장.
  await supabase.from("profiles").upsert(
    {
      id: userId,
      home_adm_code: anchors.home?.admCode ?? null,
      home_dong_name: anchors.home?.dongName ?? null,
      work_adm_code: anchors.work?.admCode ?? null,
      work_dong_name: anchors.work?.dongName ?? null,
    },
    { onConflict: "id" },
  );

  // 로컬 저장 목록 → 서버 병합.
  if (savedIds.length > 0) {
    await supabase
      .from("saved_opportunities")
      .upsert(
        savedIds.map((opportunity_id) => ({ user_id: userId, opportunity_id })),
        { onConflict: "user_id,opportunity_id", ignoreDuplicates: true },
      );
  }
}

/** 서버 저장 목록을 로컬로 동기화(로그인 사용자 재접속 시). */
export async function pullSavedFromServer(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.opportunity_id);
}

/**
 * 세션 부트스트랩 — 앱 시작 시 1회. 현재 세션을 store에 반영하고
 * 로그인/로그아웃 이벤트를 구독한다. 정리 함수를 반환.
 */
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
    await promoteLocalToAccount(userId);
    const serverSaved = await pullSavedFromServer(userId);
    const merged = Array.from(new Set([...useAppStore.getState().savedIds, ...serverSaved]));
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
