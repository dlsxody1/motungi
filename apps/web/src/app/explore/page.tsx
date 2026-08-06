"use client";

import { nearestAnchorKm, normalizeGu, scoreAll } from "@motungi/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { NeighborhoodMenu } from "@/components/neighborhood-menu";
import { Chip, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { ExploreDesktopGrid, ExploreMobileList } from "@/components/explore-list";
import { ExploreSearch } from "@/components/explore-search";
import { ExploreRowSkeleton } from "@/components/explore-skeleton";
import { useEnsureCatalog } from "@/hooks/useEnsureCatalog";
import { FILTERS } from "@/lib/explore-filters";
import { useAppStore } from "@/store/useAppStore";

/** B1 · 탐색 (전체 기회) — 반응형. useSearchParams는 Suspense 경계 필요. */
export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreInner />
    </Suspense>
  );
}

function ExploreInner() {
  const { catalog, status: catalogStatus } = useEnsureCatalog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const homeDong = useAppStore((s) => s.anchors.home?.dongName);
  const dongName = homeDong ?? "우리 동네";
  const user = useAppStore((s) => s.user);
  const answers = useAppStore((s) => s.answers);
  /**
   * `setAnchor`는 매번 `{...s.anchors}`로 **새 객체**를 만든다(core/store.ts).
   * 그대로 쓰면 앵커를 바꿀 때마다 scored → source → haystacks → list 4단 메모가
   * 연쇄로 무너지고, list는 두 virtualizer의 prop이라 탐색의 모든 memo 경계가
   * 한 번에 뚫린다. scoreAll/nearestAnchorKm이 객체를 요구하므로 필드 추출 대신
   * **좌표 값이 같으면 같은 참조**를 유지하는 쪽으로 고정한다.
   */
  const rawAnchors = useAppStore((s) => s.anchors);
  const anchorKey = JSON.stringify([rawAnchors.home?.point, rawAnchors.work?.point]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 좌표 값(anchorKey)으로 비교한다
  const anchors = useMemo(() => rawAnchors, [anchorKey]);
  // 진단 완료 시에만 매칭 랭킹 활성화. 진단 전에는 카탈로그 원본(매칭 % 미표기).
  const matchActive = answers != null;
  /**
   * 로딩 중. catalogStatus는 조회가 끝나야 ok/empty/error로 바뀌므로 "idle"이 곧 로딩이다.
   * 이걸 구분하지 않으면 조회 중에도 "아직 등록된 활동이 없어요"가 떠서 **없다고 거짓말**을 한다.
   */
  const isLoading = catalogStatus === "idle";
  // 앵커(선택 동네 좌표)가 있으면 거리순 정렬이 가능하다(진단 전에도).
  const hasAnchor = anchors.home?.point != null || anchors.work?.point != null;

  /**
   * q·cat은 URL에서 초기값만 받는다(단방향).
   * 양방향 동기화를 하면 IME 조합 중 URL 갱신 → 리렌더가 캐럿을 흔든다.
   * region·sort·easyOnly는 넣지 않는다 — sort는 개인 취향이라 남의 링크가 내 정렬을 덮어쓴다.
   */
  const initialCat = searchParams.get("cat");
  const [filter, setFilter] = useState(() =>
    // 모르는 라벨이 오면 무시한다 — URL로 존재하지 않는 필터가 활성화되면 칩이 깨진다.
    initialCat && FILTERS.some((f) => f.label === initialCat) ? initialCat : "전체",
  );
  /**
   * `query`(입력 중)와 `debouncedQuery`(확정)를 나눠 든다.
   * 모바일·데스크톱 입력이 CSS로 동시에 마운트되므로 표시값은 여기서 공유해야 하고,
   * 대신 **무거운 하위 트리(목록·그리드)는 debouncedQuery에만 의존**하도록 memo로 끊었다.
   * 그래서 키 입력은 이 컴포넌트와 두 input만 다시 그리고, 목록은 150ms에 한 번 움직인다.
   */
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") ?? "");
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
      /**
       * 거리를 **한 번만** 계산해 붙인 뒤 정렬한다(decorate-sort-undecorate).
       * comparator 안에서 부르면 비교마다 하버사인이 돌아 n log n번이다 —
       * 500건이면 약 4500회. 미리 뽑으면 500회로 끝난다.
       */
      return scored
        .map((o) => ({ o, km: nearestAnchorKm(anchors, o.location) ?? Infinity }))
        .sort((a, b) => a.km - b.km)
        .map((x) => x.o);
    }
    return scored;
  }, [scored, sort, hasAnchor, anchors]);

  /**
   * 확정된 값만 URL에 되쓴다(디바운스된 q + cat). replace라 히스토리를 더럽히지 않고,
   * scroll:false라 목록 위치가 튀지 않는다. 빈 값은 파라미터 자체를 뺀다.
   */
  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQuery.trim()) sp.set("q", debouncedQuery.trim());
    if (filter !== "전체") sp.set("cat", filter);
    const qs = sp.toString();
    router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
  }, [debouncedQuery, filter, router]);

  /**
   * 행별 검색 하이스택. source가 바뀔 때만 만든다 —
   * list 안에서 만들면 키 입력마다 (행 × 필드) join이 다시 돈다.
   *
   * summary는 산문이 아니라 "구 · 장소 · 장르" 조인 문자열이라 지역·장소·장르가 이미 들어있다.
   * 반면 categoryLabel("동네 문화·공연")은 우리가 붙인 라벨이라 어디에도 없어서
   * 그대로 치면 0건이 나왔다 — 그래서 라벨과 정규화한 구 이름을 함께 넣는다.
   *
   * ponytail: 457행 클라 substring 필터. 코퍼스 5k+ 또는 반경 밖 검색 요구 시
   * /api/opportunities/search 신설 + title/summary trgm GIN. 기존 catalog 캐시 키에 q를 넣지 말 것.
   */
  const haystacks = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of source) {
      m.set(
        o.id,
        [o.title, o.summary, o.categoryLabel, o.location?.dongName, normalizeGu(o.location?.dongName)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      );
    }
    return m;
  }, [source]);

  const list = useMemo(() => {
    const cat = FILTERS.find((f) => f.label === filter)?.category ?? null;
    // 공백으로 쪼개 AND 매칭 — "망원 재즈"처럼 떨어진 두 단어도 잡는다(연속 부분문자열이 아니라서).
    const terms = debouncedQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return source.filter((o) => {
      if (cat && o.category !== cat) return false;
      if (region && normalizeGu(o.location?.dongName) !== region) return false;
      if (terms.length) {
        const hay = haystacks.get(o.id) ?? "";
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      if (easyOnly && !(o.difficulty != null && o.difficulty <= 0.33)) return false;
      return true;
    });
  }, [filter, region, debouncedQuery, source, easyOnly, haystacks]);

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

  /**
   * memo된 카드가 실제로 걸리려면 이 콜백이 **영원히** 같은 참조여야 한다.
   * `[router]`로 두면 useRouter()가 새 객체를 돌려주는 순간 콜백이 새로 만들어지고,
   * 그 하나 때문에 목록 전체가 다시 렌더된다(memo가 통째로 무력화된다).
   * router는 ref로 최신값만 들고, 콜백 자체는 의존성 없이 고정한다.
   */
  const routerRef = useRef(router);
  routerRef.current = router;
  const openDetail = useCallback((id: string) => routerRef.current.push(`/opportunity/${id}`), []);

  // 모바일 목록의 스크롤 컨테이너는 window가 아니라 아래 div다 — 목록에 넘겨준다.
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);

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

              <ExploreSearch
                query={query}
                onQueryChange={setQuery}
                onDebouncedChange={setDebouncedQuery}
                className="mt-4 flex h-[50px] items-center gap-2 rounded-xl bg-surface px-4 shadow-card"
                inputClassName="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />

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

              {/* 로딩 중엔 "없음" 문구 대신 스켈레톤 — 곧 목록이 온다는 걸 형태로 알린다. */}
              {isLoading ? (
                <div className="mt-2" aria-busy="true" aria-live="polite">
                  <span className="sr-only">활동을 불러오는 중</span>
                  {Array.from({ length: 6 }, (_, i) => (
                    <ExploreRowSkeleton key={i} />
                  ))}
                </div>
              ) : (
                list.length === 0 && (
                  <p className="py-10 text-center text-[14px] text-muted">
                    {source.length === 0
                      ? catalogStatus === "error" || catalogStatus === "unconfigured"
                        ? "활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                        : "아직 등록된 활동이 없어요. 곧 채워질 거예요."
                      : "조건에 맞는 활동이 아직 없어요."}
                  </p>
                )
              )}
              {/* 가상화: 보이는 행만 마운트한다. 스크롤 상태는 이 컴포넌트가 소유한다. */}
              <ExploreMobileList list={list} onOpen={openDetail} scrollRef={mobileScrollRef} />
            </div>
            <BottomNav active="explore" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="explore" dongName={dongName} userName={user?.displayName} hideNeighborhood>
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
              <ExploreSearch
                query={query}
                onQueryChange={setQuery}
                onDebouncedChange={setDebouncedQuery}
                iconSize={18}
                className="flex h-11 w-70 items-center gap-2 rounded-[11px] border border-line bg-surface px-3.5"
                inputClassName="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
              />
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
              {/* 앵커 변경(재조회+거리 재계산)과 결과 내 지역 필터(클라 필터)를 한 열에 두되
                  라벨로 갈라놓는다. 헤더 pill은 hideNeighborhood로 뺐다 — 진입점은 여기 하나. */}
              <p className="text-[14px] font-bold text-ink">내 동네</p>
              <NeighborhoodMenu
                // 앵커가 없으면 "우리 동네"는 지명인 척하는 빈 값이다 — 눌러야 할 것을 눌러야 한다고 말한다.
                dongLabel={homeDong ?? "동네 선택하기"}
                triggerClassName="mt-3 flex h-10 w-full items-center justify-between gap-1.5 rounded-lg border border-line bg-surface px-3 text-[14px] font-medium text-label hover:bg-bg"
              />

              <div className="my-4 h-px bg-line-alt" />

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

              {!isLoading && list.length === 0 && (
                <p className="py-12 text-center text-[14px] text-muted">
                  {source.length === 0
                    ? catalogStatus === "error" || catalogStatus === "unconfigured"
                      ? "활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                      : "아직 등록된 활동이 없어요. 곧 채워질 거예요."
                    : "조건에 맞는 활동이 아직 없어요."}
                </p>
              )}
              {/* 행 단위 가상화 + 열 수 관찰을 컴포넌트가 소유한다(창 크기 변경이 페이지를 안 흔들게). */}
              <ExploreDesktopGrid list={list} onOpen={openDetail} isLoading={isLoading} />
            </div>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
