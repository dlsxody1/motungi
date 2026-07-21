"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LocationIcon,
  SearchIcon,
} from "@/components/icons";
import {
  Button,
  Chip,
  InfoBox,
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
import { reverseGeocode, searchNeighborhoods } from "@/lib/geo";
import { useAppStore } from "@/store/useAppStore";

/** 검색 결과 → 선택 객체. 좌표를 그대로 실어 앵커에 주입 가능하게. */
type SearchItem = {
  admCode: string;
  dongName: string;
  sigungu: string;
  lat: number;
  lng: number;
};

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const GEO_FAIL = "위치를 가져오지 못했어요. 아래에서 동네를 직접 골라주세요.";

  // 검색어 디바운스(250ms) + 이전 요청 취소. 검색어가 비면 드롭다운을 닫는다.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const items = await searchNeighborhoods(q, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setResults(items);
        setSearching(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  const showDropdown = query.trim().length > 0;

  const choose = (pick: NeighborhoodPick) => {
    setSelected(pick);
    setQuery("");
    setResults([]);
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

  const useCurrentLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(GEO_FAIL);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // 좌표 → 행정동 역지오코딩. 성공하면 선택만 갱신하고 유저가 확인 후 시작하도록 둔다
        // (바로 넘기지 않음 — 위치가 제대로 잡혔는지 유저가 눈으로 확인할 수 있게).
        const geo = await reverseGeocode(point.lat, point.lng);
        setSelected({
          dongName: geo?.dongName ?? "현재 위치",
          admCode: geo?.admCode ?? undefined,
          region: geo ? undefined : "좌표로 설정됨",
          point,
        });
        setLocating(false);
        setQuery("");
        setResults([]);
      },
      () => {
        setLocating(false);
        setGeoError(GEO_FAIL);
      },
    );
  };

  /** 인기 동네 칩 (검색어 없을 때). */
  const popularChips = (iconSize: number) => (
    <div className="flex flex-wrap gap-2">
      {POPULAR_NEIGHBORHOODS.map((n) => {
        const active = selected.dongName === n.dongName && !selected.admCode;
        return (
          <Chip key={n.dongName} active={active} onClick={() => choose(n)}>
            {active && <LocationIcon size={iconSize} />}
            {n.dongName}
          </Chip>
        );
      })}
    </div>
  );

  /** 검색 결과 드롭다운 (검색어 있을 때). */
  const dropdown = (
    <div className="mt-2 overflow-hidden rounded-xl border border-line-alt bg-surface shadow-card">
      {searching && results.length === 0 ? (
        <p className="px-4 py-3 text-[14px] text-muted">검색 중…</p>
      ) : results.length > 0 ? (
        <ul role="listbox" aria-label="동네 검색 결과">
          {results.map((it) => (
            <li key={it.admCode} role="option" aria-selected={false}>
              <button
                onClick={() => choose(itemToPick(it))}
                className="tap-safe flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-alt"
              >
                <LocationIcon size={16} className="shrink-0 text-faint" />
                <span className="text-[15px] font-medium text-ink">{it.dongName}</span>
                <span className="text-[13px] text-muted">{it.sigungu}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-[14px] text-muted">검색 결과가 없어요.</p>
      )}
    </div>
  );

  /** 선택 확인 배너 (흰 박스, 뉴트럴/민트 체크 — 빨강 지양). */
  const confirmBanner = (
    <InfoBox icon={<CheckCircleIcon size={18} />}>
      {selected.region ? `${selected.region} ` : ""}
      <b className="text-ink">{selected.dongName}</b> 선택됨
    </InfoBox>
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

              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="mt-6 flex items-center gap-3 rounded-xl border border-line-alt bg-surface p-4 text-left shadow-card disabled:opacity-60"
              >
                <span className="grid size-11 place-items-center rounded-full bg-tint text-primary">
                  <LocationIcon size={22} />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-bold text-ink">
                    {locating ? "위치 확인 중…" : "현재 위치로 찾기"}
                  </span>
                  <span className="block text-[13px] text-muted">위치 권한 → 행정동 자동 설정</span>
                </span>
                <ChevronRightIcon size={20} className="text-faint" />
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
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="동네 이름 검색"
                  className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                  placeholder="동네 이름 검색 (예: 역삼동)"
                />
              </div>

              {showDropdown ? (
                dropdown
              ) : (
                <>
                  <p className="mb-2.5 mt-5 text-[13px] font-semibold text-label">최근 · 인기 동네</p>
                  {popularChips(14)}
                </>
              )}

              <div className="mt-5">{confirmBanner}</div>
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
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-muted hover:text-ink"
            >
              <ChevronLeftIcon size={18} /> 홈으로
            </Link>
            <h1 className="mt-4 text-[40px] font-extrabold leading-[1.2] tracking-[-0.025em] text-ink">
              어느 동네 기준으로
              <br />
              찾아드릴까요?
            </h1>
            <p className="mt-3 text-[17px] text-muted">설정한 동네가 모든 추천의 기준이 돼요.</p>

            <button
              onClick={useCurrentLocation}
              disabled={locating}
              className="mt-8 flex w-full items-center gap-4 rounded-[18px] border border-line-alt bg-surface p-5 text-left shadow-card transition-shadow hover:shadow-web-lift disabled:opacity-60"
            >
              <span className="grid size-12 place-items-center rounded-full bg-tint text-primary">
                <LocationIcon size={24} />
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-bold text-ink">
                  {locating ? "위치 확인 중…" : "현재 위치로 찾기"}
                </span>
                <span className="block text-[13px] text-muted">위치 권한 → 행정동 자동 설정</span>
              </span>
              <ChevronRightIcon size={22} className="text-faint" />
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

            <div className="flex h-14 items-center gap-2.5 rounded-[14px] border border-line-alt bg-surface px-4 shadow-card">
              <SearchIcon size={20} className="text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="동네 이름 검색"
                className="flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
                placeholder="동네 이름 검색 (예: 역삼동)"
              />
            </div>

            {showDropdown ? (
              dropdown
            ) : (
              <>
                <p className="mb-3 mt-6 text-[14px] font-semibold text-label">최근 · 인기 동네</p>
                {popularChips(15)}
              </>
            )}

            <div className="mt-6">{confirmBanner}</div>

            <button
              onClick={start}
              className="tap-safe mt-8 flex h-[56px] w-full items-center justify-center rounded-xl bg-primary text-[17px] font-bold text-white transition-colors hover:bg-primary-deep"
            >
              {selected.dongName}으로 시작하기
            </button>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
