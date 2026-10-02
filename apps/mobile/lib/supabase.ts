import type { Database } from "@motungi/core";
import { createClient } from "@supabase/supabase-js";
import { secureAuthStorage } from "./secure-storage";

/**
 * React Native용 Supabase 클라이언트.
 * 세션은 보안 저장소(SecureStore, 청크 분할)에 저장. EXPO_PUBLIC_ 접두어 변수만 클라이언트 노출됨.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && publishableKey
    ? createClient<Database>(url, publishableKey, {
        auth: {
          storage: secureAuthStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
