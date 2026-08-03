"use client";

import { memo } from "react";
import type { MockOpportunity } from "@/data/opportunities";
import { BookmarkIcon, LocationIcon } from "@/components/icons";
import { Thumbnail } from "@/components/thumbnail";

/**
 * 탐색 목록의 데스크톱 카드. memo 이유는 ExploreRow와 동일(양쪽 목록이 동시에 마운트됨).
 * onOpen은 호출부에서 useCallback으로 고정해야 memo가 실제로 걸린다.
 */
export const ExploreCard = memo(function ExploreCard({
  o,
  onOpen,
}: {
  o: MockOpportunity;
  onOpen: (id: string) => void;
}) {
  const isMint = o.tone === "mint";
  return (
    <button
      onClick={() => onOpen(o.id)}
      className="wcard-hover flex h-full flex-col overflow-hidden rounded-[18px] bg-surface text-left shadow-web"
    >
      {o.imageUrl && (
        <Thumbnail
          src={o.imageUrl}
          tone={isMint ? "mint" : "brand"}
          rounded="rounded-none"
          sizeClass="h-32 w-full"
        />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <span
            className={`rounded-md px-2 py-1 text-[11px] font-bold ${
              isMint ? "bg-mint-tint text-mint" : "bg-tint text-primary-deep"
            }`}
          >
            {o.categoryLabel}
          </span>
          <BookmarkIcon size={20} filled={false} className="text-faint" />
        </div>
        <p className="mt-3 flex-1 text-[17px] font-bold leading-[1.34] text-ink">{o.title}</p>
        <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted">
          <LocationIcon size={13} />
          {o.summary}
        </p>
        <div className="mt-3.5 flex items-end justify-between border-t border-line-alt pt-3">
          <p className={`text-[18px] font-extrabold ${isMint ? "text-mint" : "text-primary"}`}>
            {o.costLabel}
          </p>
          <p className="text-[13px] font-semibold text-muted">자세히 →</p>
        </div>
      </div>
    </button>
  );
});
