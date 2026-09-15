/**
 * 카카오 소셜로그인 (Supabase OAuth) — Next.js 웹.
 * signInWithOAuth로 브라우저를 카카오로 리다이렉트 →
 * /auth/callback 에서 detectSessionInUrl(PKCE)로 세션이 설정되고
 * onAuthStateChange가 발화한다.
 *
 * 로그인 성공 시 로컬 저장(savedIds)·위치를 서버(profiles/saved_opportunities)로 승격.
 * 이 파일은 순수하다 — 전역 상태를 모르고 필요한 값(anchors/savedIds)을 인자로 받는다.
 * 세션 부트스트랩(store 구독·rehydrate)은 @/hooks/useAuthBoot가 맡는다.
 */
import type { UserAnchors } from "@motungi/core";
import { supabase } from "@/lib/supabase";

/** 카카오 로그인. 브라우저가 카카오로 리다이렉트된 뒤 /auth/callback 으로 복귀한다. */
export async function signInWithKakao(): Promise<{ error?: string }> {
  if (!supabase) return { error: "Supabase 미설정" };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
  if (error) return { error: error.message };

  // 성공 시 이 시점에 카카오로 리다이렉트되므로 반환은 실제로 도달하지 않는다.
  return {};
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/**
 * 로컬 상태를 로그인 사용자 계정으로 승격.
 * - profiles: 위치(집 앵커) upsert
 * - saved_opportunities: 로컬 savedIds를 서버에 병합(중복 무시)
 * 로그인 직후 1회 호출. anchors/savedIds는 호출부(훅 계층)가 store에서 읽어 넘긴다.
 */
export async function promoteLocalToAccount(
  userId: string,
  anchors: UserAnchors,
  savedIds: string[],
): Promise<void> {
  if (!supabase) return;

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
