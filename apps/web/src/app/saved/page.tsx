import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { BookmarkIcon, LocationIcon, SavingsIcon, UserIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";

const SAVED = [
  {
    id: "hangang-jazz",
    categoryLabel: "동네 문화·공연",
    title: "망원 한강 야간 재즈 소품 공연",
    meta: "망원동 · 도보 15분",
    cost: "무료",
    tone: "brand" as const,
  },
  {
    id: "gyeongui-walk",
    categoryLabel: "동네 산책·운동",
    title: "경의선숲길 저녁 산책 코스",
    meta: "연남동 · 3km 걷기길",
    cost: "무료",
    tone: "mint" as const,
  },
];

/** A7 · 보관함 / 홈 — 반응형 */
export default function SavedPage() {
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
                  <h1 className="text-[22px] font-extrabold text-ink">도윤님, 안녕하세요</h1>
                  <p className="mt-1 flex items-center gap-1 text-[14px] text-muted">
                    <LocationIcon size={15} className="text-primary" />
                    망원동 기준
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-surface-alt text-muted">
                  <UserIcon size={22} />
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-tint/60 p-4">
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-ink">이번 주 동네 다시 보기</p>
                  <p className="mt-0.5 text-[13px] text-muted">상황이 바뀌었나요? 60초면 재진단해요.</p>
                </div>
                <Link
                  href="/diagnosis"
                  className="tap-safe flex items-center rounded-pill bg-primary px-4 text-[14px] font-bold text-white"
                >
                  재진단
                </Link>
              </div>

              <div className="mb-1 mt-6 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-ink">저장한 활동</h2>
                <span className="text-[13px] text-muted">{SAVED.length}개</span>
              </div>

              <div className="divide-y divide-line-alt">
                {SAVED.map((s) => (
                  <Link key={s.id} href="/opportunity" className="flex items-start gap-3 py-4">
                    <div className="flex-1">
                      <p className={`text-[12px] font-bold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}>
                        {s.categoryLabel}
                      </p>
                      <p className="mt-1 text-[16px] font-bold text-ink">{s.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{s.meta}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className={`text-[15px] font-extrabold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}>
                        {s.cost}
                      </p>
                      <BookmarkIcon size={20} filled className="text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <BottomNav active="saved" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="explore">
        <WebContainer className="py-9">
          <div className="mx-auto max-w-[860px]">
            {/* 인사 헤더 */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-ink">
                  도윤님, 안녕하세요
                </h1>
                <p className="mt-1.5 flex items-center gap-1 text-[15px] text-muted">
                  <LocationIcon size={16} className="text-primary" />
                  망원동 기준
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-full bg-tint text-[14px] font-bold text-primary-deep">
                도윤
              </span>
            </div>

            {/* 재진단 배너 */}
            <div className="mt-6 flex items-center gap-4 rounded-[18px] bg-tint/60 p-6">
              <div className="flex-1">
                <p className="text-[17px] font-bold text-ink">이번 주 동네 다시 보기</p>
                <p className="mt-1 text-[14px] text-muted">상황이 바뀌었나요? 60초면 재진단해요.</p>
              </div>
              <Link
                href="/diagnosis"
                className="flex h-11 items-center rounded-pill bg-primary px-6 text-[15px] font-bold text-white hover:bg-primary-deep"
              >
                재진단
              </Link>
            </div>

            {/* 저장한 활동 */}
            <div className="mb-3 mt-9 flex items-center justify-between">
              <h2 className="text-[19px] font-bold text-ink">저장한 활동</h2>
              <span className="text-[14px] text-muted">{SAVED.length}개</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SAVED.map((s) => (
                <Link
                  key={s.id}
                  href="/opportunity"
                  className="wcard-hover flex flex-col rounded-[18px] bg-surface p-5 shadow-web"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`grid size-10 place-items-center rounded-xl ${
                        s.tone === "mint" ? "bg-mint-tint text-mint" : "bg-tint text-primary"
                      }`}
                    >
                      <SavingsIcon size={20} />
                    </span>
                    <BookmarkIcon size={20} filled className="text-primary" />
                  </div>
                  <p className={`mt-3 text-[12px] font-bold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}>
                    {s.categoryLabel}
                  </p>
                  <p className="mt-1 flex-1 text-[17px] font-bold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{s.meta}</p>
                  <p
                    className={`mt-3 border-t border-line-alt pt-3 text-[18px] font-extrabold ${
                      s.tone === "mint" ? "text-mint" : "text-primary"
                    }`}
                  >
                    {s.cost}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
