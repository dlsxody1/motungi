"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronDownIcon, SearchIcon } from "@/components/icons";
import { Chip, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { EXPLORE_LIST } from "@/data/opportunities";

const FILTERS = ["전체", "부업", "지원금", "긱 · 딜", "클래스 · 재능"];

/** B1 · 탐색 (전체 기회) — 보너스로 함께 구현 */
export default function ExplorePage() {
  const [filter, setFilter] = useState("전체");

  return (
    <MobileScreen>
      <div className="flex flex-1 flex-col bg-bg">
        <SafeTop />

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-[24px] font-extrabold text-ink">탐색</h1>
            <button className="flex h-9 items-center gap-1 rounded-pill border border-line bg-surface px-3 text-[13px] font-semibold text-label">
              망원동 <ChevronDownIcon size={16} className="text-faint" />
            </button>
          </div>

          {/* 검색 */}
          <div className="mt-4 flex h-[50px] items-center gap-2 rounded-xl bg-surface px-4 shadow-card">
            <SearchIcon size={20} className="text-faint" />
            <input
              className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
              placeholder="기회·키워드 검색"
            />
          </div>

          {/* 필터 칩 */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)} className="shrink-0">
                {f}
              </Chip>
            ))}
          </div>

          {/* 목록 */}
          <div className="mt-2 divide-y divide-line-alt">
            {EXPLORE_LIST.map((o) => (
              <Link key={o.id} href="/opportunity" className="flex items-start gap-3 py-4">
                <div className="flex-1">
                  <p
                    className={`text-[12px] font-bold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}
                  >
                    {o.categoryLabel}
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-[15px] font-extrabold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}
                  >
                    {o.incomeLabel}
                  </p>
                  <p className="text-[12px] text-faint">매칭 {o.matchScore}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <BottomNav active="explore" />
        <SafeBottom />
      </div>
    </MobileScreen>
  );
}
