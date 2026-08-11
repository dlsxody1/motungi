"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  CompassIcon,
  ExternalLinkIcon,
  InfoIcon,
  InsightsIcon,
  LocationIcon,
  ShareIcon,
} from "@/components/icons";
import { ErrorState } from "@/components/error-state";
import { MobileScreen, SafeBottom, SafeTop, Skeleton, Tag } from "@/components/ui";
import { NaverMapSDK } from "@/components/naver-map-sdk";
import { Thumbnail } from "@/components/thumbnail";
import { VenueMap } from "@/components/venue-map";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import {
  CATEGORY_LABEL,
  deadlineLabel,
  displayNameOf,
  isWeekendOuting,
  timeRangeLabel,
} from "@motungi/core";
import { CourseGuide } from "@/components/course-guide";
import type { MockOpportunity } from "@/data/opportunities";
import { useTrailRoute } from "@/hooks/useTrailRoute";
import { useOpportunity } from "@/hooks/useOpportunity";
import { useWhyReasons } from "@/hooks/useWhyReasons";
import { shareContent } from "@/lib/kakao";
import { useAppStore } from "@/store/useAppStore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://motungi.app";

/**
 * A6 · 기회 상세 (본문) — 반응형.
 *
 * id를 **prop으로** 받는다(예전엔 useSearchParams로 직접 읽었다). 정식 경로가
 * `/opportunity/[id]`(서버 컴포넌트)로 바뀌면서, 그 서버 컴포넌트가 이미 아는 id를
 * 그대로 내려주면 되기 때문이다. 이 컴포넌트는 여전히 클라이언트다 —
 * 저장 토글·지도·공유처럼 브라우저가 필요한 기능이 본문 전체에 걸쳐 있다.
 *
 * `initial`은 서버가 이미 조회해둔 1건이다. 있으면 훅이 재조회 없이 즉시 렌더하므로
 * 첫 화면에 스켈레톤이 스치지 않는다(SSR 마크업과 하이드레이션 결과가 같다).
 */
export function OpportunityDetail({
  id,
  initial,
}: {
  id: string | null;
  initial?: MockOpportunity;
}) {
  const router = useRouter();
  // 상세는 카탈로그 전량을 받지 않는다 — id로 1건만(이미 스토어에 있으면 재사용).
  const { opportunity: fetched, status } = useOpportunity(id);
  // 서버가 준 1건이 우선 — 하이드레이션 시점에 훅은 아직 idle이라 비어 있다.
  const o = initial ?? fetched;
  // 걷기길이면 코스 경로를 받아 지도에 선으로 그린다(그 외 소스는 요청하지 않음).
  const routePoints = useTrailRoute(id, o?.source === "trail");

  // savedIds 전체가 아니라 **이 활동의 저장 여부(boolean)** 만 본다.
  // 배열을 구독하면 다른 활동을 저장/취소해도 새 배열이라 이 페이지가 다시 렌더된다.
  const saved = useAppStore((s) => (o ? s.savedIds.includes(o.id) : false));
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const answers = useAppStore((s) => s.answers);
  const anchors = useAppStore((s) => s.anchors);
  const user = useAppStore((s) => s.user);
  const homeDong = useAppStore((s) => s.anchors.home?.dongName);
  // 규칙기반 근거를 즉시 반환하고, 가능하면 LLM 산문으로 교체한다(M-044) — early return보다
  // 앞에서 불러야 하는 훅이라 o가 아직 null(로딩 중)이어도 여기서 호출한다.
  const { reasons: why } = useWhyReasons(o, answers, anchors);

  // memo된 자식(지도·코스안내)이 걸리려면 콜백이 매 렌더 새로 만들어지면 안 된다.
  const toggleRef = useRef(toggleSaved);
  toggleRef.current = toggleSaved;
  const idRef = useRef<string | undefined>(o?.id);
  idRef.current = o?.id;
  const onToggleSaved = useCallback(() => {
    const id = idRef.current;
    if (id) toggleRef.current(id);
  }, []);

  if (!o) {
    // 아직 불러오는 중(idle/loading)이면 "없음"이 아니라 로딩 스피너.
    const loading = status === "idle" || status === "loading";
    const body = loading ? (
      <OpportunityLoading />
    ) : (
      <OpportunityNotFound onExplore={() => router.push("/explore")} />
    );
    return (
      <>
        <div className="md:hidden">
          <MobileScreen>
            <div className="flex flex-1 flex-col bg-bg">
              <SafeTop />
              {body}
              <SafeBottom />
            </div>
          </MobileScreen>
        </div>
        <DesktopShell active="report">
          {/* 스켈레톤은 본문 폭에 맞춰 위에서부터, 상태 화면은 가운데 — 성격이 달라 래퍼를 나눈다. */}
          {loading ? (
            <div className="mx-auto w-full max-w-[720px] px-6 py-9">{body}</div>
          ) : (
            <div className="flex min-h-[60vh] flex-col">{body}</div>
          )}
        </DesktopShell>
      </>
    );
  }

  const displayName = displayNameOf(user);
  const hasLink = !!o.ctaUrl && o.ctaUrl !== "#";

  // 사이드바/헤더 보강 표시값 (row에 있는 데이터를 실제로 노출).
  const today = new Date().toISOString().slice(0, 10);
  const timeText = timeRangeLabel(o.timeWindow);
  const deadline = deadlineLabel(o.deadline, today);

  const onShare = () => {
    void shareContent({
      title: o.title,
      description: "모퉁이에서 발견한 우리 동네 활동",
      url: `${SITE_URL}/opportunity/${o.id}`,
    });
  };

  return (
    <>
      <NaverMapSDK />
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex items-center justify-between px-5 py-1">
              <button
                onClick={() => router.back()}
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
              {o.summary && (
                <p className="mt-2 text-[14px] leading-relaxed text-label">{o.summary}</p>
              )}

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

              {/* 왜 맞을까요 */}
              <div className="mt-5 rounded-xl bg-surface p-4 shadow-card">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <InsightsIcon size={18} className="text-primary" />
                  왜 {displayName}님께 맞을까요?
                </p>
                <ul className="mt-3 space-y-2.5">
                  {why.map((w) => (
                    <li key={w} className="flex items-start gap-2 text-[13px] leading-relaxed text-label">
                      <CheckCircleIcon size={16} className="mt-0.5 shrink-0 text-primary" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-6 rounded-lg border border-line-alt bg-gray-100 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
                보러 가기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를 모아
                소개할 뿐, 예약·주최 당사자가 아니에요.
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

      {/* ── 데스크탑 ── */}
      <DesktopShell active="report" dongName={homeDong} userName={user?.displayName}>
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
              {o.summary && (
                <p className="mt-3 text-[15px] leading-relaxed text-label">{o.summary}</p>
              )}

              {/* 왜 맞을까요 */}
              <div className="mt-6 rounded-[18px] bg-surface p-6 shadow-web">
                <p className="flex items-center gap-2 text-[17px] font-bold text-ink">
                  <InsightsIcon size={20} className="text-primary" />
                  왜 {displayName}님께 맞을까요?
                </p>
                <ul className="mt-4 space-y-3">
                  {why.map((w) => (
                    <li key={w} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-label">
                      <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-primary" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

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
                  보러 가기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를 모아
                  소개할 뿐, 예약·주최 당사자가 아니에요.
                </p>
              </div>
            </div>

            {/* 우측 스티키 액션 */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
              <div className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-web-pick">
                <div
                  className="p-5.5 text-white"
                  style={{
                    background:
                      "linear-gradient(150deg, var(--color-primary), var(--color-primary-deep))",
                  }}
                >
                  <p className="text-[12px] font-semibold text-white">{o.costHeading}</p>
                  <p className="text-[34px] font-extrabold leading-tight">
                    {o.costLabel} <span className="text-[15px] font-bold text-white/90">/ {o.costUnit}</span>
                  </p>
                  {o.costNote && (
                    <p className="mt-1 text-[12px] font-medium text-white/90">{o.costNote}</p>
                  )}
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
              <Link
                href="/explore"
                className="flex items-center gap-3 rounded-2xl bg-mint-tint p-4.5"
              >
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
    </>
  );
}

/**
 * 마감 임박도 배지. D-day에 따라 톤이 달라진다:
 * 지남=회색, 임박(≤3일)=강조, 여유=은은. deadlineLabel 결과를 그대로 받는다.
 */
function DdayPill({ deadline }: { deadline: { dday: number; past: boolean } }) {
  const { dday, past } = deadline;
  const text = past ? "마감" : dday === 0 ? "오늘 마감" : `D-${dday}`;
  const tone = past
    ? "bg-gray-100 text-muted"
    : dday <= 3
      ? "bg-primary text-white"
      : "bg-tint text-primary-deep";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{text}</span>
  );
}

/**
 * 카탈로그를 아직 불러오는 중(카드에서 직접 진입 등)일 때의 로딩 화면.
 *
 * 가운데 스피너에서 스켈레톤으로 바꿨다. 스피너는 "기다려라"만 말하고 화면이 빈 채로 있다가
 * 도착 순간 전체가 튀어나온다. 상세는 골격(배너 → 태그 → 제목 → 위치 → 본문 → CTA)이
 * 고정이라 미리 깔아둘 수 있고, 그러면 내용만 채워진다.
 */
function OpportunityLoading() {
  return (
    <div className="flex flex-1 flex-col px-5 pb-4 md:px-0" aria-live="polite" aria-busy="true">
      <span className="sr-only">활동을 불러오는 중</span>
      <Skeleton className="mb-4 aspect-[16/9] w-full rounded-2xl" />
      <Skeleton className="h-[22px] w-24" />
      <Skeleton className="mt-3 h-7 w-[90%]" />
      <Skeleton className="mt-2 h-7 w-2/3" />
      <Skeleton className="mt-3 h-4 w-32" />
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-[88%]" />
      <Skeleton className="mt-2 h-3.5 w-3/5" />
      <Skeleton className="mt-6 h-[52px] w-full rounded-xl" />
    </div>
  );
}

/** 활동을 찾을 수 없을 때(카탈로그 비었거나 id 불일치)의 상태 화면. */
function OpportunityNotFound({ onExplore }: { onExplore: () => void }) {
  return (
    <ErrorState
      title="활동을 찾을 수 없어요"
      desc="이 활동이 사라졌거나 아직 불러오지 못했어요. 탐색에서 다른 활동을 둘러보세요."
      action={{ label: "탐색 둘러보기", onClick: onExplore }}
    />
  );
}
