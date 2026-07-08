"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  FireIcon,
  InfoIcon,
  InsightsIcon,
  LocationIcon,
  SavingsIcon,
  ShareIcon,
} from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { CATEGORY_LABEL, displayNameOf, whyReasons } from "@motungi/core";
import { findOpportunity, ONE_PICK } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** A6 · 기회 상세 — 반응형. useSearchParams는 Suspense 경계 필요. */
export default function OpportunityPage() {
  return (
    <Suspense fallback={null}>
      <OpportunityInner />
    </Suspense>
  );
}

function OpportunityInner() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const catalog = useAppStore((s) => s.catalog);
  const o = catalog.find((x) => x.id === id) ?? findOpportunity(id) ?? catalog[0] ?? ONE_PICK;

  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const answers = useAppStore((s) => s.answers);
  const user = useAppStore((s) => s.user);
  const saved = savedIds.includes(o.id);

  const displayName = displayNameOf(user);
  const why = whyReasons(o, answers);
  const hasLink = !!o.ctaUrl && o.ctaUrl !== "#";

  const onShare = () => {
    const shareData = { title: o.title, text: `${o.title}\n모퉁이에서 발견한 우리 동네 활동` };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.text).catch(() => {});
    }
  };

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex items-center justify-between px-5 py-1">
              <button
                onClick={() => router.back()}
                className="tap-safe -ml-2 flex w-11 items-center text-ink"
              >
                <ChevronLeftIcon size={24} />
              </button>
              <button
                onClick={onShare}
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
                <p className="text-[12px] font-semibold text-primary-deep">참가비</p>
                <p className="text-[30px] font-extrabold leading-tight text-primary-deep">
                  {o.costLabel} <span className="text-[15px] font-bold text-muted">/ 1인</span>
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

              <h2 className="mb-3 mt-6 text-[17px] font-bold text-ink">즐기는 방법</h2>
              <ol className="space-y-4">
                {o.steps?.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-[14px] leading-relaxed text-label">{s}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-6 rounded-lg bg-surface-alt px-3.5 py-3 text-[12px] leading-relaxed text-muted">
                자세히 보기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를
                모아 소개할 뿐, 예약·주최 당사자가 아니에요.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-2">
              <button
                onClick={() => toggleSaved(o.id)}
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
      <DesktopShell active="explore">
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
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <FireIcon size={15} /> 매칭 {o.matchScore}%
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

              {/* 즐기는 방법 타임라인 */}
              <h2 className="mb-4 mt-8 text-[19px] font-bold text-ink">즐기는 방법</h2>
              <ol className="space-y-0">
                {o.steps?.map((s, i, arr) => (
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
                  <p className="text-[12px] font-semibold text-white">참가비</p>
                  <p className="text-[34px] font-extrabold leading-tight">
                    {o.costLabel} <span className="text-[15px] font-bold text-white/90">/ 1인</span>
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
                  <SavingsIcon size={22} />
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
