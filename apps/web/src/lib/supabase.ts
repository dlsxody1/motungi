import type { Database as CoreDatabase } from "@motungi/core";
import { createClient } from "@supabase/supabase-js";

/**
 * 브라우저용 Supabase 클라이언트 (publishable key).
 * 서버 전용 작업(secret key)은 별도 서버 컴포넌트/Route Handler에서.
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
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

export function assertSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase 환경변수 미설정: .env 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 채우세요.",
    );
  }
  return supabase;
}
