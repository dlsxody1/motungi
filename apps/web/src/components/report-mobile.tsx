"use client";

import Link from "next/link";
import { memo } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronLeftIcon, LocationIcon, RefreshIcon } from "@/components/icons";
import { DdayPill } from "@/components/opportunity-dday-pill";
import { ReportRelatedCard } from "@/components/report-related-card";
import { Thumbnail } from "@/components/thumbnail";
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import type { MockOpportunity } from "@/data/opportunities";
import { exploreHref } from "@/lib/explore-filters";

/**
 * 동네 리포트 — 모바일 트리.
 *
 * 데스크톱과 **마크업을 공유하지 않는다.** 원픽이 모바일에선 통짜 버튼 카드인데
 * 데스크톱에선 2단(좌 본문 / 우 참가비+액션) 히어로이고, 사이드바(진단 요약·통계 패널)는
 * 데스크톱에만 있다. 합치면 블록마다 삼항이 생겨 분기 수가 그대로 남는다 —
 * `components/opportunity-detail-mobile.tsx`와 같은 판단이다.
 *
 * memo인 이유: `md:hidden`은 CSS라 두 트리가 **둘 다 마운트**된다. 경계가 없으면
 * 데스크톱에만 영향 있는 변화(저장 개수 등)에도 이 트리가 함께 다시 그려진다.
 */
export const ReportMobile = memo(function ReportMobile({
  onePick,
  related,
  listCount,
  dongName,
  deadline,
  onBack,
  onOpenDetail,
}: {
  onePick: MockOpportunity;
  related: MockOpportunity[];
  listCount: number;
  dongName: string;
  deadline: { date: string; dday: number; past: boolean } | null;
  onBack: () => void;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <div className="md:hidden">
      <MobileScreen>
        <div className="flex flex-1 flex-col bg-bg">
          <SafeTop />
          {/* 상단 바 — 뒤로가기 + 화면 제목 */}
          <div className="flex items-center gap-1 px-3 pt-1">
            <button
              onClick={onBack}
              aria-label="뒤로 가기"
              className="tap-safe -ml-1 flex size-11 items-center justify-center text-ink"
            >
              <ChevronLeftIcon size={24} />
            </button>
            <span className="text-[16px] font-bold text-ink">동네 리포트</span>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
            <div className="flex items-start justify-between pt-1">
              <div>
                <p className="flex items-center gap-1 text-[18px] font-extrabold text-ink">
                  <LocationIcon size={18} className="text-primary" />
                  {dongName} 기준
                </p>
                <p className="mt-0.5 text-[13px] text-muted">퇴근하고 즐길 거 {listCount}개 골랐어요</p>
              </div>
              <Link
                href="/diagnosis"
                className="flex h-9 items-center gap-1 rounded-pill border border-line bg-surface px-3 text-[13px] font-semibold text-label"
              >
                <RefreshIcon size={15} />
                재진단
              </Link>
            </div>

            <p className="mb-2.5 mt-5 text-[14px] font-bold text-primary">오늘의 원픽</p>

            <button
              onClick={() => onOpenDetail(onePick.id)}
              className="block w-full overflow-hidden rounded-2xl bg-surface text-left shadow-card ring-1 ring-primary/25"
            >
              {/* 이미지가 없어도 Thumbnail이 카테고리 톤 플레이스홀더로 채운다(레이아웃 붕괴 방지). */}
              <Thumbnail
                src={onePick.imageUrl}
                tone={onePick.tone === "mint" ? "mint" : "purple"}
                rounded="rounded-none"
                sizeClass="h-40 w-full"
              />
              <div className="bg-tint/50 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag>{onePick.categoryLabel}</Tag>
                  {deadline && <DdayPill deadline={deadline} />}
                </div>
                <h2 className="mt-3 text-[21px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
                  {onePick.title}
                </h2>
                <p className="mt-2.5 flex items-center gap-1.5 text-[14px] text-label">
                  <LocationIcon size={15} className="shrink-0 text-primary" />
                  {onePick.summary}
                </p>
                <div className="mt-4 flex items-end justify-between rounded-xl bg-tint px-4 py-3">
                  <div>
                    <p className="text-[12px] font-semibold text-primary-deep">{onePick.costHeading}</p>
                    <p className="text-[26px] font-extrabold leading-none text-primary-deep">
                      {onePick.costLabel}
                    </p>
                  </div>
                  {onePick.costNote && (
                    <p className="text-right text-[12px] leading-tight text-muted">{onePick.costNote}</p>
                  )}
                </div>
              </div>
              <div className="px-5 pb-5">
                <span className="tap-safe flex h-[50px] w-full items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white">
                  자세히 보기
                </span>
              </div>
            </button>

            {related.length > 0 && (
              <div className="mb-1 mt-6 flex items-center justify-between">
                <p className="text-[14px] font-semibold text-label">함께 보면 좋아요</p>
                <Link
                  href={exploreHref(onePick.category)}
                  /* 밑줄은 장식이 아니라 접근성 요건 — 색약에서 링크색과 본문색이
                     명도로 붕괴해 가까워지므로 색 외 단서가 반드시 필요하다(화살표+밑줄). */
                  className="text-[13px] font-semibold text-primary underline underline-offset-2 hover:text-primary-deep"
                >
                  더 찾아보기 →
                </Link>
              </div>
            )}
            <div className="divide-y divide-line-alt">
              {related.map((o) => (
                <ReportRelatedCard key={o.id} o={o} onOpen={onOpenDetail} variant="mobile" />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-line-alt bg-gray-100 px-4 py-3.5">
              <div>
                <p className="text-[14px] font-bold text-ink">이거 묶어서 하루 코스로?</p>
                <p className="text-[12px] text-muted">관심사·시간대로 저녁 코스 짜기</p>
              </div>
              <span className="rounded-pill border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted">
                곧 공개
              </span>
            </div>
          </div>
          <BottomNav active="home" />
          <SafeBottom />
        </div>
      </MobileScreen>
    </div>
  );
});
