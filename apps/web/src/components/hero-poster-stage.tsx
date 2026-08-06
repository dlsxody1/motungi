"use client";

/**
 * 히어로 우측 스테이지 — 3D 포스터 링을 지연 로드하고, 안 되면 조용히 2D로 내려앉는다.
 *
 * three(~150kb)는 초기 번들에 넣지 않는다: next/dynamic(ssr:false)로 히어로가 실제로
 * 마운트된 뒤에 받아온다 → LCP는 좌측 카피/CTA가 잡고, 3D는 그 뒤에 채워진다.
 *
 * 폴백 조건(둘 다 기존 캐러셀로): 포스터가 모자람 · WebGL 실패/컨텍스트 손실.
 * 폴백은 이미 검증된 HeroCarousel을 그대로 쓴다 — 새 폴백 UI를 만들지 않는다.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { MockOpportunity } from "@/data/opportunities";
import { HeroCarousel } from "./hero-carousel";
import type { PosterRingItem } from "./poster-ring";

/** 링이 성립하려면 최소 이 장수는 있어야 한다(적으면 듬성듬성해 보인다). */
const MIN_FOR_RING = 8;

const PosterRing = dynamic(() => import("./poster-ring").then((m) => m.PosterRing), {
  ssr: false,
  loading: () => null,
});

export function HeroPosterStage({
  items,
  variant = "desktop",
}: {
  items: MockOpportunity[];
  /** 모바일은 높이·텍스처 수를 줄인다(좁은 화면 + 배터리). */
  variant?: "desktop" | "mobile";
}) {
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<PosterRingItem | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mobile = variant === "mobile";

  /** 링에 "선택 해제"를 알린다(씬은 DOM 이벤트로만 외부 제어한다).
   *  PosterRing은 자기 내부 div에 리스너를 단다 — 이벤트는 아래로 전파되지 않으므로
   *  래퍼가 아니라 그 자식(=링의 host)에 직접 dispatch해야 한다. */
  const clearPick = useCallback(() => {
    setPicked(null);
    hostRef.current?.firstElementChild?.dispatchEvent(new CustomEvent("posterring:clear"));
  }, []);

  /**
   * 반드시 메모해야 한다. 이 배열이 렌더마다 새로 만들어지면 PosterRing의 effect가
   * (deps에 items가 들어 있으므로) 매번 씬을 통째로 파괴·재생성한다.
   * 카드를 고르면 setPicked → 리렌더 → 씬 재생성 → 선택이 즉시 풀리고 화면이 깜빡였다.
   */
  const ringItems: PosterRingItem[] = useMemo(
    () =>
      items
        .filter((o): o is MockOpportunity & { imageUrl: string } => Boolean(o.imageUrl))
        .map((o) => ({ id: o.id, title: o.title, imageUrl: o.imageUrl })),
    [items],
  );

  if (failed || ringItems.length < MIN_FOR_RING) {
    return items.length >= 4 ? <HeroCarousel items={items} /> : null;
  }

  return (
    <div className="relative">
      {/* 링 뒤 광원 — 포스터가 어두운 그라데이션 위에서 떠 보이게 한다. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(58% 50% at 50% 48%, rgba(255,255,255,0.22), transparent 70%)",
        }}
      />
      <div ref={hostRef} className={mobile ? "h-[340px] w-full" : "h-[440px] w-full"}>
        <PosterRing
          items={ringItems}
          maxCards={mobile ? 8 : 12}
          onFail={() => setFailed(true)}
          onSelect={setPicked}
        />
      </div>

      {/*
       * 안내 문구 — 선택 전에는 조작법을, 선택 후에는 선택 UI가 대신한다.
       *
       * 왜 음수 마진인가: 링 호스트는 340/440px **고정 박스**고 포스터는 그 안에서
       * 원근으로 떠 있다. 카드 아래쪽엔 링이 쓰지 않는 빈 공간이 남아, mt-1로 붙이면
       * 문구가 카드에서 한참 떨어져 붕 뜬 것처럼 보였다. 박스 안쪽으로 끌어올려
       * 카드와 문구를 한 덩어리로 읽히게 한다.
       */}
      {!picked && (
        <p className="-mt-8 text-center text-[13px] font-medium text-white/85 md:-mt-10">
          {mobile ? "밀어서 둘러보고, 탭해서 자세히" : "끌어서 둘러보고, 클릭해서 자세히"}
        </p>
      )}

      {/* ── 데스크탑: 고른 카드의 제목 + 상세로 가기 ──
          링은 aria-hidden이라 여기서 접근 가능한 링크·버튼을 제공한다. */}
      {picked && !mobile && (
        <div className="mt-3 rounded-[16px] bg-black/35 p-4 backdrop-blur-sm">
          <p className="line-clamp-2 break-keep text-[15px] font-bold leading-[1.4] text-white">
            {picked.title}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/opportunity/${picked.id}`}
              className="flex h-10 flex-1 items-center justify-center rounded-[11px] bg-white text-[14px] font-bold text-primary-deep"
            >
              자세히 보기
            </Link>
            <button
              type="button"
              onClick={clearPick}
              className="flex h-10 items-center justify-center rounded-[11px] border border-white/30 px-4 text-[14px] font-semibold text-white"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ── 모바일: 탭하면 다음 행동을 묻는 시트 ──
          상세로 갈지, 내 동네 기준으로 찾을지 — 두 갈래를 명시적으로 준다. */}
      {picked && mobile && (
        <div
          role="dialog"
          aria-label="선택한 활동"
          className="mt-3 rounded-[18px] bg-black/45 p-4 backdrop-blur-sm"
        >
          <p className="line-clamp-2 break-keep text-[15px] font-bold leading-[1.4] text-white">
            {picked.title}
          </p>
          <p className="mt-1 text-[13px] text-white/75">무엇을 할까요?</p>
          <div className="mt-3 space-y-2">
            <Link
              href={`/opportunity/${picked.id}`}
              className="tap-safe flex h-12 w-full items-center justify-center rounded-xl bg-white text-[15px] font-bold text-primary-deep"
            >
              이 활동 자세히 보기
            </Link>
            <Link
              href="/location"
              className="tap-safe flex h-12 w-full items-center justify-center rounded-xl border border-white/35 text-[15px] font-semibold text-white"
            >
              내 동네에서 찾아보기
            </Link>
            <button
              type="button"
              onClick={clearPick}
              className="tap-safe flex h-10 w-full items-center justify-center text-[14px] font-semibold text-white/80"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
