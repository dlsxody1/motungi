import type { Database } from "@motungi/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 브라우저용 Supabase 클라이언트 (publishable key).
 * 서버 전용 작업(secret key)은 별도 서버 컴포넌트/Route Handler에서.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// M-114: index.ts가 `export *`에서 명시적 재export로 바뀌면서 Database의 재export 경로가
// 한 단계 깊어졌다 — SupabaseClient<Database>의 추론 타입을 tsc가 "portable"하게 못 name해
// TS2742가 났다(선언 emit 시 참조 경로를 못 찾음). 타입을 명시해 추론에 기대지 않게 한다.
export const supabase: SupabaseClient<Database> | null =
  url && publishableKey
    ? createClient<Database>(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // 콜백 URL의 세션/PKCE 코드를 자동 감지해 교환.
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      })
    : null;
