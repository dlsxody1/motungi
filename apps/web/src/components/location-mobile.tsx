"use client";

import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, LocationIcon, SearchIcon } from "@/components/icons";
import { LocationPopularChips } from "@/components/location-popular-chips";
import { LocationSearchDropdown } from "@/components/location-search-dropdown";
import { Button, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import type { NeighborhoodPick } from "@/data/opportunities";
import type { LocationPickSource } from "@/data/location";
import type { NeighborhoodSearchResult } from "@motungi/core";

type Props = {
  selected: NeighborhoodPick;
  source: LocationPickSource;
  locating: boolean;
  geoError: string | null;
  locatedHere: boolean;
  cardTitle: string;
  cardSub: string;
  query: string;
  results: NeighborhoodSearchResult[];
  searching: boolean;
  showDropdown: boolean;
  onSetQuery: (q: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (e: { currentTarget: { value: string } }) => void;
  onRequestLocation: () => void;
  onChoose: (pick: NeighborhoodPick, from: LocationPickSource) => void;
  onStart: () => void;
};

/**
 * A2 · 위치/동네 설정 — 모바일 트리. 데스크탑과 마크업을 공유하지 않는다(레이아웃 쉘·
 * 여백·타이포가 달라 합치면 블록마다 삼항이 생긴다 — report-mobile/report-desktop과
 * 같은 판단). 인기 동네 칩·검색 드롭다운은 완전히 동일해 별도 공용 컴포넌트로 뽑았다.
 */
export function LocationMobile({
  selected,
  source,
  locating,
  geoError,
  locatedHere,
  cardTitle,
  cardSub,
  query,
  results,
  searching,
  showDropdown,
  onSetQuery,
  onCompositionStart,
  onCompositionEnd,
  onRequestLocation,
  onChoose,
  onStart,
}: Props) {
  return (
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
            <LocationPopularChips selected={selected} source={source} iconSize={14} onChoose={onChoose} />

            <button
              onClick={onRequestLocation}
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
                onChange={(e) => onSetQuery(e.target.value)}
                onCompositionStart={onCompositionStart}
                onCompositionEnd={onCompositionEnd}
                aria-label="동네 또는 구 검색"
                className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                placeholder="동네 또는 구 검색 (예: 역삼동, 강남구)"
              />
            </div>

            {showDropdown && (
              <LocationSearchDropdown searching={searching} results={results} onChoose={onChoose} />
            )}
          </div>

          <div className="shrink-0 px-6 pb-2 pt-2">
            <Button onClick={onStart}>{selected.dongName}으로 시작하기</Button>
          </div>
          <SafeBottom />
        </div>
      </MobileScreen>
    </div>
  );
}
