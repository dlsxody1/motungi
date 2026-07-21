"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import { NaverMapSDK } from "@/components/naver-map-sdk";
import { VenueMap } from "@/components/venue-map";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { CATEGORY_LABEL, displayNameOf, whyReasons } from "@motungi/core";
import { useEnsureCatalog } from "@/hooks/useEnsureCatalog";
import { shareContent } from "@/lib/kakao";
import { useAppStore } from "@/store/useAppStore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://motungi.app";

/** A6 · 기회 상세 — 반응형. useSearchParams는 Suspense 경계 필요. */
export default function OpportunityPage() {
  return (
    <Suspense fallback={null}>
      <OpportunityInner />
    </Suspense>
  );
}

function OpportunityInner() {
  useEnsureCatalog();
  const router = useRouter();
  const id = useSearchParams().get("id");
  const catalog = useAppStore((s) => s.catalog);
  // 요청 id 우선, 없으면 카탈로그 첫 항목. 카탈로그 자체가 비면 not-found.
  const o = catalog.find((x) => x.id === id) ?? catalog[0];

  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const answers = useAppStore((s) => s.answers);
  const user = useAppStore((s) => s.user);
  const homeDong = useAppStore((s) => s.anchors.home?.dongName);

  if (!o) {
    return (
      <>
        <div className="md:hidden">
          <MobileScreen>
            <div className="flex flex-1 flex-col bg-bg">
              <SafeTop />
              <OpportunityNotFound onExplore={() => router.push("/explore")} />
              <SafeBottom />
            </div>
          </MobileScreen>
        </div>
        <DesktopShell active="report">
          <div className="flex min-h-[60vh] flex-col">
            <OpportunityNotFound onExplore={() => router.push("/explore")} />
          </div>
        </DesktopShell>
      </>
    );
  }

  const saved = savedIds.includes(o.id);

  const displayName = displayNameOf(user);
  const why = whyReasons(o, answers);
  const hasLink = !!o.ctaUrl && o.ctaUrl !== "#";

  const onShare = () => {
    void shareContent({
      title: o.title,
      description: "모퉁이에서 발견한 우리 동네 활동",
      url: `${SITE_URL}/opportunity?id=${o.id}`,
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
              <div>
                <Tag>{o.categoryLabel}</Tag>
              </div>
              <h1 className="mt-3 text-[23px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
                {o.title}
              </h1>
              <p className="mt-2 flex items-center gap-1 text-[14px] text-muted">
                <LocationIcon size={16} className="text-primary" />
                {o.location?.dongName ?? "우리 동네"}
              </p>

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

              {o.location?.point && (
                <div className="mt-5">
                  <h2 className="mb-2.5 text-[15px] font-bold text-ink">위치</h2>
                  <VenueMap
                    lat={o.location.point.lat}
                    lng={o.location.point.lng}
                    title={o.title}
                    placeName={o.summary}
                  />
                </div>
              )}

              {o.steps && o.steps.length > 0 && (
                <>
                  <h2 className="mb-3 mt-6 text-[17px] font-bold text-ink">즐기는 방법</h2>
                  <ol className="space-y-4">
                    {o.steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-[14px] leading-relaxed text-label">{s}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <p className="mt-6 rounded-lg bg-surface-alt px-3.5 py-3 text-[12px] leading-relaxed text-muted">
                자세히 보기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를
                모아 소개할 뿐, 예약·주최 당사자가 아니에요.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-2">
              <button
                onClick={() => toggleSaved(o.id)}
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
              <Tag>{o.categoryLabel}</Tag>
              <h1 className="mt-3 text-[34px] font-extrabold leading-[1.28] tracking-[-0.03em] text-ink">
                {o.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px]">
                <span className="flex items-center gap-1 text-muted">
                  <LocationIcon size={16} className="text-primary" />
                  {o.location?.dongName ?? "우리 동네"}
                </span>
              </div>

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

              {/* 즐기는 방법 타임라인 (스텝이 있을 때만) */}
              {o.steps && o.steps.length > 0 && (
                <>
                  <h2 className="mb-4 mt-8 text-[19px] font-bold text-ink">즐기는 방법</h2>
                  <ol className="space-y-0">
                    {o.steps.map((s, i, arr) => (
                      <li key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary text-[13px] font-bold text-white">
                            {i + 1}
                          </span>
                          {i < arr.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
                        </div>
                        <span className="pb-6 pt-1 text-[15px] leading-relaxed text-label">{s}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {o.location?.point && (
                <>
                  <h2 className="mb-3 mt-8 text-[19px] font-bold text-ink">위치</h2>
                  <div className="mb-6">
                    <VenueMap
                      lat={o.location.point.lat}
                      lng={o.location.point.lng}
                      title={o.title}
                      placeName={o.summary}
                    />
                  </div>
                </>
              )}

              <div className="flex items-start gap-2.5 rounded-xl bg-info-bg px-4.5 py-4">
                <InfoIcon size={18} className="mt-0.5 shrink-0 text-muted" />
                <p className="text-[13px] leading-relaxed text-muted">
                  자세히 보기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를
                  모아 소개할 뿐, 예약·주최 당사자가 아니에요.
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
                  <div className="grid grid-cols-3 divide-x divide-line-alt">
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
                      onClick={() => toggleSaved(o.id)}
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

/** 활동을 찾을 수 없을 때(카탈로그 비었거나 id 불일치)의 상태 화면. */
function OpportunityNotFound({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <p className="text-[18px] font-extrabold text-ink md:text-[22px]">활동을 찾을 수 없어요</p>
      <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-muted md:text-[15px]">
        이 활동이 사라졌거나 아직 불러오지 못했어요. 탐색에서 다른 활동을 둘러보세요.
      </p>
      <button
        onClick={onExplore}
        className="mt-6 h-11 rounded-xl bg-primary px-6 text-[14px] font-bold text-white transition-colors hover:bg-primary-deep"
      >
        탐색 둘러보기
      </button>
    </div>
  );
}
