import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * React Native용 Supabase 클라이언트.
 * 세션은 AsyncStorage에 저장. EXPO_PUBLIC_ 접두어 변수만 클라이언트 노출됨.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
