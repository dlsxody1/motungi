"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LocationIcon,
  SearchIcon,
} from "@/components/icons";
import {
  Button,
  Chip,
  MobileScreen,
  SafeBottom,
  SafeTop,
} from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import {
  DEFAULT_NEIGHBORHOOD,
  type NeighborhoodPick,
  POPULAR_NEIGHBORHOODS,
} from "@/data/opportunities";
import { useGeolocationPick } from "@/hooks/useGeolocationPick";
import { useNeighborhoodSearch } from "@/hooks/useNeighborhoodSearch";
import { useAppStore } from "@/store/useAppStore";

/** 검색 결과 → 선택 객체. 좌표를 그대로 실어 앵커에 주입 가능하게. */
type SearchItem = {
  admCode: string;
  dongName: string;
  sigungu: string;
  lat: number;
  lng: number;
};

/** 선택이 어디서 왔는지 — 배너·위치카드가 출처를 눈으로 알려주기 위한 태그. */
type PickSource = "default" | "current" | "search" | "popular";

function itemToPick(it: SearchItem): NeighborhoodPick {
  return {
    admCode: it.admCode,
    dongName: it.dongName,
    region: it.sigungu,
    point: { lat: it.lat, lng: it.lng },
  };
}

/** A2 · 위치 / 동네 설정 — 반응형 */
export default function LocationPage() {
  const router = useRouter();
  const setAnchor = useAppStore((s) => s.setAnchor);
  const [selected, setSelected] = useState<NeighborhoodPick>(DEFAULT_NEIGHBORHOOD);
  const [source, setSource] = useState<PickSource>("default");
  // 디바운스·IME 보류·요청 취소는 훅이 소유한다(NeighborhoodMenu와 같은 구현을 공유).
  const search = useNeighborhoodSearch();
  const { query, results, searching, showDropdown } = search;
  const primeRef = useRef<HTMLDialogElement>(null);

  /**
   * 권한 분기·좌표 조회·역지오코딩은 훅이 소유한다. 이 화면은 **선택 상태**만 들고,
   * 훅은 잡은 결과를 `onPicked`로 돌려준다(훅이 "동네 선택 UI"를 모르게 하기 위함).
   * 설명 다이얼로그도 훅이 열지 않고 요청만 한다 — DOM ref는 화면의 책임이다.
   */
  const { locating, geoError, requestLocation, runGeolocation, clearError } = useGeolocationPick({
    onPicked: (pick) => {
      setSelected(pick);
      setSource("current");
      search.reset();
    },
    onNeedsPrime: () => primeRef.current?.showModal(),
  });

  const choose = (pick: NeighborhoodPick, from: PickSource) => {
    setSelected(pick);
    setSource(from);
    clearError();
    search.reset();
  };

  const start = () => {
    // 선택 동네를 집 앵커로 저장(좌표 주입). 리포트/스코어링의 distance 기준점.
    setAnchor("home", {
      dongName: selected.dongName,
      admCode: selected.admCode,
      point: selected.point,
    });
    router.push("/diagnosis");
  };


  // ── 위치 카드: 잡힌 위치를 카드 자체가 흡수해서 상태를 보여준다 ──
  const locatedHere = source === "current";
  const cardTitle = locating
    ? "위치 확인 중…"
    : locatedHere
      ? `${selected.dongName}으로 설정됨`
      : "현재 위치로 찾기";
  const cardSub = locating
    ? "잠시만요, 동네를 찾고 있어요"
    : locatedHere
      ? "다른 위치면 다시 눌러 찾기"
      : "지금 있는 곳으로 동네를 잡아드려요";

  /** 인기 동네 칩 (검색어 없을 때). */
  const popularChips = (iconSize: number) => (
    <div className="flex flex-wrap gap-2">
      {POPULAR_NEIGHBORHOODS.map((n) => {
        const active = source === "popular" && selected.dongName === n.dongName;
        return (
          <Chip key={n.dongName} active={active} onClick={() => choose(n, "popular")}>
            {active && <LocationIcon size={iconSize} />}
            {n.dongName}
          </Chip>
        );
      })}
    </div>
  );

  /** 검색 결과 드롭다운 (검색어 있을 때). */
  const dropdown = (
    <div className="mt-2 overflow-hidden rounded-xl border border-line-alt bg-surface shadow-card md:shadow-web">
      {searching && results.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted">검색 중…</p>
      ) : results.length > 0 ? (
        <>
          <ul role="listbox" aria-label="동네 검색 결과">
            {results.map((it) => (
              <li key={it.admCode} role="option" aria-selected={false}>
                <button
                  onClick={() => choose(itemToPick(it), "search")}
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

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4">
              <Link href="/" aria-label="홈으로" className="tap-safe -ml-2 flex w-11 items-center text-ink">
                <ChevronLeftIcon size={24} />
              </Link>

              <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                어느 동네 기준으로
                <br />
                찾아드릴까요?
              </h1>
              <p className="mt-2 text-[15px] text-muted">설정한 동네가 추천의 기준이 돼요.</p>

              <p className="mb-2.5 mt-6 text-[13px] font-semibold text-label">최근 · 인기 동네</p>
              {popularChips(14)}

              <button
                onClick={requestLocation}
                disabled={locating}
                aria-live="polite"
                className="mt-6 flex items-center gap-3 rounded-xl border border-line-alt bg-surface p-4 text-left shadow-card transition-colors disabled:opacity-60"
              >
                <span
                  className={`grid size-11 place-items-center rounded-full transition-colors ${
                    locatedHere ? "bg-primary text-white" : "bg-tint text-primary"
                  }`}
                >
                  <LocationIcon size={22} />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-bold text-ink">{cardTitle}</span>
                  <span className="block text-[13px] text-muted">{cardSub}</span>
                </span>
                {locatedHere ? (
                  <span className="text-[13px] font-semibold text-primary-deep">다시 찾기</span>
                ) : (
                  <ChevronRightIcon size={20} className="text-faint" />
                )}
              </button>

              {geoError && (
                <p role="alert" className="mt-3 text-[13px] font-medium text-primary-deep">
                  {geoError}
                </p>
              )}

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[12px] text-muted">또는 직접 선택</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="flex h-[52px] items-center gap-2 rounded-xl border border-line-alt bg-surface px-4 shadow-card">
                <SearchIcon size={20} className="text-faint" />
                <input
                  value={query}
                  onChange={(e) => search.setQuery(e.target.value)}
                  onCompositionStart={search.onCompositionStart}
                  onCompositionEnd={search.onCompositionEnd}
                  aria-label="동네 또는 구 검색"
                  className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                  placeholder="동네 또는 구 검색 (예: 역삼동, 강남구)"
                />
              </div>

              {showDropdown && dropdown}
            </div>

            <div className="shrink-0 px-6 pb-2 pt-2">
              <Button onClick={start}>{selected.dongName}으로 시작하기</Button>
            </div>
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="home" variant="marketing" footer={false}>
        <WebContainer className="py-14">
          <div className="mx-auto max-w-[560px]">
            {/* '홈으로' 뒤로가기 링크를 뺐다 — 상단 내비에 이미 '홈'이 있어
                같은 목적지로 가는 링크가 한 화면에 둘이었다(모바일은 내비가 없어 유지). */}
            <h1 className="text-[40px] font-extrabold leading-[1.2] tracking-[-0.025em] text-ink">
              어느 동네 기준으로
              <br />
              찾아드릴까요?
            </h1>
            <p className="mt-3 text-[17px] text-muted">설정한 동네가 모든 추천의 기준이 돼요.</p>

            <p className="mb-3 mt-8 text-[14px] font-semibold text-label">최근 · 인기 동네</p>
            {popularChips(15)}

            <button
              onClick={requestLocation}
              disabled={locating}
              aria-live="polite"
              className="mt-8 flex w-full items-center gap-4 rounded-[18px] border border-line-alt bg-surface p-5 text-left shadow-web transition-shadow hover:shadow-web-lift disabled:opacity-60"
            >
              <span
                className={`grid size-12 place-items-center rounded-full transition-colors ${
                  locatedHere ? "bg-primary text-white" : "bg-tint text-primary"
                }`}
              >
                <LocationIcon size={24} />
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-bold text-ink">{cardTitle}</span>
                <span className="block text-[13px] text-muted">{cardSub}</span>
              </span>
              {locatedHere ? (
                <span className="text-[14px] font-semibold text-primary-deep">다시 찾기</span>
              ) : (
                <ChevronRightIcon size={22} className="text-faint" />
              )}
            </button>

            {geoError && (
              <p role="alert" className="mt-3 text-[14px] font-medium text-primary-deep">
                {geoError}
              </p>
            )}

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[13px] text-muted">또는 직접 선택</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex h-14 items-center gap-2.5 rounded-[14px] border border-line-alt bg-surface px-4 shadow-web">
              <SearchIcon size={20} className="text-faint" />
              <input
                value={query}
                onChange={(e) => search.setQuery(e.target.value)}
                onCompositionStart={search.onCompositionStart}
                onCompositionEnd={search.onCompositionEnd}
                aria-label="동네 또는 구 검색"
                className="flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
                placeholder="동네 또는 구 검색 (예: 역삼동, 강남구)"
              />
            </div>

            {showDropdown && dropdown}

            <Button onClick={start} className="mt-8 h-[56px] w-full text-[17px]">
              {selected.dongName}으로 시작하기
            </Button>
          </div>
        </WebContainer>
      </DesktopShell>

      {/* 권한 프롬프트 직전 설명. 모바일·데스크탑 레이아웃이 공유한다.
          native <dialog>라 top layer 렌더 + ESC/백드롭 닫기가 공짜다. */}
      <dialog
        ref={primeRef}
        aria-labelledby="geo-prime-title"
        onClick={(e) => {
          if (e.target === primeRef.current) primeRef.current?.close();
        }}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-surface p-5 shadow-web backdrop:bg-ink/30"
      >
        <h2 id="geo-prime-title" className="text-[17px] font-bold text-ink">
          위치를 알려주시면 동네를 자동으로 잡아드려요
        </h2>
        <ul className="mt-3 space-y-2 text-[14px] leading-[1.6] text-label">
          <li>지금 있는 곳의 행정동을 자동으로 설정해요.</li>
          <li>가까운 순으로 활동을 추천해요.</li>
          <li>좌표는 이 기기에만 저장되고, 계정에는 동네 이름만 올라가요.</li>
        </ul>
        <p className="mt-3 text-[13px] text-muted">
          다음 화면에서 브라우저가 한 번 더 물어봐요. 거부하면 이 페이지에서는 다시 켤 수 없어요.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            onClick={() => {
              primeRef.current?.close();
              runGeolocation();
            }}
            className="h-[48px] w-full text-[15px]"
          >
            위치 허용하고 찾기
          </Button>
          <button
            type="button"
            onClick={() => primeRef.current?.close()}
            className="h-[44px] w-full rounded-xl text-[14px] font-semibold text-muted hover:bg-surface-alt"
          >
            직접 고를게요
          </button>
        </div>
      </dialog>
    </>
  );
}
