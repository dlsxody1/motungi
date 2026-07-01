import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { LocationIcon, RefreshIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import { ONE_PICK, RELATED } from "@/data/opportunities";

/** A5 · 동네 리포트 (원픽 히어로) */
export default function ReportPage() {
  return (
    <MobileScreen>
      <div className="flex flex-1 flex-col bg-bg">
        <SafeTop />

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
          {/* 헤더 */}
          <div className="flex items-start justify-between pt-1">
            <div>
              <p className="flex items-center gap-1 text-[18px] font-extrabold text-ink">
                <LocationIcon size={18} className="text-primary" />
                망원동 기준
              </p>
              <p className="mt-0.5 text-[13px] text-muted">도윤님 맞는 기회 3개예요</p>
            </div>
            <Link
              href="/diagnosis"
              className="flex h-9 items-center gap-1 rounded-pill border border-line bg-surface px-3 text-[13px] font-semibold text-label"
            >
              <RefreshIcon size={15} />
              재진단
            </Link>
          </div>

          {/* 오늘의 원픽 */}
          <p className="mb-2.5 mt-5 text-[14px] font-bold text-primary">오늘의 원픽</p>

          <Link
            href="/opportunity"
            className="block overflow-hidden rounded-2xl border-l-[5px] border-primary bg-surface shadow-card"
          >
            <div className="bg-tint/50 p-5">
              <div className="flex items-center justify-between">
                <Tag>{ONE_PICK.categoryLabel}</Tag>
                <span className="text-[13px] font-bold text-primary">
                  매칭 {ONE_PICK.matchScore}%
                </span>
              </div>
              <h2 className="mt-3 text-[21px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
                주말 오전, 동네 카페
                <br />
                오픈 바리스타 파트
              </h2>
              <p className="mt-2.5 text-[14px] leading-relaxed text-label">
                망원동은 카페 밀도 <b className="text-primary-deep">상위 5%</b>. 방전형인
                도윤님께 맞는 주말 오전 단타임 수요가 많아요.
              </p>

              <div className="mt-4 flex items-end justify-between rounded-xl bg-tint px-4 py-3">
                <div>
                  <p className="text-[12px] font-semibold text-primary-deep/70">예상 월 수입</p>
                  <p className="text-[26px] font-extrabold leading-none text-primary-deep">
                    {ONE_PICK.incomeLabel}
                  </p>
                </div>
                <p className="text-right text-[12px] leading-tight text-muted">
                  한 달이면
                  <br />
                  에어팟 프로 2개
                </p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <span className="tap-safe flex h-[50px] w-full items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white">
                자세히 보고 시작하기
              </span>
            </div>
          </Link>

          {/* 함께 보면 좋아요 */}
          <p className="mb-1 mt-6 text-[14px] font-semibold text-label">함께 보면 좋아요</p>
          <div className="divide-y divide-line-alt">
            {RELATED.map((o) => (
              <Link key={o.id} href="/opportunity" className="flex items-start gap-3 py-4">
                <div className="flex-1">
                  <p
                    className={`text-[12px] font-bold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}
                  >
                    {o.categoryLabel}
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{o.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-[16px] font-extrabold ${o.tone === "mint" ? "text-mint" : "text-primary"}`}
                  >
                    {o.incomeLabel}
                  </p>
                  <p className="text-[12px] text-faint">자세히 →</p>
                </div>
              </Link>
            ))}
          </div>

          {/* 합산 배너 */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-alt px-4 py-3.5">
            <div>
              <p className="text-[14px] font-bold text-ink">이거 다 하면 1년에 얼마?</p>
              <p className="text-[12px] text-muted">정책+부업+딜 합산 시뮬</p>
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
  );
}
