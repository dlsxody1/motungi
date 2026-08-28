"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { normalizeDong } from "@motungi/core";
import {
  DEFAULT_NEIGHBORHOOD,
  type NeighborhoodPick,
  POPULAR_NEIGHBORHOODS,
} from "@/data/opportunities";
import { useNeighborhoodSearch } from "@/hooks/useNeighborhoodSearch";
import { reverseGeocode } from "@/lib/geo";
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
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const primeRef = useRef<HTMLDialogElement>(null);
  const GEO_FAIL = "위치를 가져오지 못했어요. 아래에서 동네를 직접 골라주세요.";
  // 거부는 페이지에서 되돌릴 수 없다 — "다시 시도"가 아니라 어디서 바꾸는지를 알려준다.
  const GEO_DENIED =
    "위치 권한이 꺼져 있어요. 주소창 왼쪽 자물쇠·위치 아이콘에서 허용으로 바꾸거나, 아래에서 동네를 직접 골라주세요.";

  const choose = (pick: NeighborhoodPick, from: PickSource) => {
    setSelected(pick);
    setSource(from);
    setGeoError(null);
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

  /**
   * 카드 클릭 → 브라우저 권한 프롬프트 사이에 설명 한 단계를 둔다.
   * 이유는 예쁘라고가 아니라 **거부가 되돌릴 수 없기 때문**이다 — 한 번 "차단"을 누르면
   * 페이지에서 다시 물어볼 방법이 없고(브라우저 설정에서 직접 바꿔야 함), 그 순간
   * 이 화면의 자동 설정 기능이 영구히 죽는다.
   *
   * 다만 모두에게 단계를 하나 더 물리지는 않는다:
   *  - granted → 설명 없이 바로 조회(재방문자에게 군더더기 금지)
   *  - denied  → 프롬프트가 안 뜨므로 조회 자체를 시도하지 않고 복구 안내를 준다
   *  - prompt / permissions API 미지원 → 그때만 설명 다이얼로그
   */
  const requestLocation = async () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(GEO_FAIL);
      return;
    }
    let state: PermissionState | null = null;
    try {
      state = (await navigator.permissions?.query({ name: "geolocation" }))?.state ?? null;
    } catch {
      state = null; // 미지원 브라우저 — 설명을 보여주는 쪽으로 폴백.
    }
    if (state === "granted") {
      runGeolocation();
      return;
    }
    if (state === "denied") {
      setGeoError(GEO_DENIED);
      return;
    }
    primeRef.current?.showModal();
  };

  const runGeolocation = () => {
    setGeoError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // 좌표 → 행정동 역지오코딩. 성공하면 선택만 갱신하고 유저가 확인 후 시작하도록 둔다
        // (바로 넘기지 않음 — 위치가 제대로 잡혔는지 유저가 눈으로 확인할 수 있게).
        const geo = await reverseGeocode(point.lat, point.lng);
        setSelected({
          // NAVER는 "역삼1동"처럼 번호가 붙은 행정동명을 준다 — 검색 결과 표기와 맞춘다.
          dongName: geo?.dongName ? normalizeDong(geo.dongName) : "현재 위치",
          admCode: geo?.admCode ?? undefined,
          region: geo ? undefined : "좌표로 설정됨",
          point,
        });
        setSource("current");
        setLocating(false);
        search.reset();
      },
      (err) => {
        setLocating(false);
        // 1 = PERMISSION_DENIED. 프롬프트에서 방금 거부한 경우라 일반 실패와 안내가 달라야 한다.
        setGeoError(err.code === err.PERMISSION_DENIED ? GEO_DENIED : GEO_FAIL);
      },
    );
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
