"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ErrorState } from "@/components/error-state";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  LocationIcon,
  RefreshIcon,
  ShareIcon,
} from "@/components/icons";
import { ReportRelatedCard } from "@/components/report-related-card";
import { ReportSkeleton } from "@/components/report-skeleton";
import { Thumbnail } from "@/components/thumbnail";
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { diagnosisSummaryChips, displayNameOf } from "@motungi/core";
import { useReportFallback } from "@/hooks/useReportFallback";
import { exploreHref } from "@/lib/explore-filters";
import { shareContent } from "@/lib/kakao";
import { useAppStore } from "@/store/useAppStore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://motungi.app";

/** ISO 마감일 → "~11/28까지" 라벨. 파싱 실패 시 null(칩 숨김). */
function formatDeadline(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `~${d.getMonth() + 1}/${d.getDate()}까지`;
}

/** A5 · 동네 리포트 (원픽 히어로) — 반응형 */
export default function ReportPage() {
  // 정상 경로에선 results가 이미 차 있어 조회 없음. 직접 진입 시에만 6건 fallback.
  const { items: fallbackItems, status: catalogStatus } = useReportFallback();
  const router = useRouter();
  const results = useAppStore((s) => s.results);
  const answers = useAppStore((s) => s.answers);
  const user = useAppStore((s) => s.user);
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";

  /**
   * memo된 카드가 실제로 걸리려면 이 콜백이 영원히 같은 참조여야 한다.
   * `useCallback([router])`로 두면 useRouter()가 새 객체를 주는 순간 콜백이 새로
   * 만들어지고, 그 하나 때문에 관련 카드 전체의 memo가 무너진다(explore에서 실측).
   * 훅이므로 아래 early return보다 위에 있어야 한다.
   */
  const routerRef = useRef(router);
  routerRef.current = router;
  const openDetail = useCallback((id: string) => routerRef.current.push(`/opportunity/${id}`), []);

  // 스코어링 결과 우선, 없으면 fallback 6건(진단 전 직접 진입). 원픽1 + 함께 최대5.
  const list = results.length > 0 ? results : fallbackItems;
  const onePick = list[0];

  // 데이터가 없으면 원픽을 그릴 수 없다. 다만 "아직 안 불러옴"과 "없음"은 다른 사실이다 —
  // idle(=fallback 조회 중)에 "추천할 활동이 없어요"를 띄우는 건 거짓말이었다.
  const isError = catalogStatus === "error" || catalogStatus === "unconfigured";
  if (!onePick) {
    if (catalogStatus === "idle") return <ReportSkeleton dongName={dongName} />;
    return (
      <ReportEmpty
        status={catalogStatus}
        onRetry={() => router.push(isError ? "/loading" : "/diagnosis")}
        onExplore={() => router.push("/explore")}
      />
    );
  }

  const related = list.slice(1);
  const displayName = displayNameOf(user);
  const summaryChips = diagnosisSummaryChips(answers, onePick);
  const onePickSaved = savedIds.includes(onePick.id);
  const deadlineLabel = onePick.deadline ? formatDeadline(onePick.deadline) : null;

  const onShare = () => {
    void shareContent({
      title: onePick.title,
      description: "모퉁이에서 발견한 우리 동네 활동",
      url: `${SITE_URL}/opportunity/${onePick.id}`,
    });
  };

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            {/* 상단 바 — 뒤로가기 + 화면 제목 */}
            <div className="flex items-center gap-1 px-3 pt-1">
              <button
                onClick={() => router.back()}
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
                  <p className="mt-0.5 text-[13px] text-muted">퇴근하고 즐길 거 {list.length}개 골랐어요</p>
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
                onClick={() => openDetail(onePick.id)}
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
                    {deadlineLabel && (
                      <span className="rounded-md bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-muted">
                        {deadlineLabel}
                      </span>
                    )}
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
                      <p className="text-right text-[12px] leading-tight text-muted">
                        {onePick.costNote}
                      </p>
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
                    className="text-[13px] font-semibold text-primary hover:text-primary-deep"
                  >
                    더 찾아보기 →
                  </Link>
                </div>
              )}
              <div className="divide-y divide-line-alt">
                {related.map((o) => (
                  <ReportRelatedCard key={o.id} o={o} onOpen={openDetail} variant="mobile" />
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

      {/* ── 데스크탑 ── */}
      <DesktopShell active="report" dongName={dongName} userName={user?.displayName}>
        <WebContainer className="py-9">
          {/* 헤더 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.02em] text-ink">
                <LocationIcon size={26} className="text-primary" />
                {dongName} 저녁 리포트
              </h1>
              <p className="mt-1.5 text-[15px] text-muted">
                퇴근하고 즐길 거 {list.length}개를 찾았어요 · 최근 갱신
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
                      {deadlineLabel && (
                        <span className="rounded-md bg-info-bg px-2 py-1 text-[12px] font-semibold text-muted">
                          {deadlineLabel}
                        </span>
                      )}
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
                          <p className={`mt-1 text-[15px] font-bold ${m.value === "낮음" ? "text-mint" : "text-ink"}`}>
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 우 참가비 박스 */}
                  <div className="w-full shrink-0 md:w-[220px]">
                    <div
                      className="rounded-2xl p-5 text-white"
                      style={{
                        background:
                          "linear-gradient(150deg, var(--color-primary), var(--color-primary-deep))",
                      }}
                    >
                      {/* 흰 텍스트에 투명도를 주지 않는다 — primary 위 white/80은 3.59:1로 AA 미달.
                          100%면 4.88:1로 통과한다. 위계는 투명도가 아니라 크기·두께로. */}
                      <p className="text-[12px] font-semibold text-white">{onePick.costHeading}</p>
                      <p className="text-[30px] font-extrabold leading-tight">{onePick.costLabel}</p>
                      {onePick.costNote && (
                        <p className="mt-1 text-[12px] text-white">{onePick.costNote}</p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2.5">
                      <button
                        onClick={() => toggleSaved(onePick.id)}
                        aria-label={onePickSaved ? "저장 취소" : "저장하기"}
                        aria-pressed={onePickSaved}
                        className="grid h-12 w-13 shrink-0 place-items-center rounded-xl border border-line bg-surface text-label hover:border-faint"
                      >
                        <BookmarkIcon size={20} filled={onePickSaved} className={onePickSaved ? "text-primary" : ""} />
                      </button>
                      <button
                        onClick={() => openDetail(onePick.id)}
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
                  className="text-[14px] font-semibold text-primary hover:text-primary-deep"
                >
                  더 찾아보기 →
                </Link>
              </div>
              <div className="space-y-3">
                {related.map((o) => (
                  <ReportRelatedCard key={o.id} o={o} onOpen={openDetail} variant="desktop" />
                ))}
              </div>
            </div>

            {/* 우측 스티키 패널 */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
              <div
                className="rounded-[20px] p-6 text-white"
                style={{
                  background:
                    "linear-gradient(150deg, var(--color-purple), var(--color-primary) 118%)",
                }}
              >
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
                    <span className="text-[14px] font-bold">{list.length}개</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-black/10 px-3.5 py-2.5">
                    <span className="text-[13px] text-white">저장한 활동</span>
                    <span className="text-[14px] font-bold">{savedIds.length}개</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] bg-surface p-5 shadow-web">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold text-ink">{displayName}님 진단 요약</p>
                  <Link href="/diagnosis" className="text-[13px] font-semibold text-primary">
                    {summaryChips.length > 0 ? "수정" : "진단하기"}
                  </Link>
                </div>
                {summaryChips.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summaryChips.map((t) => (
                      <span key={t} className="rounded-pill bg-gray-100 px-3 py-1.5 text-[12px] font-semibold text-label">
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
    </>
  );
}

/** 카탈로그가 비었을 때(로드 실패·빈결과·미진단)의 리포트 상태 화면. */
function ReportEmpty({
  status,
  onRetry,
  onExplore,
}: {
  status: string;
  onRetry: () => void;
  onExplore: () => void;
}) {
  const isError = status === "error" || status === "unconfigured";
  const title = isError ? "활동을 불러오지 못했어요" : "아직 추천할 활동이 없어요";
  const desc = isError
    ? "잠시 후 다시 시도하거나, 60초 진단으로 원픽을 받아보세요."
    : "60초 진단을 하면 우리 동네 원픽을 골라드려요.";

  const Body = (
    <ErrorState
      // 빈 결과는 경보가 아니다 — 실패일 때만 스크린리더에 즉시 알린다.
      alert={isError}
      title={title}
      desc={desc}
      action={{ label: isError ? "다시 시도" : "60초 진단하기", onClick: onRetry }}
      secondary={{ label: "탐색 둘러보기", onClick: onExplore }}
    />
  );

  return (
    <>
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            {Body}
            <SafeBottom />
            <BottomNav active="home" />
          </div>
        </MobileScreen>
      </div>
      <DesktopShell active="report">
        <div className="flex min-h-[60vh] flex-col">{Body}</div>
      </DesktopShell>
    </>
  );
}
