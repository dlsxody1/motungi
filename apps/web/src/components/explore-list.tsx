"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import type { MockOpportunity } from "@/data/opportunities";
import { ExploreCard } from "@/components/explore-card";
import { ExploreRow } from "@/components/explore-row";
import { ExploreCardSkeleton } from "@/components/explore-skeleton";

/**
 * 탐색 목록(모바일 행 / 데스크톱 그리드). **가상화 상태를 각자 안에 가둔다.**
 *
 * 예전엔 두 virtualizer가 페이지 컴포넌트에 함께 살아서, 스크롤·열수 변경·검색어 입력 중
 * 무엇 하나만 바뀌어도 페이지 전체가 다시 렌더됐다 — 실제로 갱신돼야 하는 건 목록뿐인데
 * 사이드바·헤더·정렬 select까지 매번 따라 돌았다. 게다가 md:hidden은 CSS라 **양쪽이 동시에
 * 마운트되므로**, 모바일 스크롤 한 번이 데스크톱 그리드 렌더까지 끌고 갔다.
 *
 * 이제 각 목록이 자기 스크롤 상태를 소유하고, memo 경계가 그 바깥을 막는다.
 * 부모는 `list`(내용이 실제로 바뀔 때만 새 배열)와 고정된 `onOpen`만 넘긴다.
 */

/** 모바일: 세로 1열, 스크롤 컨테이너는 window가 아니라 넘겨받은 div다. */
export const ExploreMobileList = memo(function ExploreMobileList({
  list,
  onOpen,
  scrollRef,
}: {
  list: MockOpportunity[];
  onOpen: (id: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const virtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => scrollRef.current,
    // 행 높이는 가변(제목 줄바꿈) — 추정값으로 시작하고 measureElement로 실측 보정한다.
    estimateSize: () => 108,
    overscan: 6,
  });

  return (
    <div className="relative mt-2" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((v) => {
        const o = list[v.index];
        if (!o) return null;
        return (
          <div
            key={o.id}
            ref={virtualizer.measureElement}
            data-index={v.index}
            className="absolute left-0 top-0 w-full border-b border-line-alt"
            style={{ transform: `translateY(${v.start}px)` }}
          >
            <ExploreRow o={o} onOpen={onOpen} />
          </div>
        );
      })}
    </div>
  );
});

/**
 * 데스크톱: 반응형 그리드(sm:2 / xl:3). 페이지(window) 스크롤을 쓴다.
 * 열 수(lanes)도 여기서 관찰한다 — 창 크기 변경이 페이지 전체를 흔들 이유가 없다.
 */
export const ExploreDesktopGrid = memo(function ExploreDesktopGrid({
  list,
  onOpen,
  isLoading = false,
}: {
  list: MockOpportunity[];
  onOpen: (id: string) => void;
  /** 조회 중이면 실제 그리드와 같은 열 수로 스켈레톤을 깐다(도착 시 카드가 안 밀리게). */
  isLoading?: boolean;
}) {
  // 데스크톱 그리드 열 수(sm:2 / xl:3). useVirtualizer는 1차원이라 lanes로 알려줘야 한다.
  const [lanes, setLanes] = useState(1);
  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const xl = window.matchMedia("(min-width: 1280px)");
    const sync = () => setLanes(xl.matches ? 3 : sm.matches ? 2 : 1);
    sync();
    sm.addEventListener("change", sync);
    xl.addEventListener("change", sync);
    return () => {
      sm.removeEventListener("change", sync);
      xl.removeEventListener("change", sync);
    };
  }, []);

  // 그리드는 "행" 단위로 가상화한다. lanes로 열마다 독립 진행시키면 카드 높이가 달라
  // 행이 어긋나 보이므로(계단 현상), 한 행(= lanes개 카드)을 하나의 가상 항목으로 둔다.
  const rowCount = Math.ceil(list.length / lanes);
  const listRef = useRef<HTMLDivElement | null>(null);
  // 목록이 시작되는 y좌표. 첫 렌더에는 ref가 비어 있어 0이고, 마운트 후 아래 effect가 채운다.
  const [listTop, setListTop] = useState(0);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    // 목록이 페이지 상단이 아니라 헤더/필터 아래에서 시작하므로 그 오프셋을 알려준다.
    scrollMargin: listTop,
    estimateSize: () => 360,
    overscan: 3,
  });

  // 열 수가 바뀌면 한 행에 담기는 카드가 달라져 기존 실측 높이가 무의미해진다 → 재측정.
  // 첫 렌더에는 listRef가 null이라 scrollMargin이 0이므로, 마운트 후에도 한 번 돌린다.
  useEffect(() => {
    setListTop(listRef.current?.offsetTop ?? 0);
    virtualizer.measure();
  }, [lanes, listTop, virtualizer]);

  if (isLoading) {
    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">활동을 불러오는 중</span>
        {Array.from({ length: lanes * 2 }, (_, i) => (
          <ExploreCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((v) => {
        const rowItems = list.slice(v.index * lanes, v.index * lanes + lanes);
        if (rowItems.length === 0) return null;
        return (
          <div
            key={v.key}
            ref={virtualizer.measureElement}
            data-index={v.index}
            className="absolute left-0 top-0 w-full pb-4"
            style={{
              // window 기준 좌표라 목록 시작 오프셋만큼 되돌려야 컨테이너 안에 맞는다.
              transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {/* 행 안에서는 평범한 그리드 — 같은 행 카드끼리 높이가 맞는다. */}
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
            >
              {rowItems.map((o) => (
                <ExploreCard key={o.id} o={o} onOpen={onOpen} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
