"use client";

import { pickTop } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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

  /**
   * anchors를 **값**으로 요약한 키. 객체를 그대로 deps에 넣으면 setAnchor가 매번
   * 새 객체를 만들므로(core/store.ts), 앵커가 바뀔 때마다 fetch+스코어링이 다시 돌고
   * 2.4초 타이머가 재시작된다 — 사용자는 리포트로 못 넘어간 채 로딩에 갇힌다.
   */
  const anchorKey = JSON.stringify([anchors.home?.point, anchors.work?.point]);
  // 최신 anchors는 ref로 읽는다(위 키가 같으면 스코어링에 쓰이는 좌표도 같다).
  const anchorsRef = useRef(anchors);
  anchorsRef.current = anchors;

  useEffect(() => {
    let cancelled = false;
    // 리포트용으로 관심 카테고리만·소량 받아 진단 답변으로 스코어링 → 원픽+함께(최대 6) 저장.
    // 넓은 카탈로그(탐색용)는 여기서 채우지 않는다 — explore가 useEnsureCatalog로 별도 로드.
    void (async () => {
      const anchorsNow = anchorsRef.current;
      const { data: candidates } = await fetchOpportunities({
        categories: answers?.interests,
        // 원픽은 거리로 스코어링하므로 후보도 앵커 주변에서 뽑는다(전 지역에서 받아 버리지 않게).
        near: anchorsNow.home?.point
          ? { point: anchorsNow.home.point, radiusKm: 10 }
          : undefined,
        limit: 30,
      });
      if (cancelled) return;
      // pickTop은 slice(0, topN)이라 후보가 적으면 그만큼만 — "나온 만큼" 렌더.
      const ranked = answers
        ? pickTop(candidates, answers, anchorsNow, 6).map((r) => {
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
    // anchors 객체가 아니라 anchorKey(좌표 값)에 의존한다 — 위 주석 참조.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, answers, anchorKey, setResults]);

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
