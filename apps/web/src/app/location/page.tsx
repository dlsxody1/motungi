"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { LocationDesktop } from "@/components/location-desktop";
import { LocationMobile } from "@/components/location-mobile";
import { DEFAULT_NEIGHBORHOOD, type NeighborhoodPick } from "@/data/opportunities";
import type { LocationPickSource } from "@/data/location";
import { useGeolocationPick } from "@/hooks/useGeolocationPick";
import { useNeighborhoodSearch } from "@/hooks/useNeighborhoodSearch";
import { useAppStore } from "@/store/useAppStore";

/**
 * A2 · 위치 / 동네 설정 — 반응형.
 *
 * **이 파일은 컨테이너다** — 훅·상태·핸들러만 들고 마크업은 두 자식이 그린다
 * (선례: `app/report/page.tsx`). `md:hidden`은 CSS라 모바일·데스크톱 트리가
 * **둘 다 마운트**된다. 권한 프라임 다이얼로그는 두 트리 어디에도 속하지 않는
 * 단일 인스턴스라 여기 그대로 둔다.
 */
export default function LocationPage() {
  const router = useRouter();
  const setAnchor = useAppStore((s) => s.setAnchor);
  const [selected, setSelected] = useState<NeighborhoodPick>(DEFAULT_NEIGHBORHOOD);
  const [source, setSource] = useState<LocationPickSource>("default");
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

  const choose = (pick: NeighborhoodPick, from: LocationPickSource) => {
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

  const sharedProps = {
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
    onSetQuery: search.setQuery,
    onCompositionStart: search.onCompositionStart,
    onCompositionEnd: search.onCompositionEnd,
    onRequestLocation: requestLocation,
    onChoose: choose,
    onStart: start,
  };

  return (
    <>
      <LocationMobile {...sharedProps} />
      <LocationDesktop {...sharedProps} />

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
