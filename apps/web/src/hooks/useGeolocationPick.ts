"use client";

import { useCallback, useRef, useState } from "react";
import { normalizeDong } from "@motungi/core";
import type { NeighborhoodPick } from "@/data/opportunities";
import { reverseGeocode } from "@/lib/geo";

/** 위치를 못 잡았을 때. 되돌릴 수 있는 실패라 "직접 고르기"로 유도한다. */
const GEO_FAIL = "위치를 가져오지 못했어요. 아래에서 동네를 직접 골라주세요.";

/**
 * 권한이 거부됐을 때. 페이지에서 되돌릴 수 없으므로 "다시 시도"가 아니라
 * **어디서 바꾸는지**를 알려준다.
 */
const GEO_DENIED =
  "위치 권한이 꺼져 있어요. 주소창 왼쪽 자물쇠·위치 아이콘에서 허용으로 바꾸거나, 아래에서 동네를 직접 골라주세요.";

export interface GeolocationPickView {
  /** 좌표를 받아오는 중. */
  locating: boolean;
  /** 실패·거부 안내 문구. 없으면 null. */
  geoError: string | null;
  /** 위치 잡기 시작 — 권한 상태에 따라 바로 조회하거나 설명 단계를 요청한다. */
  requestLocation: () => Promise<void>;
  /** 설명 다이얼로그에서 "허용"을 누른 뒤 실제 조회. */
  runGeolocation: () => void;
  /** 다른 경로로 동네를 고르면 안내를 지운다. */
  clearError: () => void;
}

/**
 * 현재 위치로 동네 잡기 — 권한 분기 · 좌표 조회 · 역지오코딩.
 *
 * **lib이 아니라 훅인 이유**: `navigator.permissions`/`getCurrentPosition`은 부작용이고
 * 브라우저 전용이다. `lib/`은 순수 레이어라(react-web.md) 여기 들어갈 수 없다.
 *
 * **선택 상태를 소유하지 않는다.** 잡은 결과는 `onPicked`로 넘기고, 무엇을 선택하고
 * 어떻게 보여줄지는 화면의 몫이다 — 그래야 이 훅이 "위치 잡기"만 알고 "동네 선택 UI"를
 * 모른다. 같은 이유로 설명 다이얼로그도 열지 않고 `onNeedsPrime`으로 요청만 한다
 * (DOM ref는 화면의 책임).
 *
 * 분리한 배경: 같은 로직이 `app/location/page.tsx`와 `components/neighborhood-menu.tsx`에
 * 복붙될 조짐이 있었다. `useNeighborhoodSearch`가 바로 그 복붙 때문에 태어난 훅이다
 * (그 파일 주석 참고) — 같은 파일, 같은 병이라 먼저 뽑아둔다.
 */
export function useGeolocationPick({
  onPicked,
  onNeedsPrime,
}: {
  /** 좌표+행정동을 잡았을 때. 선택 반영은 호출부가 한다. */
  onPicked: (pick: NeighborhoodPick) => void;
  /** 권한이 prompt이거나 permissions API가 없어 설명 단계가 필요할 때. */
  onNeedsPrime: () => void;
}): GeolocationPickView {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 콜백은 매 렌더 새로 올 수 있다 — effect/콜백 재생성을 막으려고 ref로 최신값만 든다.
  const pickedRef = useRef(onPicked);
  pickedRef.current = onPicked;
  const primeRef = useRef(onNeedsPrime);
  primeRef.current = onNeedsPrime;

  const runGeolocation = useCallback(() => {
    setGeoError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // 좌표 → 행정동 역지오코딩. 성공해도 바로 다음 화면으로 넘기지 않는다 —
        // 위치가 제대로 잡혔는지 유저가 눈으로 확인할 수 있게 선택만 갱신한다.
        const geo = await reverseGeocode(point.lat, point.lng);
        pickedRef.current({
          // NAVER는 "역삼1동"처럼 번호가 붙은 행정동명을 준다 — 검색 결과 표기와 맞춘다.
          dongName: geo?.dongName ? normalizeDong(geo.dongName) : "현재 위치",
          admCode: geo?.admCode ?? undefined,
          region: geo ? undefined : "좌표로 설정됨",
          point,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        // 1 = PERMISSION_DENIED. 프롬프트에서 방금 거부한 경우라 일반 실패와 안내가 달라야 한다.
        setGeoError(err.code === err.PERMISSION_DENIED ? GEO_DENIED : GEO_FAIL);
      },
    );
  }, []);

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
  const requestLocation = useCallback(async () => {
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
    primeRef.current();
  }, [runGeolocation]);

  const clearError = useCallback(() => setGeoError(null), []);

  return { locating, geoError, requestLocation, runGeolocation, clearError };
}
