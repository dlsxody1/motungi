"use client";

import { memo } from "react";
import type { MockOpportunity } from "@/data/opportunities";

/**
 * 탐색 목록의 모바일 행. memo로 감싼 이유:
 * md:hidden은 CSS라 모바일·데스크톱 목록이 둘 다 마운트된다. 검색어를 한 글자 칠 때마다
 * 양쪽 카드가 전부 리렌더되던 것을 끊는다. (onOpen은 호출부에서 useCallback으로 고정해야 유효하다.)
 */
export const ExploreRow = memo(function ExploreRow({
  o,
  onOpen,
}: {
  o: MockOpportunity;
  onOpen: (id: string) => void;
}) {
  const toneText = o.tone === "mint" ? "text-mint" : "text-primary";
  return (
    <button onClick={() => onOpen(o.id)} className="flex w-full items-start gap-3 py-4 text-left">
      <div className="flex-1">
        <p className={`text-[12px] font-bold ${toneText}`}>{o.categoryLabel}</p>
        <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
        <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[15px] font-extrabold ${toneText}`}>{o.costLabel}</p>
        <p className="text-[12px] text-muted">자세히 →</p>
      </div>
    </button>
  );
});
