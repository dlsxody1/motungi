"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import {
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  LocationIcon,
  SearchIcon,
} from "@/components/icons";
import { Chip, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { EXPLORE_LIST } from "@/data/opportunities";

const FILTERS = ["전체", "문화·공연", "운동·산책", "먹거리·마켓", "클래스", "부업"];

const CATEGORIES = [
  { label: "전체", count: 42 },
  { label: "문화·공연", count: 16 },
  { label: "운동·산책", count: 11 },
  { label: "먹거리·마켓", count: 8 },
  { label: "클래스·배움", count: 4 },
  { label: "퇴근후 부업", count: 3 },
];

/** B1 · 탐색 (전체 기회) — 반응형 */
export default function ExplorePage() {
  const [filter, setFilter] = useState("전체");
  const [category, setCategory] = useState("전체");

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
              <div className="flex items-center justify-between pt-1">
                <h1 className="text-[24px] font-extrabold text-ink">탐색</h1>
                <button className="flex h-9 items-center gap-1 rounded-pill border border-line bg-surface px-3 text-[13px] font-semibold text-label">
                  망원동 <ChevronDownIcon size={16} className="text-faint" />
                </button>
              </div>

              <div className="mt-4 flex h-[50px] items-center gap-2 rounded-xl bg-surface px-4 shadow-card">
                <SearchIcon size={20} className="text-faint" />
                <input
                  className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                  placeholder="활동·키워드 검색"
                />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <Chip key={f} active={filter === f} onClick={() => setFilter(f)} className="shrink-0">
                    {f}
                  </Chip>
                ))}
              </div>

              <div className="mt-2 divide-y divide-line-alt">
                {EXPLORE_LIST.map((o) => (
                  <Link key={o.id} href="/opportunity" className="flex items-start gap-3 py-4">
                    <div className="flex-1">
                      <p className={`text-[12px] font-bold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}>
                        {o.categoryLabel}
                      </p>
                      <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-[15px] font-extrabold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}>
                        {o.costLabel}
                      </p>
                      <p className="text-[12px] text-muted">매칭 {o.matchScore}%</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <BottomNav active="explore" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="explore">
        <WebContainer className="py-8">
          {/* 헤더 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">망원동에서 할 만한 것</h1>
              <p className="mt-1.5 text-[15px] text-muted">
                퇴근 후·주말 활동 42건 · 도윤님 진단 기준 정렬
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-70 items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5">
                <SearchIcon size={18} className="text-faint" />
                <input
                  className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
                  placeholder="활동 검색"
                />
              </div>
              <button className="flex h-11 items-center gap-1.5 rounded-[11px] border border-line bg-surface px-4 text-[14px] font-semibold text-label hover:border-faint">
                매칭순 <ChevronDownIcon size={16} className="text-faint" />
              </button>
            </div>
          </div>

          {/* 2단: 사이드바 + 그리드 */}
          <div className="mt-7 grid grid-cols-1 items-start gap-7 lg:grid-cols-[248px_1fr]">
            {/* 사이드바 */}
            <aside className="rounded-[18px] bg-surface p-5.5 shadow-web">
              <p className="text-[14px] font-bold text-ink">카테고리</p>
              <div className="mt-3 space-y-0.5">
                {CATEGORIES.map((c) => {
                  const on = category === c.label;
                  return (
                    <button
                      key={c.label}
                      onClick={() => setCategory(c.label)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] ${
                        on ? "bg-tint font-bold text-primary-deep" : "font-medium text-label hover:bg-bg"
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className={on ? "text-primary-deep" : "text-muted"}>{c.count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="my-4 h-px bg-line-alt" />

              <p className="text-[14px] font-bold text-ink">집에서 거리</p>
              <div className="mt-3.5">
                <div className="relative h-1.5 rounded-full bg-track">
                  <div className="absolute left-0 top-0 h-full w-[62%] rounded-full bg-primary" />
                  <span className="absolute left-[62%] top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary bg-surface" />
                </div>
                <p className="mt-2.5 text-[13px] font-semibold text-label">도보 15분 이내</p>
              </div>

              <div className="my-4 h-px bg-line-alt" />

              <p className="text-[14px] font-bold text-ink">난이도</p>
              <div className="mt-3 space-y-2.5">
                {[
                  { l: "낮음 (방전형 추천)", on: true },
                  { l: "보통", on: false },
                  { l: "높음", on: false },
                ].map((d) => (
                  <label key={d.l} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-label">
                    <span
                      className={`grid size-5 place-items-center rounded-[6px] ${
                        d.on ? "bg-primary text-white" : "border-[1.5px] border-line"
                      }`}
                    >
                      {d.on && <CheckIcon size={13} />}
                    </span>
                    {d.l}
                  </label>
                ))}
              </div>
            </aside>

            {/* 그리드 */}
            <div>
              {/* 활성 필터 칩 */}
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-[13px] font-semibold text-white">
                  낮은 난이도 <CloseIcon size={13} />
                </span>
                <span className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-[13px] font-semibold text-white">
                  평일 저녁 <CloseIcon size={13} />
                </span>
                <span className="flex items-center gap-1 rounded-pill border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-label">
                  도보 15분
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {EXPLORE_LIST.map((o, i) => {
                  const pick = i === 0;
                  return (
                    <Link
                      key={o.id}
                      href="/opportunity"
                      className={`wcard-hover flex flex-col rounded-[18px] bg-surface p-5 shadow-web ${
                        pick ? "border-[1.5px] border-primary/35" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                            o.tone === "mint"
                              ? "bg-mint-tint text-mint"
                              : pick
                                ? "bg-primary text-white"
                                : "bg-tint text-primary-deep"
                          }`}
                        >
                          {pick ? "★ 원픽" : o.categoryLabel}
                        </span>
                        <BookmarkIcon
                          size={20}
                          filled={pick}
                          className={pick ? "text-primary" : "text-faint"}
                        />
                      </div>
                      <p className="mt-3 flex-1 text-[17px] font-bold leading-[1.34] text-ink">{o.title}</p>
                      <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted">
                        <LocationIcon size={13} />
                        {o.summary}
                      </p>
                      <div className="mt-3.5 flex items-end justify-between border-t border-line-alt pt-3">
                        <p className={`text-[18px] font-extrabold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}>
                          {o.costLabel}
                        </p>
                        <p className="text-[13px] font-semibold text-muted">매칭 {o.matchScore}%</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
