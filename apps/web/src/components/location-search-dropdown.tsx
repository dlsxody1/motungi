"use client";

import type { NeighborhoodSearchResult } from "@motungi/core";
import { LocationIcon } from "@/components/icons";
import type { NeighborhoodPick } from "@/data/opportunities";
import { locationSearchItemToPick } from "@/data/location";

type Props = {
  searching: boolean;
  results: NeighborhoodSearchResult[];
  onChoose: (pick: NeighborhoodPick, from: "search") => void;
};

/** 검색 결과 드롭다운 (검색어 있을 때). 모바일·데스크톱이 완전히 동일하게 공유한다. */
export function LocationSearchDropdown({ searching, results, onChoose }: Props) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-line-alt bg-surface shadow-card md:shadow-web">
      {searching && results.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted">검색 중…</p>
      ) : results.length > 0 ? (
        <>
          <ul role="listbox" aria-label="동네 검색 결과">
            {results.map((it) => (
              <li key={it.admCode} role="option" aria-selected={false}>
                <button
                  onClick={() => onChoose(locationSearchItemToPick(it), "search")}
                  className="tap-safe flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-alt"
                >
                  <LocationIcon size={16} className="shrink-0 text-faint" />
                  <span className="text-[15px] font-medium text-ink">{it.dongName}</span>
                  <span className="text-[13px] text-muted">{it.sigungu}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line-alt px-4 py-2.5 text-[12px] text-muted">
            고른 동네가 <b className="font-semibold text-label">추천의 기준점</b>이 돼요. 그 주변까지
            함께 살펴드려요.
          </p>
        </>
      ) : (
        <p className="px-4 py-3 text-[14px] text-muted">검색 결과가 없어요. 다른 동네나 구 이름으로 검색해보세요.</p>
      )}
    </div>
  );
}
