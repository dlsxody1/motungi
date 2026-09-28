"use client";

import { LocationIcon } from "@/components/icons";
import { Chip } from "@/components/ui";
import { POPULAR_NEIGHBORHOODS, type NeighborhoodPick } from "@/data/opportunities";
import type { LocationPickSource } from "@/data/location";

type Props = {
  selected: NeighborhoodPick;
  source: LocationPickSource;
  iconSize: number;
  onChoose: (pick: NeighborhoodPick, from: LocationPickSource) => void;
};

/** 인기 동네 칩 (검색어 없을 때). 모바일·데스크톱이 아이콘 크기만 다르게 공유한다. */
export function LocationPopularChips({ selected, source, iconSize, onChoose }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {POPULAR_NEIGHBORHOODS.map((n) => {
        const active = source === "popular" && selected.dongName === n.dongName;
        return (
          <Chip key={n.dongName} active={active} onClick={() => onChoose(n, "popular")}>
            {active && <LocationIcon size={iconSize} />}
            {n.dongName}
          </Chip>
        );
      })}
    </div>
  );
}
