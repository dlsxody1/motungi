"use client";

import type { OpportunityCategory } from "@motungi/core";
import { TIMESLOT_LABEL } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { ALL_OPPORTUNITIES } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** 필터 라벨 → 카테고리. "전체"는 null. */
const FILTERS: { label: string; category: OpportunityCategory | null }[] = [
  { label: "전체", category: null },
  { label: "문화·공연", category: "culture" },
  { label: "운동·산책", category: "active" },
  { label: "먹거리·마켓", category: "food" },
  { label: "클래스", category: "class" },
  { label: "부업", category: "side_job" },
];

/** B1 · 탐색 (전체 기회) — 반응형 */
export default function ExplorePage() {
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";
  const catalog = useAppStore((s) => s.catalog);
  const timeSlot = useAppStore((s) => s.answers?.timeSlot);
  const source = catalog.length > 0 ? catalog : ALL_OPPORTUNITIES;
  const [filter, setFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [easyOnly, setEasyOnly] = useState(false);

  const list = useMemo(() => {
    const cat = FILTERS.find((f) => f.label === filter)?.category ?? null;
    const q = query.trim();
    return source.filter((o) => {
      if (cat && o.category !== cat) return false;
      if (q && !`${o.title} ${o.summary}`.includes(q)) return false;
      if (easyOnly && !(o.difficulty != null && o.difficulty <= 0.33)) return false;
      return true;
    });
  }, [filter, query, source, easyOnly]);

  // 활성 필터 칩(실제 상태 파생). 선택 없으면 미표시.
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filter !== "전체") activeChips.push({ key: "cat", label: filter, clear: () => setFilter("전체") });
  if (easyOnly) activeChips.push({ key: "easy", label: "낮은 난이도", clear: () => setEasyOnly(false) });
  if (timeSlot) activeChips.push({ key: "time", label: TIMESLOT_LABEL[timeSlot], clear: () => {} });

  const CATEGORIES = useMemo(
    () =>
      FILTERS.map((f) => ({
        label: f.label,
        count: f.category
          ? source.filter((o) => o.category === f.category).length
          : source.length,
      })),
    [source],
  );

  const openDetail = (id: string) => router.push(`/opportunity?id=${id}`);

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
                <button
                  onClick={() => router.push("/location")}
                  className="flex h-9 items-center gap-1 rounded-pill border border-line bg-surface px-3 text-[13px] font-semibold text-label"
                >
                  {dongName} <ChevronDownIcon size={16} className="text-faint" />
                </button>
              </div>

              <div className="mt-4 flex h-[50px] items-center gap-2 rounded-xl bg-surface px-4 shadow-card">
                <SearchIcon size={20} className="text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                  placeholder="활동·키워드 검색"
                />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <Chip
                    key={f.label}
                    active={filter === f.label}
                    onClick={() => setFilter(f.label)}
                    className="shrink-0"
                  >
                    {f.label}
                  </Chip>
                ))}
              </div>

              {list.length === 0 && (
                <p className="py-10 text-center text-[14px] text-muted">조건에 맞는 활동이 아직 없어요.</p>
              )}
              <div className="mt-2 divide-y divide-line-alt">
                {list.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => openDetail(o.id)}
                    className="flex w-full items-start gap-3 py-4 text-left"
                  >
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
                  </button>
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
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">{dongName}에서 할 만한 것</h1>
              <p className="mt-1.5 text-[15px] text-muted">
                퇴근 후·주말 활동 {source.length}건 · 진단 기준 정렬
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-70 items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5">
                <SearchIcon size={18} className="text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
                  placeholder="활동 검색"
                />
              </div>
              <span className="flex h-11 items-center gap-1.5 rounded-[11px] border border-line bg-surface px-4 text-[14px] font-semibold text-muted">
                매칭순 정렬
              </span>
            </div>
          </div>

          {/* 2단: 사이드바 + 그리드 */}
          <div className="mt-7 grid grid-cols-1 items-start gap-7 lg:grid-cols-[248px_1fr]">
            {/* 사이드바 */}
            <aside className="rounded-[18px] bg-surface p-5.5 shadow-web">
              <p className="text-[14px] font-bold text-ink">카테고리</p>
              <div className="mt-3 space-y-0.5">
                {CATEGORIES.map((c) => {
                  const on = filter === c.label;
                  return (
                    <button
                      key={c.label}
                      onClick={() => setFilter(c.label)}
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

              <p className="text-[14px] font-bold text-ink">난이도</p>
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[14px] text-label">
                <input
                  type="checkbox"
                  checked={easyOnly}
                  onChange={(e) => setEasyOnly(e.target.checked)}
                  className="sr-only"
                />
                <span
                  className={`grid size-5 place-items-center rounded-[6px] ${
                    easyOnly ? "bg-primary text-white" : "border-[1.5px] border-line"
                  }`}
                >
                  {easyOnly && <CheckIcon size={13} />}
                </span>
                낮음만 보기 (방전형 추천)
              </label>
            </aside>

            {/* 그리드 */}
            <div>
              {/* 활성 필터 칩 (실제 상태 파생) */}
              {activeChips.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {activeChips.map((c) =>
                    c.key === "time" ? (
                      <span
                        key={c.key}
                        className="flex items-center gap-1 rounded-pill border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-label"
                      >
                        {c.label}
                      </span>
                    ) : (
                      <button
                        key={c.key}
                        onClick={c.clear}
                        className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-[13px] font-semibold text-white"
                      >
                        {c.label} <CloseIcon size={13} />
                      </button>
                    ),
                  )}
                </div>
              )}

              {list.length === 0 && (
                <p className="py-12 text-center text-[14px] text-muted">조건에 맞는 활동이 아직 없어요.</p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((o, i) => {
                  const pick = i === 0;
                  return (
                    <button
                      key={o.id}
                      onClick={() => openDetail(o.id)}
                      className={`wcard-hover flex flex-col rounded-[18px] bg-surface p-5 text-left shadow-web ${
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
                    </button>
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
