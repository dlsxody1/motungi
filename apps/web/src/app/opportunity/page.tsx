import Link from "next/link";
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
import { ONE_PICK } from "@/data/opportunities";

const WHY = [
  "방전형인 도윤님도 앉아서 즐기기 좋은 가벼운 저녁 공연이에요.",
  "회사에서 도보 15분 · 퇴근길에 잠깐 들르기 딱 좋아요.",
  "예약도 참가비도 없이 그냥 가면 돼요.",
];

/** A6 · 기회 상세 — 반응형 */
export default function OpportunityPage() {
  const o = ONE_PICK;
  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex items-center justify-between px-5 py-1">
              <Link href="/report" className="tap-safe -ml-2 flex w-11 items-center text-ink">
                <ChevronLeftIcon size={24} />
              </Link>
              <button className="tap-safe flex w-11 items-center justify-end text-ink">
                <ShareIcon size={22} />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
              <div>
                <Tag>{o.categoryLabel}</Tag>
              </div>
              <h1 className="mt-3 text-[23px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
                퇴근길 20분, 망원 한강
                <br />
                야간 재즈 소품 공연
              </h1>
              <p className="mt-2 flex items-center gap-1 text-[14px] text-muted">
                <LocationIcon size={16} className="text-primary" />
                망원동 · 회사에서 도보 15분
              </p>

              <div className="mt-4 rounded-xl bg-tint/60 p-4">
                <p className="text-[12px] font-semibold text-primary-deep">참가비</p>
                <p className="text-[30px] font-extrabold leading-tight text-primary-deep">
                  {o.costLabel} <span className="text-[15px] font-bold text-muted">/ 1인</span>
                </p>
                <div className="mt-2 h-px bg-primary/15" />
                <p className="mt-2 text-[13px] text-muted">저녁 7시 · 예약 없이 그냥 가면 돼요</p>
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
              <button className="tap-safe grid size-[52px] shrink-0 place-items-center rounded-xl border border-line bg-surface text-label">
                <BookmarkIcon size={22} />
              </button>
              <a
                href={o.ctaUrl}
                className="tap-safe flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-[16px] font-bold text-white"
              >
                보러 가기
                <ExternalLinkIcon size={18} />
              </a>
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
            <span>동네 문화·공연</span>
            <ChevronRightIcon size={14} className="text-[#c9bcab]" />
            <span className="text-label">망원 한강 야간 재즈 공연</span>
          </nav>

          {/* 2단 */}
          <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_372px]">
            {/* 메인 */}
            <div>
              <Tag>{o.categoryLabel}</Tag>
              <h1 className="mt-3 text-[34px] font-extrabold leading-[1.28] tracking-[-0.03em] text-ink">
                퇴근길 20분, 망원 한강 야간 재즈 소품 공연
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px]">
                <span className="flex items-center gap-1 text-muted">
                  <LocationIcon size={16} className="text-primary" />
                  망원동 · 회사에서 도보 15분
                </span>
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <FireIcon size={15} /> 도윤님과 매칭 94%
                </span>
              </div>

              {/* 왜 맞을까요 */}
              <div className="mt-6 rounded-[18px] bg-surface p-6 shadow-web">
                <p className="flex items-center gap-2 text-[17px] font-bold text-ink">
                  <InsightsIcon size={20} className="text-primary" />
                  왜 도윤님께 맞을까요?
                </p>
                <ul className="mt-4 space-y-3">
                  {WHY.map((w) => (
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
                  <p className="mt-1 text-[12px] font-medium text-white/90">저녁 7시 · 예약 없이 그냥 가면 돼요</p>
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
                  <a
                    href={o.ctaUrl}
                    className="mt-4 flex h-[52px] w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[16px] font-bold text-white transition-colors hover:bg-primary-deep"
                  >
                    보러 가기 <ExternalLinkIcon size={18} />
                  </a>
                  <div className="mt-2.5 flex gap-2.5">
                    <button className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-[14px] font-semibold text-label hover:border-faint">
                      <BookmarkIcon size={18} /> 저장
                    </button>
                    <button className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-[14px] font-semibold text-label hover:border-faint">
                      <ShareIcon size={18} /> 공유
                    </button>
                  </div>
                  <p className="mt-3 text-center text-[12px] text-muted">
                    저장하면 마감·유사 기회를 알려드려요
                  </p>
                </div>
              </div>

              {/* 크로스셀 */}
              <Link
                href="/opportunity"
                className="flex items-center gap-3 rounded-2xl bg-mint-tint p-4.5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-mint">
                  <SavingsIcon size={22} />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-mint">이어서 하기 좋아요</p>
                  <p className="text-[14px] font-bold text-ink">경의선숲길 저녁 산책 · 무료</p>
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
