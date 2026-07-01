"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LocationIcon,
  SearchIcon,
} from "@/components/icons";
import { Button, Chip, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";

const NEIGHBORHOODS = ["망원동", "성수동", "연남동", "판교동", "합정동"];

/** A2 · 위치 / 동네 설정 */
export default function LocationPage() {
  const [selected, setSelected] = useState("망원동");

  return (
    <MobileScreen>
      <div className="flex flex-1 flex-col bg-bg">
        <SafeTop />

        <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4">
          <Link href="/onboarding" className="tap-safe -ml-2 flex w-11 items-center text-ink">
            <ChevronLeftIcon size={24} />
          </Link>

          <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
            어느 동네 기준으로
            <br />
            찾아드릴까요?
          </h1>
          <p className="mt-2 text-[15px] text-muted">설정한 동네가 추천의 기준이 돼요.</p>

          {/* 현재 위치로 찾기 */}
          <button className="mt-6 flex items-center gap-3 rounded-xl bg-surface p-4 text-left shadow-card">
            <span className="grid size-11 place-items-center rounded-full bg-tint text-primary">
              <LocationIcon size={22} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold text-ink">현재 위치로 찾기</span>
              <span className="block text-[13px] text-muted">
                위치 권한 → 행정동 자동 설정
              </span>
            </span>
            <ChevronRightIcon size={20} className="text-faint" />
          </button>

          {/* 구분선 */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[12px] text-faint">또는 직접 선택</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* 검색 */}
          <div className="flex h-[52px] items-center gap-2 rounded-xl bg-surface px-4 shadow-card">
            <SearchIcon size={20} className="text-faint" />
            <input
              className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
              placeholder="동네 이름 검색 (예: 망원동)"
            />
          </div>

          {/* 최근·인기 동네 */}
          <p className="mb-2.5 mt-5 text-[13px] font-semibold text-label">최근 · 인기 동네</p>
          <div className="flex flex-wrap gap-2">
            {NEIGHBORHOODS.map((n) => (
              <Chip key={n} active={selected === n} onClick={() => setSelected(n)}>
                {selected === n && <LocationIcon size={14} />}
                {n}
              </Chip>
            ))}
          </div>

          {/* 선택 확인 배너 */}
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-tint/60 px-3.5 py-3 text-[14px] text-primary-deep">
            <CheckCircleIcon size={18} className="text-primary" />
            <span>
              서울 마포구 <b>{selected}</b> 선택됨
            </span>
          </div>
        </div>

        {/* 하단 CTA */}
        <div className="shrink-0 px-6 pb-2 pt-2">
          <Link href="/diagnosis" className="block">
            <Button>{selected}으로 시작하기</Button>
          </Link>
        </div>
        <SafeBottom />
      </div>
    </MobileScreen>
  );
}
