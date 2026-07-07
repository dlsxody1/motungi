"use client";

import { pickTop } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { ALL_OPPORTUNITIES } from "@/data/opportunities";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** A4 · 로딩 — 데이터 취합 중. 2.4초 후 리포트로 자동 이동. 반응형. */
export default function LoadingPage() {
  const router = useRouter();
  const answers = useAppStore((s) => s.answers);
  const anchors = useAppStore((s) => s.anchors);
  const setResults = useAppStore((s) => s.setResults);
  const dongName = anchors.home?.dongName ?? "우리 동네";

  useEffect(() => {
    // 진단 답변 기준으로 후보를 스코어링해 상위 3개를 리포트용 결과로 저장.
    // 답변이 없으면(온보딩 스킵 등) 원본 순서를 그대로 사용.
    const ranked = answers
      ? pickTop(ALL_OPPORTUNITIES, answers, anchors, 3).map((r) => {
          const opp = r.opportunity as MockOpportunity;
          return { ...opp, matchScore: Math.round(r.score * 100) };
        })
      : ALL_OPPORTUNITIES.slice(0, 3);
    setResults(ranked);

    const t = window.setTimeout(() => router.push("/report"), 2400);
    return () => window.clearTimeout(t);
  }, [router, answers, anchors, setResults]);

  const Body = (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="corner-spinner size-11 rounded-full border-[3px] border-tint border-t-primary md:size-14 md:border-4" />
      <h1 className="mt-7 text-[20px] font-extrabold leading-snug text-ink md:mt-9 md:text-[26px]">
        {dongName} 기회를
        <br />
        모으고 있어요
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted md:text-[16px]">
        문화 · 산책 · 먹거리 데이터를
        <br />
        진단 결과에 맞춰보는 중
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
