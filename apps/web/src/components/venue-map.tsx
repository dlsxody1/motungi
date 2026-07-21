"use client";

import { useEffect, useRef, useState } from "react";
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
interface NaverMapsAPI {
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Map: new (
    el: HTMLElement,
    opts: { center: NaverLatLng; zoom: number; draggable?: boolean; scrollWheel?: boolean },
  ) => unknown;
  Marker: new (opts: { position: NaverLatLng; map: unknown }) => unknown;
}
declare global {
  interface Window {
    naver?: { maps?: NaverMapsAPI };
  }
}

export function VenueMap({
  lat,
  lng,
  title,
  placeName,
}: {
  lat?: number | null;
  lng?: number | null;
  /** 마커/딥링크 라벨 (활동 제목) */
  title: string;
  /** 장소명(있으면 딥링크 검색어로 사용, 없으면 title) */
  placeName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    if (!hasCoords || !ref.current) return;
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
      const center = new maps.LatLng(lat as number, lng as number);
      const map = new maps.Map(ref.current!, {
        center,
        zoom: 15,
        draggable: false,
        scrollWheel: false,
      });
      new maps.Marker({ position: center, map });
      setRendered(true);
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [hasCoords, lat, lng]);

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
}
