"use client";

import type { OpportunityCategory } from "@motungi/core";
import { nearestAnchorKm, normalizeGu, scoreAll } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { BottomNav } from "@/components/bottom-nav";
import {
  BookmarkIcon,
  CheckIcon,
  CloseIcon,
  LocationIcon,
  SearchIcon,
} from "@/components/icons";
import { NeighborhoodMenu } from "@/components/neighborhood-menu";
import { Thumbnail } from "@/components/thumbnail";
import { Chip, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { ExploreCard } from "@/components/explore-card";
import { ExploreRow } from "@/components/explore-row";
import { useEnsureCatalog } from "@/hooks/useEnsureCatalog";
import { useAppStore } from "@/store/useAppStore";

/** 필터 라벨 → 카테고리. "전체"는 null. 데이터 있는 카테고리만 동적으로 노출된다. */
const FILTERS: { label: string; category: OpportunityCategory | null }[] = [
  { label: "전체", category: null },
  { label: "문화·공연", category: "culture" },
  { label: "운동·산책", category: "active" },
  { label: "먹거리·마켓", category: "food" },
  { label: "클래스", category: "class" },
  { label: "마켓", category: "market" },
  { label: "부업", category: "side_job" },
];

/** B1 · 탐색 (전체 기회) — 반응형 */
export default function ExplorePage() {
  useEnsureCatalog();
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";
  const user = useAppStore((s) => s.user);
  const catalog = useAppStore((s) => s.catalog);
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const answers = useAppStore((s) => s.answers);
  const anchors = useAppStore((s) => s.anchors);
  // 진단 완료 시에만 매칭 랭킹 활성화. 진단 전에는 카탈로그 원본(매칭 % 미표기).
  const matchActive = answers != null;
  // 앵커(선택 동네 좌표)가 있으면 거리순 정렬이 가능하다(진단 전에도).
  const hasAnchor = anchors.home?.point != null || anchors.work?.point != null;

  const [filter, setFilter] = useState("전체");
  const [query, setQuery] = useState("");
  // 필터링은 디바운스된 값으로 — 캐럿은 query로 즉시 반응하되 목록 재계산만 미룬다.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [easyOnly, setEasyOnly] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  // 정렬: 추천순(진단 필요) · 거리순(앵커 필요) · 마감임박순(기본).
  const [sort, setSort] = useState<"recommend" | "distance" | "deadline">(
    matchActive ? "recommend" : "deadline",
  );

  // 서버 실데이터만 사용(목업 폴백 없음). 진단 답변이 있으면 전체를 재스코어링해
  // matchScore를 채우고 매칭 내림차순 정렬한다(catalog의 matchScore는 0 고정이므로).
  const scored = useMemo(
    () =>
      answers
        ? scoreAll(catalog, answers, anchors).map((r) => ({
            ...r.opportunity,
            matchScore: Math.round(r.score * 100),
          }))
        : catalog,
    [catalog, answers, anchors],
  );

  // 정렬 적용. recommend는 scored 순서 유지(scoreAll이 이미 내림차순).
  // distance는 앵커 최소거리 오름차순 — 좌표 없는 행은 뒤로. deadline은 서버 순서(마감임박).
  const source = useMemo(() => {
    if (sort === "distance" && hasAnchor) {
      return [...scored].sort((a, b) => {
        const da = nearestAnchorKm(anchors, a.location) ?? Infinity;
        const db = nearestAnchorKm(anchors, b.location) ?? Infinity;
        return da - db;
      });
    }
    return scored;
  }, [scored, sort, hasAnchor, anchors]);

  // 한글 입력 중(IME 조합)에도 매 자모마다 필터가 돌지 않도록 150ms 미룬다.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const list = useMemo(() => {
    const cat = FILTERS.find((f) => f.label === filter)?.category ?? null;
    const q = debouncedQuery.trim();
    return source.filter((o) => {
      if (cat && o.category !== cat) return false;
      if (region && normalizeGu(o.location?.dongName) !== region) return false;
      if (q && !`${o.title} ${o.summary}`.includes(q)) return false;
      if (easyOnly && !(o.difficulty != null && o.difficulty <= 0.33)) return false;
      return true;
    });
  }, [filter, region, debouncedQuery, source, easyOnly]);

  // 활성 필터 칩(실제 상태 파생). 선택 없으면 미표시. 전부 해제 가능(죽은 칩 없음).
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filter !== "전체") activeChips.push({ key: "cat", label: filter, clear: () => setFilter("전체") });
  if (region) activeChips.push({ key: "region", label: region, clear: () => setRegion(null) });
  if (easyOnly) activeChips.push({ key: "easy", label: "낮은 난이도", clear: () => setEasyOnly(false) });

  // 데이터 있는 카테고리만 노출("전체"는 항상). count===0 카테고리는 숨김.
  const CATEGORIES = useMemo(
    () =>
      FILTERS.map((f) => ({
        label: f.label,
        count: f.category
          ? source.filter((o) => o.category === f.category).length
          : source.length,
      })).filter((c) => c.label === "전체" || c.count > 0),
    [source],
  );

  // 지역(구) 옵션 — 정규화한 dong_name distinct + 건수. 건수순 상위 8개만 노출.
  const REGIONS = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of source) {
      const gu = normalizeGu(o.location?.dongName);
      if (gu) counts.set(gu, (counts.get(gu) ?? 0) + 1);
    }
    // 상위 8개 제한은 300건 무필터 시절의 우회책이었다. 이제 목록이 앵커 반경이라
    // 구 종류가 애초에 적고, 자르면 오히려 선택 못 하는 구가 생긴다.
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [source]);

  // memo된 카드가 실제로 걸리려면 콜백이 렌더마다 새로 만들어지면 안 된다.
  const openDetail = useCallback((id: string) => router.push(`/opportunity?id=${id}`), [router]);

  // ── 가상화 ──
  // 모바일은 스크롤 컨테이너가 window가 아니라 아래 div, 데스크톱은 페이지 스크롤이다.
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);

  const mobileVirtualizer = useVirtualizer({
    count: list.length,
    getScrollElement: () => mobileScrollRef.current,
    // 행 높이는 가변(제목 줄바꿈) — 추정값으로 시작하고 measureElement로 실측 보정한다.
    estimateSize: () => 108,
    overscan: 6,
  });

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
  // 데스크톱은 페이지(window) 스크롤이다. documentElement를 getScrollElement로 넘기면
  // 스크롤 이벤트를 못 받아 창이 갱신되지 않는다 — window 전용 훅을 쓴다.
  const desktopListRef = useRef<HTMLDivElement | null>(null);
  // 목록이 시작되는 y좌표. 첫 렌더에는 ref가 비어 있어 0이고, 마운트 후 아래 effect가 채운다.
  const [listTop, setListTop] = useState(0);
  const desktopVirtualizer = useWindowVirtualizer({
    count: rowCount,
    // 목록이 페이지 상단이 아니라 헤더/필터 아래에서 시작하므로 그 오프셋을 알려준다.
    scrollMargin: listTop,
    estimateSize: () => 360,
    overscan: 3,
  });

  // 열 수가 바뀌면 한 행에 담기는 카드가 달라져 기존 실측 높이가 무의미해진다 → 재측정.
  // 첫 렌더에는 desktopListRef가 null이라 scrollMargin이 0이므로, 마운트 후에도 한 번 돌린다.
  useEffect(() => {
    setListTop(desktopListRef.current?.offsetTop ?? 0);
    desktopVirtualizer.measure();
  }, [lanes, listTop, desktopVirtualizer]);

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div ref={mobileScrollRef} className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
              <div className="flex items-center justify-between pt-1">
                <h1 className="text-[24px] font-extrabold text-ink">탐색</h1>
                <NeighborhoodMenu
                  dongLabel={dongName}
                  triggerClassName="flex h-9 items-center gap-1 rounded-pill border border-line bg-surface px-3 text-[13px] font-semibold text-label shadow-card"
                />
              </div>

              <div className="mt-4 flex h-[50px] items-center gap-2 rounded-xl bg-surface px-4 shadow-card">
                <SearchIcon size={20} className="text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="활동·키워드 검색"
                  className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                  placeholder="활동·키워드 검색"
                />
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c.label}
                    active={filter === c.label}
                    onClick={() => setFilter(c.label)}
                    className="shrink-0"
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>

              {list.length === 0 && (
                <p className="py-10 text-center text-[14px] text-muted">
                  {source.length === 0
                    ? catalogStatus === "error" || catalogStatus === "unconfigured"
                      ? "활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                      : "아직 등록된 활동이 없어요. 곧 채워질 거예요."
                    : "조건에 맞는 활동이 아직 없어요."}
                </p>
              )}
              {/* 가상화: 보이는 행만 마운트한다. 높이는 measureElement로 실측 보정. */}
              <div
                className="relative mt-2"
                style={{ height: mobileVirtualizer.getTotalSize() }}
              >
                {mobileVirtualizer.getVirtualItems().map((v) => {
                  const o = list[v.index];
                  if (!o) return null;
                  return (
                    <div
                      key={o.id}
                      ref={mobileVirtualizer.measureElement}
                      data-index={v.index}
                      className="absolute left-0 top-0 w-full border-b border-line-alt"
                      style={{ transform: `translateY(${v.start}px)` }}
                    >
                      <ExploreRow o={o} onOpen={openDetail} />
                    </div>
                  );
                })}
              </div>
            </div>
            <BottomNav active="explore" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="explore" dongName={dongName} userName={user?.displayName}>
        <WebContainer className="py-8">
          {/* 헤더 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">{dongName}에서 할 만한 것</h1>
              <p className="mt-1.5 text-[15px] text-muted">
                퇴근 후·주말 활동 {source.length}건
                {sort === "recommend" ? " · 진단 기준 정렬" : sort === "distance" ? " · 가까운순" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-70 items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5">
                <SearchIcon size={18} className="text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="활동 검색"
                  className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
                  placeholder="활동 검색"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                aria-label="정렬"
                className="select-chevron h-11 rounded-[11px] border border-line bg-surface pl-3.5 text-[14px] font-semibold text-label"
              >
                {matchActive && <option value="recommend">추천순</option>}
                <option value="distance" disabled={!hasAnchor}>
                  가까운순
                </option>
                <option value="deadline">마감임박순</option>
              </select>
            </div>
          </div>

          {/* 2단: 사이드바 + 그리드 */}
          <div className="mt-5 grid grid-cols-1 items-start gap-7 lg:grid-cols-[248px_1fr]">
            {/* 사이드바 (스크롤 시 따라오게) */}
            <aside className="rounded-[18px] bg-surface p-5.5 shadow-web lg:sticky lg:top-[88px]">
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

              {REGIONS.length > 0 && (
                <>
                  <div className="my-4 h-px bg-line-alt" />
                  <p className="text-[14px] font-bold text-ink">지역</p>
                  <select
                    value={region ?? ""}
                    onChange={(e) => setRegion(e.target.value || null)}
                    aria-label="지역 필터"
                    className="select-chevron mt-3 h-10 w-full rounded-lg border border-line bg-surface pl-3 text-[14px] font-medium text-label"
                  >
                    <option value="">전체 지역</option>
                    {REGIONS.map((r) => (
                      <option key={r.label} value={r.label}>
                        {r.label} ({r.count})
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className="my-4 h-px bg-line-alt" />

              <p className="text-[14px] font-bold text-ink">난이도</p>
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[14px] text-label">
                <input
                  type="checkbox"
                  checked={easyOnly}
                  onChange={(e) => setEasyOnly(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className={`grid size-5 place-items-center rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
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
                  {activeChips.map((c) => (
                    <button
                      key={c.key}
                      onClick={c.clear}
                      className="flex items-center gap-1 rounded-pill border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-label shadow-card hover:border-faint"
                    >
                      {c.label} <CloseIcon size={13} className="text-faint" />
                    </button>
                  ))}
                </div>
              )}

              {list.length === 0 && (
                <p className="py-12 text-center text-[14px] text-muted">
                  {source.length === 0
                    ? catalogStatus === "error" || catalogStatus === "unconfigured"
                      ? "활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                      : "아직 등록된 활동이 없어요. 곧 채워질 거예요."
                    : "조건에 맞는 활동이 아직 없어요."}
                </p>
              )}
              {/* 행 단위 가상화 — 각 가상 항목이 한 행(카드 lanes개)을 담는다. */}
              <div
                ref={desktopListRef}
                className="relative"
                style={{ height: desktopVirtualizer.getTotalSize() }}
              >
                {desktopVirtualizer.getVirtualItems().map((v) => {
                  const rowItems = list.slice(v.index * lanes, v.index * lanes + lanes);
                  if (rowItems.length === 0) return null;
                  return (
                    <div
                      key={v.key}
                      ref={desktopVirtualizer.measureElement}
                      data-index={v.index}
                      className="absolute left-0 top-0 w-full pb-4"
                      style={{
                        // window 기준 좌표라 목록 시작 오프셋만큼 되돌려야 컨테이너 안에 맞는다.
                        transform: `translateY(${v.start - desktopVirtualizer.options.scrollMargin}px)`,
                      }}
                    >
                      {/* 행 안에서는 평범한 그리드 — 같은 행 카드끼리 높이가 맞는다. */}
                      <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }}
                      >
                        {rowItems.map((o) => (
                          <ExploreCard key={o.id} o={o} onOpen={openDetail} />
                        ))}
                      </div>
                    </div>
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
