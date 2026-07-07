import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowRightIcon,
  BookmarkIcon,
  FireIcon,
  LocationIcon,
  RefreshIcon,
  SavingsIcon,
  ShareIcon,
} from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { ONE_PICK, RELATED } from "@/data/opportunities";

/** A5 · 동네 리포트 (원픽 히어로) — 반응형 */
export default function ReportPage() {
  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
              <div className="flex items-start justify-between pt-1">
                <div>
                  <p className="flex items-center gap-1 text-[18px] font-extrabold text-ink">
                    <LocationIcon size={18} className="text-primary" />
                    망원동 기준
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">퇴근하고 즐길 거 3개 골랐어요</p>
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

              <Link
                href="/opportunity"
                className="block overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-primary/25"
              >
                <div className="bg-tint/50 p-5">
                  <div className="flex items-center justify-between">
                    <Tag>{ONE_PICK.categoryLabel}</Tag>
                    <span className="text-[13px] font-bold text-primary">
                      매칭 {ONE_PICK.matchScore}%
                    </span>
                  </div>
                  <h2 className="mt-3 text-[21px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
                    퇴근길 20분, 망원 한강
                    <br />
                    야간 재즈 소품 공연
                  </h2>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-label">
                    망원 한강공원은 회사에서 <b className="text-primary-deep">15분</b>. 방전형인
                    도윤님도 앉아서 즐기기 좋은 무료 야외 공연이에요.
                  </p>
                  <div className="mt-4 flex items-end justify-between rounded-xl bg-tint px-4 py-3">
                    <div>
                      <p className="text-[12px] font-semibold text-primary-deep">참가비</p>
                      <p className="text-[26px] font-extrabold leading-none text-primary-deep">
                        {ONE_PICK.costLabel}
                      </p>
                    </div>
                    <p className="text-right text-[12px] leading-tight text-muted">
                      저녁 7시
                      <br />
                      예약 없이 그냥
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <span className="tap-safe flex h-[50px] w-full items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white">
                    자세히 보고 시작하기
                  </span>
                </div>
              </Link>

              <p className="mb-1 mt-6 text-[14px] font-semibold text-label">함께 보면 좋아요</p>
              <div className="divide-y divide-line-alt">
                {RELATED.map((o) => (
                  <Link key={o.id} href="/opportunity" className="flex items-start gap-3 py-4">
                    <div className="flex-1">
                      <p className={`text-[12px] font-bold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}>
                        {o.categoryLabel}
                      </p>
                      <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-[16px] font-extrabold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}>
                        {o.costLabel}
                      </p>
                      <p className="text-[12px] text-muted">자세히 →</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-alt px-4 py-3.5">
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
      <DesktopShell active="report">
        <WebContainer className="py-9">
          {/* 헤더 */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.02em] text-ink">
                <LocationIcon size={26} className="text-primary" />
                망원동 저녁 리포트
              </h1>
              <p className="mt-1.5 text-[15px] text-muted">
                도윤님이 퇴근하고 즐길 거 3개를 찾았어요 · 2026.07.01 갱신
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button className="flex items-center gap-1.5 rounded-[11px] border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-label hover:border-faint">
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
                <div className="flex flex-col gap-6 p-7 md:flex-row">
                  {/* 좌 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Tag>{ONE_PICK.categoryLabel}</Tag>
                      <span className="flex items-center gap-1 text-[13px] font-bold text-primary">
                        <FireIcon size={15} /> 매칭 94%
                      </span>
                    </div>
                    <h2 className="mt-3 text-[27px] font-extrabold leading-[1.32] tracking-[-0.01em] text-ink">
                      퇴근길 20분, 망원 한강 야간 재즈 소품 공연
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-label">
                      망원 한강공원은 회사에서 <b className="text-primary-deep">15분</b>. 방전형인
                      도윤님도 앉아서 즐기기 좋은 무료 야외 공연이에요.
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-2.5">
                      {[
                        { l: "소요 시간", v: "약 1시간", mint: false },
                        { l: "강도", v: "낮음", mint: true },
                        { l: "시간대", v: "저녁 7시", mint: false },
                      ].map((m) => (
                        <div key={m.l} className="rounded-xl bg-bg px-3 py-3 text-center">
                          <p className="text-[11px] text-muted">{m.l}</p>
                          <p className={`mt-1 text-[15px] font-bold ${m.mint ? "text-mint" : "text-ink"}`}>
                            {m.v}
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
                      <p className="text-[12px] font-semibold text-white/80">참가비</p>
                      <p className="text-[30px] font-extrabold leading-tight">무료</p>
                      <p className="mt-1 text-[12px] text-white/85">
                        저녁 7시 · 예약 없이 그냥 가면 돼요
                      </p>
                      <p className="mt-3 rounded-pill bg-white/15 px-3 py-1.5 text-center text-[12px] font-semibold">
                        회사에서 도보 15분
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2.5">
                      <button className="grid h-12 w-13 shrink-0 place-items-center rounded-xl border border-line bg-surface text-label hover:border-faint">
                        <BookmarkIcon size={20} />
                      </button>
                      <Link
                        href="/opportunity"
                        className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white hover:bg-primary-deep"
                      >
                        자세히
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 함께 보면 좋아요 */}
              <p className="mb-3 mt-7 text-[16px] font-bold text-ink">함께 보면 좋아요</p>
              <div className="space-y-3">
                {RELATED.map((o) => (
                  <Link
                    key={o.id}
                    href="/opportunity"
                    className="wcard-hover flex items-center gap-4 rounded-[18px] bg-surface p-5 shadow-web"
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                        o.tone === "mint" ? "bg-mint-tint text-mint" : "bg-purple-tint text-purple"
                      }`}
                    >
                      <SavingsIcon size={22} />
                    </span>
                    <div className="flex-1">
                      <p className={`text-[12px] font-bold ${o.tone === "mint" ? "text-mint" : "text-purple"}`}>
                        {o.categoryLabel}
                      </p>
                      <p className="mt-0.5 text-[16px] font-bold text-ink">{o.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-[17px] font-extrabold ${o.tone === "mint" ? "text-mint" : "text-purple"}`}>
                        {o.costLabel}
                      </p>
                      <p className="text-[12px] text-muted">매칭 {o.matchScore}%</p>
                    </div>
                  </Link>
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
                <p className="text-[11px] font-bold tracking-[0.08em] text-white/80">DONGNE REPORT</p>
                <p className="mt-1 text-[18px] font-extrabold">망원동은 이런 동네예요</p>
                <div className="mt-4 space-y-2">
                  {[
                    { l: "문화·공연 밀도", v: "상위 5%" },
                    { l: "청년(2030) 인구", v: "38%" },
                    { l: "도보 10분 내 활동", v: "24곳+" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="flex items-center justify-between rounded-xl bg-white/15 px-3.5 py-2.5"
                    >
                      <span className="text-[13px] text-white/85">{s.l}</span>
                      <span className="text-[14px] font-bold">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] bg-surface p-5 shadow-web">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold text-ink">도윤님 진단 요약</p>
                  <Link href="/diagnosis" className="text-[13px] font-semibold text-primary">
                    수정
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["문화·공연", "평일 저녁", "방전형", "무료 위주"].map((t) => (
                    <span key={t} className="rounded-pill bg-bg px-3 py-1.5 text-[12px] font-semibold text-label">
                      {t}
                    </span>
                  ))}
                </div>
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
