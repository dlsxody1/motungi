"use client";

import { memo, useEffect, useRef, useState } from "react";
import { color } from "@motungi/tokens";
import { LocationIcon, ExternalLinkIcon } from "@/components/icons";

/**
 * 장소 지도 — 활동의 좌표(lat/lng)를 NAVER 지도로 보여준다.
 *
 * SDK(NaverMapSDK)가 로드돼 window.naver.maps가 준비되면 실제 지도 + 마커를 그리고,
 * 키 미설정 등으로 SDK가 없으면 "네이버 지도에서 열기" 딥링크 폴백을 그린다.
 * 딥링크는 키가 없어도 동작하므로, 키를 넣기 전에도 위치는 확인할 수 있다.
 *
 * 좌표가 없으면(공공 데이터에 좌표 누락) 아무것도 렌더하지 않는다 → 호출부에서 조건부 배치.
 */

// window.naver의 지도 부분만 얕게 타이핑.
interface NaverLatLng {
  lat: number;
  lng: number;
}
interface NaverMapInstance {
  fitBounds(bounds: unknown): void;
}
interface NaverMapsAPI {
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  LatLngBounds: new (sw: NaverLatLng, ne: NaverLatLng) => unknown;
  Map: new (
    el: HTMLElement,
    opts: { center: NaverLatLng; zoom: number; draggable?: boolean; scrollWheel?: boolean },
  ) => NaverMapInstance;
  Marker: new (opts: { position: NaverLatLng; map: unknown }) => unknown;
  Polyline: new (opts: {
    map: unknown;
    path: NaverLatLng[];
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
  }) => unknown;
}
declare global {
  interface Window {
    naver?: { maps?: NaverMapsAPI };
  }
}

/**
 * 좌표별로 지도를 실제로 그리고 있는 인스턴스 수.
 *
 * 왜 필요한가: `md:hidden`은 CSS라 모바일·데스크톱 트리가 **둘 다 마운트**된다.
 * 상세 페이지는 VenueMap을 두 번 놓으므로, 막지 않으면 조회 1회에 NAVER `maps.Map`
 * 인스턴스 2개 + 폴링 루프 2개 + Polyline 2개가 만들어진다(화면에 보이는 건 하나뿐인데).
 * 먼저 마운트된 쪽만 실제 지도를 그리고, 나머지는 딥링크 폴백 UI를 유지한다.
 *
 * 언마운트 때 반드시 반납한다 — 반납하지 않으면 다른 활동으로 이동했다가 돌아왔을 때
 * "이미 누가 그리는 중"으로 오판해 지도가 영영 안 뜬다.
 */
const activeMapKeys = new Map<string, number>();

/**
 * memo인 이유: 상세 페이지가 `savedIds`를 구독해 북마크마다 리렌더되는데, 지도는 저장
 * 여부와 무관하다. 다만 `routePoints`는 useTrailRoute가 매번 새 배열을 주므로 얕은 비교로는
 * 못 막는다 — 호출부에서 배열을 메모하거나(권장), 내용이 같으면 아래 커스텀 비교가 걸러낸다.
 */
interface VenueMapProps {
  lat?: number | null;
  lng?: number | null;
  /** 마커/딥링크 라벨 (활동 제목) */
  title: string;
  /** 장소명(있으면 딥링크 검색어로 사용, 없으면 title) */
  placeName?: string;
  /**
   * 걷기길 코스 경로 [[lat, lng], ...]. 주어지면 선을 그리고 전체가 보이게 맞춘다.
   * 없으면 기존 단일 마커 동작 그대로 — 다른 호출부는 영향 없음.
   */
  routePoints?: [number, number][];
}

export const VenueMap = memo(function VenueMap({
  lat,
  lng,
  title,
  placeName,
  routePoints,
}: VenueMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  /**
   * 경로를 **값**으로 요약한 키. `routePoints` 배열을 그대로 deps에 넣으면
   * useTrailRoute가 매 렌더 새 배열을 주는 순간 지도를 통째로 다시 만든다.
   * 좌표가 실제로 달라졌을 때만 문자열이 바뀐다(memo 비교와 같은 함수를 쓴다).
   */
  const routeKey = routeSignature(routePoints);
  // 최신 경로는 ref로 읽는다(위 키가 같으면 내용도 같다 — 재생성 트리거는 키만).
  const routeRef = useRef(routePoints);
  routeRef.current = routePoints;

  useEffect(() => {
    if (!hasCoords || !ref.current) return;
    // 같은 좌표를 이미 다른 인스턴스가 그리고 있으면(모바일/데스크톱 이중 마운트)
    // 이쪽은 지도를 만들지 않는다 — 폴백 UI를 그대로 둔다.
    const key = `${lat},${lng}`;
    const holders = activeMapKeys.get(key) ?? 0;
    activeMapKeys.set(key, holders + 1);
    const isOwner = holders === 0;

    // SDK가 아직/영영 없으면 폴백 UI 유지. afterInteractive 로드라 마운트 시점엔 없을 수 있어
    // 짧게 폴링해 준비되면 1회 그린다.
    let cancelled = false;
    let tries = 0;

    const draw = () => {
      if (cancelled) return;
      const maps = window.naver?.maps;
      if (!maps) {
        if (tries++ < 20) {
          setTimeout(draw, 150);
        }
        return;
      }
      const route = routeRef.current;
      const center = new maps.LatLng(lat as number, lng as number);
      const map = new maps.Map(ref.current!, {
        center,
        zoom: 15,
        draggable: false,
        scrollWheel: false,
      });
      new maps.Marker({ position: center, map });

      // 코스 경로가 있으면 선을 긋고 전체가 화면에 들어오게 맞춘다(시점 마커는 그대로 유지).
      if (route && route.length >= 2) {
        const path = route.map(([la, ln]) => new maps.LatLng(la, ln));
        new maps.Polyline({
          map,
          path,
          // SDK가 CSS 변수를 못 읽어 토큰 값을 직접 넘긴다(하드코딩 아님 — @motungi/tokens 출처).
          strokeColor: color.brand.primary,
          strokeWeight: 4,
          strokeOpacity: 0.85,
        });
        const lats = route.map((p) => p[0]);
        const lngs = route.map((p) => p[1]);
        map.fitBounds(
          new maps.LatLngBounds(
            new maps.LatLng(Math.min(...lats), Math.min(...lngs)),
            new maps.LatLng(Math.max(...lats), Math.max(...lngs)),
          ),
        );
      }
      setRendered(true);
    };

    // 소유자만 그린다. 나머지 인스턴스는 폴백 UI(딥링크)를 그대로 보여준다.
    if (isOwner) draw();
    return () => {
      cancelled = true;
      const n = (activeMapKeys.get(key) ?? 1) - 1;
      if (n <= 0) activeMapKeys.delete(key);
      else activeMapKeys.set(key, n);
    };
  }, [hasCoords, lat, lng, routeKey]);

  if (!hasCoords) return null;

  // 딥링크 — 키 없이도 열린다. 장소명 검색이 좌표 파라미터보다 스킴 변경에 안정적이다.
  const query = encodeURIComponent(placeName || title);
  const naverMapUrl = `https://map.naver.com/p/search/${query}`;

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
      <div className="relative">
        {/* 실제 지도가 들어갈 컨테이너 (SDK 준비 시 채워짐) */}
        <div ref={ref} className="h-[180px] w-full bg-bg" aria-hidden={!rendered} />
        {/* 지도가 아직/영영 안 그려졌을 때의 폴백 오버레이 */}
        {!rendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg text-center">
            <LocationIcon size={24} className="text-primary" />
            <p className="text-[13px] font-semibold text-label">{placeName || title}</p>
            <p className="text-[12px] text-muted">지도를 준비 중이에요</p>
          </div>
        )}
      </div>
      <a
        href={naverMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 border-t border-line-alt px-4 py-3 text-[13px] font-semibold text-label hover:bg-bg"
      >
        네이버 지도에서 열기
        <ExternalLinkIcon size={15} />
      </a>
    </div>
  );
}, sameVenue);

/**
 * 커스텀 비교 — routePoints는 내용이 같아도 매 렌더 새 배열로 온다(useTrailRoute).
 * 기본 얕은 비교로는 그 하나 때문에 memo가 매번 뚫리므로 경로만 값으로 비교한다.
 */
function sameVenue(
  a: Readonly<VenueMapProps>,
  b: Readonly<VenueMapProps>,
): boolean {
  return (
    a.lat === b.lat &&
    a.lng === b.lng &&
    a.title === b.title &&
    a.placeName === b.placeName &&
    routeSignature(a.routePoints) === routeSignature(b.routePoints)
  );
}

/** 경로를 값으로 요약 — 길이 + 양 끝점이면 실질적으로 충분하다(같은 코스는 같은 문자열). */
function routeSignature(r: [number, number][] | undefined): string {
  if (!r?.length) return "";
  return `${r.length}:${r[0]?.join(",")}:${r[r.length - 1]?.join(",")}`;
}
