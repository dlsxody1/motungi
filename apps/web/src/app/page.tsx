import Link from "next/link";
import { Logo, SafeBottom, SafeTop } from "@/components/ui";
import { HeroCarousel } from "@/components/hero-carousel";
import { DesktopShell } from "@/components/web-shell";
import { WebLanding } from "@/components/web-landing";
import { fetchOpportunities } from "@/data/opportunities";

/**
 * A1 · 홈 / 온보딩 — 반응형.
 *  - 모바일: 선셋 그라데이션 히어로(앱 온보딩과 동일)
 *  - 데스크탑(md:+): 피그마 웹 랜딩(히어로 2단 + 밸류프롭 + 스텝 + 카테고리)
 */
export default async function Home() {
  // 히어로 캐러셀용 실제 활동(썸네일 있는 것) — 서버에서 소량만 당겨 온다. 실패/빈결과는 빈 배열.
  const { data: heroPicks } = await fetchOpportunities({ withImageOnly: true, limit: 12 });

  return (
    <>
      {/* 모바일 히어로 — 그라데이션이 화면 폭을 꽉 채운다(좌우 흰 여백 없음) */}
      <div className="md:hidden">
        <main
          className="relative flex min-h-dvh flex-col overflow-hidden text-white"
          style={{
            background: "linear-gradient(160deg, #e25067 0%, #e05f67 42%, #f2a06a 100%)",
          }}
        >
          <div className="flex flex-1 flex-col">
            <SafeTop />
            <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-6 pb-4 pt-6">
              {/* 브랜드 로고(앱 아이콘 + 워드마크) — 공용 Logo로 통일 */}
              <Logo onDark size={34} />

              <div className="mt-9">
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

              {/* 실 활동 캐러셀 — 앵커 동네 기준(1.5초 자동 전환·탭하면 활동 상세) */}
              {heroPicks.length >= 4 && (
                <div className="mt-7">
                  <HeroCarousel items={heroPicks} />
                </div>
              )}

              <div className="mt-auto space-y-3 pt-8">
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
        </main>
      </div>
      {/* 데스크탑 랜딩 */}
      <DesktopShell active="home" variant="marketing">
        <WebLanding heroPicks={heroPicks} />
      </DesktopShell>
    </>
  );
}
