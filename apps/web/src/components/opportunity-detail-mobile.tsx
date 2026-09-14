"use client";

import { memo } from "react";
import type { MockOpportunity } from "@/data/opportunities";
import { isWeekendOuting } from "@motungi/core";
import { CourseGuide } from "@/components/course-guide";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
  LocationIcon,
  ShareIcon,
} from "@/components/icons";
import { DdayPill } from "@/components/opportunity-dday-pill";
import { OpportunityWhy } from "@/components/opportunity-why";
import { Thumbnail } from "@/components/thumbnail";
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import { VenueMap } from "@/components/venue-map";

/**
 * 상세 본문 — 모바일 트리.
 *
 * 데스크톱과 **마크업을 공유하지 않는다.** 배너 비율(16/9 vs 21/9)·제목 크기·참가비 면
 * 처리(tint 채색 vs 중립)·meta 격자 구성이 전부 달라서, 하나로 합치면 블록마다 삼항이
 * 생겨 분기 수가 그대로 남는다. 공유하는 건 계산된 값(prop)뿐이다 —
 * `components/explore-list.tsx`가 같은 이유로 모바일/데스크톱을 나눈 선례다.
 *
 * memo인 이유: `md:hidden`은 CSS라 두 트리가 **둘 다 마운트**돼 있다. 경계가 없으면
 * 한쪽만 바뀌어야 하는 변화에도 양쪽이 함께 다시 그려진다. 부모는 값이 실제로 바뀔 때만
 * 새 prop을 주고, 콜백(`onBack`·`onShare`·`onToggleSaved`)은 ref로 고정해 넘긴다.
 */
export const OpportunityDetailMobile = memo(function OpportunityDetailMobile({
  o,
  why,
  displayName,
  hasLink,
  deadline,
  saved,
  routePoints,
  onBack,
  onShare,
  onToggleSaved,
}: {
  o: MockOpportunity;
  why: string[];
  displayName: string;
  hasLink: boolean;
  deadline: { date: string; dday: number; past: boolean } | null;
  saved: boolean;
  routePoints: [number, number][] | null;
  onBack: () => void;
  onShare: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <div className="md:hidden">
      <MobileScreen>
        <div className="flex flex-1 flex-col bg-bg">
          <SafeTop />
          <div className="flex items-center justify-between px-5 py-1">
            <button
              onClick={onBack}
              aria-label="뒤로 가기"
              className="tap-safe -ml-2 flex w-11 items-center text-ink"
            >
              <ChevronLeftIcon size={24} />
            </button>
            <button
              onClick={onShare}
              aria-label="공유하기"
              className="tap-safe flex w-11 items-center justify-end text-ink"
            >
              <ShareIcon size={22} />
            </button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
            {/* 대표 이미지 배너 — 없으면 카테고리 톤 플레이스홀더로 폴백 */}
            <Thumbnail
              src={o.imageUrl}
              tone={o.tone}
              rounded="rounded-2xl"
              sizeClass="aspect-[16/9] w-full"
              className="mb-4 shadow-card"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{o.categoryLabel}</Tag>
              {isWeekendOuting(o) && (
                <span className="rounded-md bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-muted">
                  주말 나들이
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[23px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
              {o.title}
            </h1>
            <p className="mt-2 flex items-center gap-1 text-[14px] text-muted">
              <LocationIcon size={16} className="text-primary" />
              {o.location?.dongName ?? "우리 동네"}
            </p>
            {o.summary && <p className="mt-2 text-[14px] leading-relaxed text-label">{o.summary}</p>}

            <div className="mt-4 rounded-xl bg-tint/60 p-4">
              <p className="text-[12px] font-semibold text-primary-deep">{o.costHeading}</p>
              <p className="text-[30px] font-extrabold leading-tight text-primary-deep">
                {o.costLabel} <span className="text-[15px] font-bold text-muted">/ {o.costUnit}</span>
              </p>
              {o.costNote && (
                <>
                  <div className="mt-2 h-px bg-primary/15" />
                  <p className="mt-2 text-[13px] text-muted">{o.costNote}</p>
                </>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {o.meta.map((m) => (
                <div key={m.label} className="rounded-xl bg-surface px-2 py-3 text-center shadow-card">
                  <p className="text-[11px] text-muted">{m.label}</p>
                  <p className="mt-1 text-[15px] font-bold text-ink">{m.value}</p>
                </div>
              ))}
            </div>

            {/* 마감·출처 — row에 있으면 노출 */}
            {(deadline || o.sourceLabel) && (
              <dl className="mt-3 divide-y divide-line-alt rounded-xl bg-surface px-4 shadow-card">
                {deadline && (
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[13px] text-muted">마감</dt>
                    <dd className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                      {deadline.date}
                      <DdayPill deadline={deadline} />
                    </dd>
                  </div>
                )}
                {o.sourceLabel && (
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[13px] text-muted">출처</dt>
                    <dd className="text-[14px] font-semibold text-ink">{o.sourceLabel}</dd>
                  </div>
                )}
              </dl>
            )}

            <CourseGuide opportunity={o} className="mt-5" />

            {o.location?.point && (
              <div className="mt-5">
                <h2 className="mb-2.5 text-[15px] font-bold text-ink">위치</h2>
                <VenueMap
                  lat={o.location.point.lat}
                  lng={o.location.point.lng}
                  title={o.title}
                  placeName={o.summary}
                  routePoints={routePoints ?? undefined}
                />
              </div>
            )}

            <OpportunityWhy reasons={why} displayName={displayName} variant="mobile" />

            <p className="mt-6 rounded-lg border border-line-alt bg-gray-100 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
              보러 가기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를 모아 소개할
              뿐, 예약·주최 당사자가 아니에요.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-2">
            <button
              onClick={onToggleSaved}
              aria-label={saved ? "저장 취소" : "저장하기"}
              aria-pressed={saved}
              className={`tap-safe grid size-[52px] shrink-0 place-items-center rounded-xl border bg-surface ${
                saved ? "border-primary bg-tint text-primary" : "border-line text-label"
              }`}
            >
              <BookmarkIcon size={22} filled={saved} className={saved ? "text-primary" : ""} />
            </button>
            {hasLink ? (
              <a
                href={o.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-safe flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-[16px] font-bold text-white"
              >
                보러 가기
                <ExternalLinkIcon size={18} />
              </a>
            ) : (
              <span className="tap-safe flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-faint text-[16px] font-bold text-white">
                링크 준비 중
              </span>
            )}
          </div>
          <SafeBottom />
        </div>
      </MobileScreen>
    </div>
  );
});
