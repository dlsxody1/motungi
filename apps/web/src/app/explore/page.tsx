"use client";

import type { OpportunityCategory } from "@motungi/core";
import { nearestAnchorKm, normalizeGu, scoreAll } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  const list = useMemo(() => {
    const cat = FILTERS.find((f) => f.label === filter)?.category ?? null;
    const q = query.trim();
    return source.filter((o) => {
      if (cat && o.category !== cat) return false;
      if (region && normalizeGu(o.location?.dongName) !== region) return false;
      if (q && !`${o.title} ${o.summary}`.includes(q)) return false;
      if (easyOnly && !(o.difficulty != null && o.difficulty <= 0.33)) return false;
      return true;
    });
  }, [filter, region, query, source, easyOnly]);

  // 점진 렌더: 초기 STEP개만, "더보기"로 +STEP. 필터/검색이 바뀌면 처음부터.
  const STEP = 30;
  const [visibleCount, setVisibleCount] = useState(STEP);
  useEffect(() => {
    setVisibleCount(STEP);
  }, [filter, region, query, easyOnly, sort]);
  const visible = useMemo(() => list.slice(0, visibleCount), [list, visibleCount]);
  const hasMore = visibleCount < list.length;

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
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));
  }, [source]);

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
              <div className="mt-2 divide-y divide-line-alt">
                {visible.map((o) => (
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
                      <p className="text-[12px] text-muted">자세히 →</p>
                    </div>
                  </button>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((n) => n + STEP)}
                  className="tap-safe mt-4 h-11 w-full rounded-xl border border-line bg-surface text-[14px] font-semibold text-label"
                >
                  더보기 ({list.length - visibleCount}개 남음)
                </button>
              )}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((o) => {
                  return (
                    <button
                      key={o.id}
                      onClick={() => openDetail(o.id)}
                      className="wcard-hover flex flex-col overflow-hidden rounded-[18px] bg-surface text-left shadow-web"
                    >
                      {o.imageUrl && (
                        <Thumbnail
                          src={o.imageUrl}
                          tone={o.tone === "mint" ? "mint" : "brand"}
                          rounded="rounded-none"
                          sizeClass="h-32 w-full"
                        />
                      )}
                      <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between">
                        <span
                          className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                            o.tone === "mint" ? "bg-mint-tint text-mint" : "bg-tint text-primary-deep"
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
                        <p className={`text-[18px] font-extrabold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}>
                          {o.costLabel}
                        </p>
                        <p className="text-[13px] font-semibold text-muted">자세히 →</p>
                      </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setVisibleCount((n) => n + STEP)}
                    className="tap-safe h-11 rounded-xl border border-line bg-surface px-6 text-[14px] font-semibold text-label hover:border-faint"
                  >
                    더보기 ({list.length - visibleCount}개 남음)
                  </button>
                </div>
              )}
            </div>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
