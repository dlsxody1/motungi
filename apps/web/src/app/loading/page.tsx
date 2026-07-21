"use client";

import { pickTop } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { fetchOpportunities } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** A4 · 로딩 — 데이터 취합 중. 2.4초 후 리포트로 자동 이동. 반응형. */
export default function LoadingPage() {
  const router = useRouter();
  const answers = useAppStore((s) => s.answers);
  const anchors = useAppStore((s) => s.anchors);
  const setResults = useAppStore((s) => s.setResults);
  const dongName = anchors.home?.dongName ?? "우리 동네";

  useEffect(() => {
    let cancelled = false;
    // 리포트용으로 관심 카테고리만·소량 받아 진단 답변으로 스코어링 → 원픽+함께(최대 6) 저장.
    // 넓은 카탈로그(탐색용)는 여기서 채우지 않는다 — explore가 useEnsureCatalog로 별도 로드.
    void (async () => {
      const { data: candidates } = await fetchOpportunities({
        categories: answers?.interests,
        limit: 30,
      });
      if (cancelled) return;
      // pickTop은 slice(0, topN)이라 후보가 적으면 그만큼만 — "나온 만큼" 렌더.
      const ranked = answers
        ? pickTop(candidates, answers, anchors, 6).map((r) => {
            return { ...r.opportunity, matchScore: Math.round(r.score * 100) };
          })
        : candidates.slice(0, 6);
      setResults(ranked);
    })();

    // 최소 로딩 시간 유지(스코어링이 더 빨라도 2.4초 후 이동).
    const t = window.setTimeout(() => {
      if (!cancelled) router.push("/report");
    }, 2400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router, answers, anchors, setResults]);

  const Body = (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center px-8 text-center"
    >
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
