"use client";

import { ChevronRightIcon, LocationIcon, SearchIcon } from "@/components/icons";
import { LocationPopularChips } from "@/components/location-popular-chips";
import { LocationSearchDropdown } from "@/components/location-search-dropdown";
import { Button } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
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
 * A2 · 위치/동네 설정 — 데스크탑 트리. 모바일과 마크업을 공유하지 않는다(레이아웃 쉘·
 * 여백·타이포가 달라 합치면 블록마다 삼항이 생긴다 — report-mobile/report-desktop과
 * 같은 판단). 인기 동네 칩·검색 드롭다운은 완전히 동일해 별도 공용 컴포넌트로 뽑았다.
 */
export function LocationDesktop({
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
          <LocationPopularChips selected={selected} source={source} iconSize={15} onChoose={onChoose} />

          <button
            onClick={onRequestLocation}
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
              onChange={(e) => onSetQuery(e.target.value)}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              aria-label="동네 또는 구 검색"
              className="flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
              placeholder="동네 또는 구 검색 (예: 역삼동, 강남구)"
            />
          </div>

          {showDropdown && (
            <LocationSearchDropdown searching={searching} results={results} onChoose={onChoose} />
          )}

          <Button onClick={onStart} className="mt-8 h-[56px] w-full text-[17px]">
            {selected.dongName}으로 시작하기
          </Button>
        </div>
      </WebContainer>
    </DesktopShell>
  );
}
