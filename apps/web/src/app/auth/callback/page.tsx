"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * 카카오 OAuth 콜백 — PKCE 코드 교환 후 리포트로 이동.
 * supabase 클라이언트가 detectSessionInUrl:true 라 콜백 URL의 세션을
 * 자동 감지하지만, 안전하게 exchangeCodeForSession도 시도한다.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      if (supabase) {
        // detectSessionInUrl이 이미 처리했으면 code가 없을 수 있음 — 실패는 무시.
        if (window.location.href.includes("code=")) {
          await supabase.auth
            .exchangeCodeForSession(window.location.href)
            .catch(() => {});
        }
      }
      if (!cancelled) router.replace("/report");
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg">
      <span
        className="size-9 animate-spin rounded-full border-[3px] border-line-alt border-t-primary"
        aria-hidden
      />
      <p className="text-[14px] text-muted">로그인 중이에요…</p>
    </div>
  );
}
