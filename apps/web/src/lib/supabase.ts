import { createClient } from "@supabase/supabase-js";

/**
 * 브라우저용 Supabase 클라이언트 (publishable key).
 * 서버 전용 작업(secret key)은 별도 서버 컴포넌트/Route Handler에서.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // 콜백 URL의 세션/PKCE 코드를 자동 감지해 교환.
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;

export function assertSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase 환경변수 미설정: .env 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 채우세요.",
    );
  }
  return supabase;
}
