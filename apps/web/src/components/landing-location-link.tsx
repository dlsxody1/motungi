"use client";

/**
 * 랜딩 히어로의 위치 검색 필드 — 실제 앵커 동네를 보여준다.
 *
 * WebLanding은 서버 컴포넌트라 store를 읽을 수 없어서 이 조각만 분리했다.
 * 앵커가 없으면(첫 방문) 기본 동네를 그대로 보여주므로 기존 카피와 동일하다.
 */
import Link from "next/link";
import { DEFAULT_NEIGHBORHOOD } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { ArrowMiniIcon, SearchMiniIcon } from "./landing-icons";

export function LandingLocationLink() {
  const home = useAppStore((s) => s.anchors.home);
  const dongName = home?.dongName ?? DEFAULT_NEIGHBORHOOD.dongName;
  const region = home?.region ?? DEFAULT_NEIGHBORHOOD.region;

  return (
    <Link
      href="/location"
      id="loc-search"
      className="group flex items-center gap-3 rounded-2xl bg-surface p-[9px] pl-4 shadow-[0_18px_40px_rgba(40,20,10,0.22)] transition-shadow hover:shadow-[0_22px_48px_rgba(40,20,10,0.28)]"
    >
      <SearchMiniIcon size={20} className="shrink-0 text-primary" />
      <span className="flex-1 text-[16px] font-semibold text-ink">
        {dongName}
        {region && <span className="text-[14px] font-medium text-muted"> · {region}</span>}
      </span>
      <span className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-[11px] bg-primary px-[26px] text-[16px] font-bold text-white transition-[background-color,transform] group-hover:bg-primary-deep group-active:scale-[0.98]">
        찾기
        <ArrowMiniIcon size={18} />
      </span>
    </Link>
  );
}
