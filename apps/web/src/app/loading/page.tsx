"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";

/** A4 · 로딩 — 데이터 취합 중. 2.4초 후 리포트로 자동 이동. 반응형. */
export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    const t = window.setTimeout(() => router.push("/report"), 2400);
    return () => window.clearTimeout(t);
  }, [router]);

  const Body = (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="corner-spinner size-11 rounded-full border-[3px] border-tint border-t-primary md:size-14 md:border-4" />
      <h1 className="mt-7 text-[20px] font-extrabold leading-snug text-ink md:mt-9 md:text-[26px]">
        망원동 기회를
        <br />
        모으고 있어요
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted md:text-[16px]">
        상권 · 청년정책 · 제휴 데이터를
        <br />
        도윤님 기준으로 맞춰보는 중
      </p>
    </div>
  );

  return (
    <>
      {/* 모바일 */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            {Body}
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* 데스크탑 */}
      <div className="hidden min-h-dvh flex-col bg-bg md:flex">{Body}</div>
    </>
  );
}
