"use client";

import { memo } from "react";
import type { MockOpportunity } from "@/data/opportunities";
import { Thumbnail } from "@/components/thumbnail";

/**
 * 리포트 "함께 보면 좋아요" 항목 한 개.
 *
 * memo인 이유: 리포트는 저장 토글(`savedIds`)을 구독한다 — 쓰기 빈도가 가장 높은
 * 슬라이스다. 북마크를 한 번 누를 때마다 페이지가 다시 렌더되는데, `md:hidden`은
 * CSS라 모바일·데스크톱 트리가 **둘 다 마운트**돼 있어 관련 카드가 양쪽에서 전부
 * 다시 그려졌다. 원픽을 저장하는 것과 아래 목록은 아무 상관이 없다.
 *
 * 모바일·데스크톱이 스타일만 다르고 데이터는 같아서 예전엔 같은 JSX가 2벌 복붙돼
 * 있었다(단일 진실의 원천 위반 — 한쪽만 고치면 조용히 갈라진다). variant로 합쳤다.
 *
 * onOpen은 호출부에서 ref로 고정해야 memo가 실제로 걸린다.
 */
export const ReportRelatedCard = memo(function ReportRelatedCard({
  o,
  onOpen,
  variant,
}: {
  o: MockOpportunity;
  onOpen: (id: string) => void;
  /** mobile: 구분선 리스트 행 · desktop: 카드 */
  variant: "mobile" | "desktop";
}) {
  const isMint = o.tone === "mint";
  // 데스크톱은 보조색이 purple, 모바일은 primary다(기존 디자인 유지).
  const accent = isMint ? "text-mint" : variant === "desktop" ? "text-purple" : "text-primary";

  if (variant === "mobile") {
    return (
      <button
        onClick={() => onOpen(o.id)}
        className="flex w-full items-start gap-3 py-4 text-left"
      >
        <Thumbnail src={o.imageUrl} tone={isMint ? "mint" : "purple"} sizeClass="size-16" />
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] font-bold ${accent}`}>{o.categoryLabel}</p>
          <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-[16px] font-extrabold ${accent}`}>{o.costLabel}</p>
          <p className="text-[12px] text-muted">자세히 →</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onOpen(o.id)}
      className="wcard-hover flex w-full items-center gap-4 rounded-[18px] bg-surface p-5 text-left shadow-web"
    >
      <Thumbnail src={o.imageUrl} tone={isMint ? "mint" : "purple"} sizeClass="size-14" />
      <div className="flex-1">
        <p className={`text-[12px] font-bold ${accent}`}>{o.categoryLabel}</p>
        <p className="mt-0.5 text-[16px] font-bold text-ink">{o.title}</p>
        <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[17px] font-extrabold ${accent}`}>{o.costLabel}</p>
        <p className="text-[12px] text-muted">자세히 →</p>
      </div>
    </button>
  );
});
