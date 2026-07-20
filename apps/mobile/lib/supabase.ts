import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database as CoreDatabase } from "@motungi/core";
import { createClient } from "@supabase/supabase-js";

/**
 * React Native용 Supabase 클라이언트.
 * 세션은 AsyncStorage에 저장. EXPO_PUBLIC_ 접두어 변수만 클라이언트 노출됨.
 */

/**
 * @motungi/core의 Database는 손으로 작성돼(database.types.ts 상단 주석 참고) postgrest-js의
 * GenericSchema 제약(각 테이블 Relationships, 스키마 Views/Functions)을 그대로 만족하지 않는다.
 * 이를 만족 못 하면 SupabaseClient<Database>의 Schema가 조용히 `never`로 무너져 select() 결과
 * 타입 추론이 전부 깨진다. packages/core는 건드리지 않고, 여기서 타입 레벨로만 보강한다
 * (런타임 영향 없음 — Relationships는 FK 임베드 select에만 쓰이고 이 앱은 사용하지 않는다).
 */
type Database = Omit<CoreDatabase, "public"> & {
  public: Omit<CoreDatabase["public"], "Tables"> & {
    Tables: {
      [K in keyof CoreDatabase["public"]["Tables"]]: CoreDatabase["public"]["Tables"][K] & {
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && publishableKey
    ? createClient<Database>(url, publishableKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
