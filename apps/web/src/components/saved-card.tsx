"use client";

import { memo } from "react";
import type { MockOpportunity } from "@/data/opportunities";
import { BookmarkIcon } from "@/components/icons";
import { Thumbnail } from "@/components/thumbnail";

/**
 * 보관함 항목 한 개.
 *
 * memo인 이유: 보관함은 `savedIds`를 구독하는데, 이 화면의 주된 행동이 바로 저장
 * 취소다 — 카드 하나를 지울 때마다 **남은 카드가 전부** 다시 그려졌다. `md:hidden`은
 * CSS라 모바일·데스크톱 트리가 둘 다 마운트돼 있어 그 비용이 두 배였다.
 *
 * 모바일(구분선 행)·데스크톱(그리드 카드)이 스타일만 다르고 데이터는 같아서 예전엔
 * 같은 JSX가 2벌 복붙돼 있었다 — 한쪽만 고치면 조용히 갈라지는 구조다. variant로 합쳤다.
 *
 * 중첩 인터랙티브를 만들지 않으려고 "상세 보기"와 "저장 취소"를 형제 버튼으로 둔다(M-014).
 * onOpen/onToggle은 호출부에서 ref로 고정해야 memo가 실제로 걸린다.
 */
export const SavedCard = memo(function SavedCard({
  o,
  onOpen,
  onToggle,
  variant,
}: {
  o: MockOpportunity;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  variant: "mobile" | "desktop";
}) {
  const isMint = o.tone === "mint";
  const accent = isMint ? "text-mint" : "text-primary";

  if (variant === "mobile") {
    return (
      <div className="flex w-full items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => onOpen(o.id)}
          aria-label={`${o.title} 상세 보기`}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <div className="flex-1">
            <p className={`text-[12px] font-bold ${accent}`}>{o.categoryLabel}</p>
            <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
            <p className="mt-0.5 text-[13px] text-muted">{o.location?.dongName ?? ""}</p>
          </div>
          <p className={`text-[15px] font-extrabold ${accent}`}>{o.costLabel}</p>
        </button>
        <button
          type="button"
          onClick={() => onToggle(o.id)}
          aria-label="저장 취소"
          aria-pressed={true}
          className="shrink-0"
        >
          <BookmarkIcon size={20} filled className="text-primary" />
        </button>
      </div>
    );
  }

  return (
    <div className="wcard-hover relative flex flex-col rounded-[18px] bg-surface p-5 shadow-web">
      <button
        type="button"
        onClick={() => onOpen(o.id)}
        aria-label={`${o.title} 상세 보기`}
        className="flex flex-1 flex-col text-left"
      >
        <Thumbnail src={o.imageUrl} tone={isMint ? "mint" : "brand"} sizeClass="size-12" />
        <p className={`mt-3 text-[12px] font-bold ${accent}`}>{o.categoryLabel}</p>
        <p className="mt-1 flex-1 text-[17px] font-bold text-ink">{o.title}</p>
        <p className="mt-0.5 text-[13px] text-muted">{o.location?.dongName ?? ""}</p>
        <p
          className={`mt-3 border-t border-line-alt pt-3 text-[18px] font-extrabold ${accent}`}
        >
          {o.costLabel}
        </p>
      </button>
      <button
        type="button"
        onClick={() => onToggle(o.id)}
        aria-label="저장 취소"
        aria-pressed={true}
        className="absolute right-5 top-5"
      >
        <BookmarkIcon size={20} filled className="text-primary" />
      </button>
    </div>
  );
});
