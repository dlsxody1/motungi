"use client";

import Link from "next/link";
import { memo } from "react";
import { BookmarkIcon, LocationIcon, RefreshIcon, ShareIcon } from "@/components/icons";
import { DdayPill } from "@/components/opportunity-dday-pill";
import { ReportRelatedCard } from "@/components/report-related-card";
import { Thumbnail } from "@/components/thumbnail";
import { Tag } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import type { MockOpportunity } from "@/data/opportunities";
import { exploreHref } from "@/lib/explore-filters";

/**
 * 동네 리포트 — 데스크톱 트리.
 *
 * 모바일과 마크업을 공유하지 않는 이유는 `report-mobile.tsx` 주석 참고.
 * 여기만 있는 것: 2단 그리드 · 우측 스티키 패널(통계·진단 요약) · 원픽 히어로의 2단 구성.
 */
export const ReportDesktop = memo(function ReportDesktop({
  onePick,
  related,
  listCount,
  dongName,
  displayName,
  userName,
  summaryChips,
  deadline,
  savedCount,
  onePickSaved,
  onShare,
  onToggleSaved,
  onOpenDetail,
}: {
  onePick: MockOpportunity;
  related: MockOpportunity[];
  listCount: number;
  dongName: string;
  displayName: string;
  userName: string | undefined;
  summaryChips: string[];
  deadline: { date: string; dday: number; past: boolean } | null;
  savedCount: number;
  onePickSaved: boolean;
  onShare: () => void;
  onToggleSaved: () => void;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <DesktopShell active="report" dongName={dongName} userName={userName}>
      <WebContainer className="py-9">
        {/* 헤더 */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.02em] text-ink">
              <LocationIcon size={26} className="text-primary" />
              {dongName} 저녁 리포트
            </h1>
            <p className="mt-1.5 text-[15px] text-muted">
              퇴근하고 즐길 거 {listCount}개를 찾았어요 · 최근 갱신
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 rounded-[11px] border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-label hover:border-faint"
            >
              <ShareIcon size={16} /> 공유
            </button>
            <Link
              href="/diagnosis"
              className="flex items-center gap-1.5 rounded-[11px] border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-label hover:border-faint"
            >
              <RefreshIcon size={16} /> 재진단
            </Link>
          </div>
        </div>

        {/* 2단 그리드 */}
        <div className="mt-7 grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_380px]">
          {/* 메인 */}
          <div>
            {/* 원픽 히어로 카드 */}
            <div className="overflow-hidden rounded-[22px] border-[1.5px] border-primary/40 bg-surface shadow-web-pick">
              <Thumbnail
                src={onePick.imageUrl}
                tone={onePick.tone === "mint" ? "mint" : "purple"}
                rounded="rounded-none"
                sizeClass="h-52 w-full"
              />

              <div className="flex flex-col gap-6 p-7 md:flex-row">
                {/* 좌 */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag>{onePick.categoryLabel}</Tag>
                    {deadline && <DdayPill deadline={deadline} />}
                  </div>
                  <h2 className="mt-3 text-[27px] font-extrabold leading-[1.32] tracking-[-0.01em] text-ink">
                    {onePick.title}
                  </h2>
                  <p className="mt-3 flex items-center gap-1.5 text-[14px] text-muted">
                    <LocationIcon size={16} className="shrink-0 text-primary" />
                    {onePick.summary}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    {onePick.meta.map((m) => (
                      <div key={m.label} className="rounded-xl bg-gray-100 px-3 py-3 text-center">
                        <p className="text-[11px] text-muted">{m.label}</p>
                        <p
                          className={`mt-1 text-[15px] font-bold ${m.value === "낮음" ? "text-mint" : "text-ink"}`}
                        >
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 우 참가비 박스 */}
                <div className="w-full shrink-0 md:w-[220px]">
                  {/* 참가비는 채색면이 아니다(2026-08-06). rose 솔리드는 보라 CTA 바로 옆에서
                      두 번째 강한 색면이 되어 시선을 뺏었다 — 게다가 값이 대개 "무료"라
                      강조할 정보도 아니다. 채색은 CTA 하나로 몰고, 참가비는 중립면 위
                      큰 ink 숫자로 세운다. 위계는 색이 아니라 크기·두께로. */}
                  <div className="rounded-2xl bg-gray-100 p-5">
                    <p className="text-[12px] font-semibold text-muted">{onePick.costHeading}</p>
                    <p className="text-[30px] font-extrabold leading-tight text-ink">{onePick.costLabel}</p>
                    {onePick.costNote && <p className="mt-1 text-[12px] text-muted">{onePick.costNote}</p>}
                  </div>
                  <div className="mt-3 flex gap-2.5">
                    <button
                      onClick={onToggleSaved}
                      aria-label={onePickSaved ? "저장 취소" : "저장하기"}
                      aria-pressed={onePickSaved}
                      className="grid h-12 w-13 shrink-0 place-items-center rounded-xl border border-line bg-surface text-label hover:border-faint"
                    >
                      <BookmarkIcon
                        size={20}
                        filled={onePickSaved}
                        className={onePickSaved ? "text-primary" : ""}
                      />
                    </button>
                    <button
                      onClick={() => onOpenDetail(onePick.id)}
                      className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white hover:bg-primary-deep"
                    >
                      자세히 보기
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 함께 보면 좋아요 */}
            <div className="mb-3 mt-7 flex items-center justify-between">
              <p className="text-[16px] font-bold text-ink">함께 보면 좋아요</p>
              <Link
                href={exploreHref(onePick.category)}
                className="text-[14px] font-semibold text-primary underline underline-offset-2 hover:text-primary-deep"
              >
                더 찾아보기 →
              </Link>
            </div>
            <div className="space-y-3">
              {related.map((o) => (
                <ReportRelatedCard key={o.id} o={o} onOpen={onOpenDetail} variant="desktop" />
              ))}
            </div>
          </div>

          {/* 우측 스티키 패널 */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
            {/* 2026-08-06: 그라데이션을 뺐다. 옛 차가운 보라(#6e4e9c)→로즈 그라데이션은
                노을이 아니라 밤/AI퍼플로 읽혔고, 좌측 CTA와 색 관계가 없어 조각이 붕 떴다.
                그라데이션은 랜딩 히어로 한 곳에만 남긴다 — 제품 UI는 솔리드. */}
            <div className="rounded-[20px] bg-primary p-6 text-white">
              {/* ⚠️ 이 카드는 투명도를 2중으로 쌓지 않는다(2026-08-06 AA 수정).
                  예전엔 bg-white/15 타일 위에 text-white/80~85를 얹어 실측 2.5~3.9:1로
                  전부 AA 미달이었다. 원인은 텍스트가 아니라 **타일**이다 — 흰색을 얹어
                  배경을 밝히니 흰 글씨와의 차이가 사라졌다. 타일을 검정으로 어둡게 하고
                  글씨는 흰색 100%로 둔다(최악 조건 primary 끝에서 5.79:1). */}
              <p className="text-[11px] font-bold tracking-[0.08em] text-white">DONGNE REPORT</p>
              <p className="mt-1 text-[18px] font-extrabold">{dongName} 저녁 골라봤어요</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-black/10 px-3.5 py-2.5">
                  <span className="text-[13px] text-white">추천 활동</span>
                  <span className="text-[14px] font-bold">{listCount}개</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/10 px-3.5 py-2.5">
                  <span className="text-[13px] text-white">저장한 활동</span>
                  <span className="text-[14px] font-bold">{savedCount}개</span>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] bg-surface p-5 shadow-web">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold text-ink">{displayName}님 진단 요약</p>
                <Link
                  href="/diagnosis"
                  className="text-[13px] font-semibold text-primary underline underline-offset-2"
                >
                  {summaryChips.length > 0 ? "수정" : "진단하기"}
                </Link>
              </div>
              {summaryChips.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {summaryChips.map((t) => (
                    <span
                      key={t}
                      className="rounded-pill bg-gray-100 px-3 py-1.5 text-[12px] font-semibold text-label"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-muted">60초 진단하면 취향에 맞춰 추천해드려요.</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-[20px] border-[1.5px] border-dashed border-line bg-info-bg px-5 py-4">
              <div>
                <p className="text-[14px] font-bold text-ink">이거 묶어서 하루 코스로?</p>
                <p className="mt-0.5 text-[12px] text-muted">관심사·시간대로 저녁 코스 짜기</p>
              </div>
              <span className="rounded-pill border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted">
                곧 공개
              </span>
            </div>
          </aside>
        </div>
      </WebContainer>
    </DesktopShell>
  );
});
