"use client";

import Link from "next/link";
import { memo } from "react";
import { CATEGORY_LABEL, isWeekendOuting } from "@motungi/core";
import type { MockOpportunity } from "@/data/opportunities";
import { CourseGuide } from "@/components/course-guide";
import {
  BookmarkIcon,
  ChevronRightIcon,
  CompassIcon,
  ExternalLinkIcon,
  InfoIcon,
  LocationIcon,
  ShareIcon,
} from "@/components/icons";
import { DdayPill } from "@/components/opportunity-dday-pill";
import { OpportunityWhy } from "@/components/opportunity-why";
import { Thumbnail } from "@/components/thumbnail";
import { Tag } from "@/components/ui";
import { VenueMap } from "@/components/venue-map";
import { DesktopShell, WebContainer } from "@/components/web-shell";

/**
 * 상세 본문 — 데스크톱 트리.
 *
 * 모바일과 **마크업을 공유하지 않는다.** 왜 그런지는 `opportunity-detail-mobile.tsx`의
 * 주석 참고. 여기만 있는 것: 브레드크럼 · 우측 스티키 사이드바 · 크로스셀 링크 ·
 * `timeText` 노출. memo 경계인 이유도 같다 — `md:hidden`은 CSS라 두 트리가 동시에
 * 마운트되므로 경계가 없으면 모바일 쪽 변화가 이 트리까지 끌고 온다.
 */
export const OpportunityDetailDesktop = memo(function OpportunityDetailDesktop({
  o,
  why,
  displayName,
  hasLink,
  deadline,
  timeText,
  saved,
  routePoints,
  homeDong,
  userName,
  onShare,
  onToggleSaved,
}: {
  o: MockOpportunity;
  why: string[];
  displayName: string;
  hasLink: boolean;
  deadline: { date: string; dday: number; past: boolean } | null;
  timeText: string | null;
  saved: boolean;
  routePoints: [number, number][] | null;
  homeDong: string | undefined;
  userName: string | undefined;
  onShare: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <DesktopShell active="report" dongName={homeDong} userName={userName}>
      <WebContainer className="pb-13 pt-7">
        {/* 브레드크럼 */}
        <nav className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <Link href="/explore" className="hover:text-ink">
            탐색
          </Link>
          <ChevronRightIcon size={14} className="text-[#c9bcab]" />
          <span>{CATEGORY_LABEL[o.category]}</span>
          <ChevronRightIcon size={14} className="text-[#c9bcab]" />
          <span className="text-label line-clamp-1">{o.title}</span>
        </nav>

        {/* 2단 */}
        <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_372px]">
          {/* 메인 */}
          <div>
            {/* 대표 이미지 배너 — 없으면 카테고리 톤 플레이스홀더 */}
            <Thumbnail
              src={o.imageUrl}
              tone={o.tone}
              rounded="rounded-[20px]"
              sizeClass="aspect-[21/9] w-full"
              className="mb-6 shadow-web"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{o.categoryLabel}</Tag>
              {isWeekendOuting(o) && (
                <span className="rounded-md bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-muted">
                  주말 나들이
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[34px] font-extrabold leading-[1.28] tracking-[-0.03em] text-ink">
              {o.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px]">
              <span className="flex items-center gap-1 text-muted">
                <LocationIcon size={16} className="text-primary" />
                {o.location?.dongName ?? "우리 동네"}
              </span>
              {timeText && <span className="text-muted">{timeText}</span>}
              {o.sourceLabel && <span className="text-muted">{o.sourceLabel}</span>}
            </div>
            {o.summary && <p className="mt-3 text-[15px] leading-relaxed text-label">{o.summary}</p>}

            <OpportunityWhy reasons={why} displayName={displayName} variant="desktop" />

            <CourseGuide opportunity={o} className="mt-8" />

            {o.location?.point && (
              <>
                <h2 className="mb-3 mt-8 text-[19px] font-bold text-ink">위치</h2>
                <div className="mb-6">
                  <VenueMap
                    lat={o.location.point.lat}
                    lng={o.location.point.lng}
                    title={o.title}
                    placeName={o.summary}
                    routePoints={routePoints ?? undefined}
                  />
                </div>
              </>
            )}

            <div className="flex items-start gap-2.5 rounded-xl bg-info-bg px-4.5 py-4">
              <InfoIcon size={18} className="mt-0.5 shrink-0 text-muted" />
              <p className="text-[13px] leading-relaxed text-muted">
                보러 가기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를 모아 소개할
                뿐, 예약·주최 당사자가 아니에요.
              </p>
            </div>
          </div>

          {/* 우측 스티키 액션 */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
            <div className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-web-pick">
              {/* 참가비는 채색면이 아니다(2026-08-06) — report/page.tsx와 같은 이유.
                  채색은 아래 CTA 하나만. 위계는 색이 아니라 크기·두께로. */}
              <div className="border-b border-line bg-gray-100 p-5.5">
                <p className="text-[12px] font-semibold text-muted">{o.costHeading}</p>
                <p className="text-[34px] font-extrabold leading-tight text-ink">
                  {o.costLabel} <span className="text-[15px] font-bold text-muted">/ {o.costUnit}</span>
                </p>
                {o.costNote && <p className="mt-1 text-[12px] font-medium text-muted">{o.costNote}</p>}
              </div>
              <div className="p-5">
                <div
                  className={`grid divide-x divide-line-alt ${
                    o.meta.length >= 3 ? "grid-cols-3" : o.meta.length === 2 ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {o.meta.map((m) => (
                    <div key={m.label} className="px-2 text-center">
                      <p className="text-[11px] text-muted">{m.label}</p>
                      <p
                        className={`mt-1 text-[14px] font-bold ${
                          m.value === "낮음" ? "text-mint" : "text-ink"
                        }`}
                      >
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 마감·출처 팩트 — 사이드바가 허전하지 않도록 row 데이터를 노출 */}
                {(deadline || o.sourceLabel) && (
                  <dl className="mt-4 space-y-2.5 rounded-xl border border-line-alt bg-gray-100 px-4 py-3.5">
                    {deadline && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted">마감</dt>
                        <dd className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                          {deadline.date}
                          <DdayPill deadline={deadline} />
                        </dd>
                      </div>
                    )}
                    {o.sourceLabel && (
                      <div className="flex items-center justify-between">
                        <dt className="text-[13px] text-muted">출처</dt>
                        <dd className="text-[14px] font-semibold text-ink">{o.sourceLabel}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {hasLink ? (
                  <a
                    href={o.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex h-[52px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[16px] font-bold text-white transition-colors hover:bg-primary-deep"
                  >
                    보러 가기 <ExternalLinkIcon size={18} />
                  </a>
                ) : (
                  <span className="mt-4 flex h-[52px] w-full items-center justify-center gap-1.5 rounded-xl bg-faint text-[16px] font-bold text-white">
                    링크 준비 중
                  </span>
                )}
                <div className="mt-2.5 flex gap-2.5">
                  <button
                    onClick={onToggleSaved}
                    aria-pressed={saved}
                    className={`flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border bg-surface text-[14px] font-semibold hover:border-faint ${
                      saved ? "border-primary text-primary" : "border-line text-label"
                    }`}
                  >
                    <BookmarkIcon size={18} filled={saved} className={saved ? "text-primary" : ""} />{" "}
                    {saved ? "저장됨" : "저장"}
                  </button>
                  <button
                    onClick={onShare}
                    className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-[14px] font-semibold text-label hover:border-faint"
                  >
                    <ShareIcon size={18} /> 공유
                  </button>
                </div>
                <p className="mt-3 text-center text-[12px] text-muted">
                  저장하면 마감·유사 기회를 알려드려요
                </p>
              </div>
            </div>

            {/* 크로스셀 — 탐색으로 */}
            <Link href="/explore" className="flex items-center gap-3 rounded-2xl bg-mint-tint p-4.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-mint">
                <CompassIcon size={22} />
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-mint">이어서 하기 좋아요</p>
                <p className="text-[14px] font-bold text-ink">우리 동네 다른 활동 더 보기</p>
              </div>
              <ChevronRightIcon size={20} className="text-mint" />
            </Link>
          </aside>
        </div>
      </WebContainer>
    </DesktopShell>
  );
});
