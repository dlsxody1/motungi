import { createClient } from "@supabase/supabase-js";

/**
 * 브라우저용 Supabase 클라이언트 (anon key).
 * 서버 전용 작업(service role)은 별도 서버 컴포넌트/Route Handler에서.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

export function assertSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase 환경변수 미설정: .env 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 채우세요.",
    );
  }
  return supabase;
}
