import Link from "next/link";
import { Logo, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell } from "@/components/web-shell";
import { WebLanding } from "@/components/web-landing";

/**
 * A1 · 홈 / 온보딩 — 반응형.
 *  - 모바일: 선셋 그라데이션 히어로(앱 온보딩과 동일)
 *  - 데스크탑(md:+): 피그마 웹 랜딩(히어로 2단 + 밸류프롭 + 스텝 + 카테고리)
 */
export default function Home() {
  return (
    <>
      {/* 모바일 히어로 */}
      <div className="flex min-h-dvh justify-center bg-surface-alt/60 md:hidden">
        <div className="flex min-h-dvh w-full max-w-[420px] flex-col">
          <div
            className="relative flex flex-1 flex-col overflow-hidden text-white"
            style={{
              background: "linear-gradient(160deg, #e25067 0%, #e05f67 42%, #f2a06a 100%)",
            }}
          >
            <SafeTop />
            <div className="flex flex-1 flex-col px-6 pb-4 pt-6">
              <Logo onDark size={30} />

              <div className="mt-12">
                <h1 className="text-[34px] font-extrabold leading-[1.18] tracking-[-0.02em]">
                  퇴근하고
                  <br />
                  뭐하지?
                </h1>
                <p className="mt-4 max-w-[17rem] text-[15px] leading-relaxed text-white/90">
                  퇴근 후·주말, 내 동네에서 할 만한 것
                  <br />딱 1~3개만 골라드려요.
                </p>
              </div>

              <ul className="mt-auto space-y-4 border-t border-white/20 pt-7">
                {[
                  { k: "마찰 제로", v: "진단 60초면 끝나요" },
                  { k: "원픽", v: "수백 개 대신 딱 1~3개만" },
                  { k: "하이퍼로컬", v: "내 동네 기준으로 추천돼요" },
                ].map((t) => (
                  <li key={t.k} className="flex items-baseline gap-3">
                    <span className="w-[74px] shrink-0 text-[14px] font-bold text-white">{t.k}</span>
                    <span className="text-[14px] text-white/85">{t.v}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 pt-7">
                <Link
                  href="/location"
                  className="tap-safe flex h-[52px] w-full items-center justify-center rounded-xl bg-white text-[16px] font-bold text-primary-deep active:scale-[0.99]"
                >
                  내 동네에서 찾기
                </Link>
                <Link
                  href="/report"
                  className="tap-safe flex h-[44px] w-full items-center justify-center text-[14px] font-semibold text-white/90"
                >
                  로그인 없이 바로 시작
                </Link>
              </div>
            </div>
            <SafeBottom />
          </div>
        </div>
      </div>

      {/* 데스크탑 랜딩 */}
      <DesktopShell active="home" variant="marketing">
        <WebLanding />
      </DesktopShell>
    </>
  );
}
