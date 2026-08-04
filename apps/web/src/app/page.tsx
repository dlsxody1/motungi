import Link from "next/link";
import { Logo, SafeBottom, SafeTop } from "@/components/ui";
import { HeroPosterStage } from "@/components/hero-poster-stage";
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

              {/* 실 활동 3D 포스터 링 — 데스크탑과 동일 컴포넌트.
                  WebGL이 안 되는 기기(구형·저사양)에서는 내부에서 캐러셀로 자동 폴백한다. */}
              {heroPicks.length >= 4 && (
                <div className="mt-7">
                  <HeroPosterStage items={heroPicks} variant="mobile" />
                </div>
              )}

              {/* 두 길 — 정해달라(주) / 직접 본다(부).
                  같은 무게 버튼 2개는 선택 마비를 부르므로 위계를 준다. 둘 다 정당한 의도지만
                  기본은 큐레이션이다. "로그인 없이"는 링크가 아니라 안심 문구라 텍스트로 내린다
                  (예전엔 /report로 가는 링크였는데, 진단을 건너뛴 폴백 리포트로 떨어졌다). */}
              <div className="mt-auto space-y-3 pt-8">
                <Link
                  href="/location"
                  className="tap-safe flex h-[52px] w-full items-center justify-center rounded-xl bg-white text-[16px] font-bold text-primary-deep active:scale-[0.99]"
                >
                  내 동네에서 골라받기
                </Link>
                <Link
                  href="/explore"
                  className="tap-safe flex h-[48px] w-full items-center justify-center rounded-xl border border-white/35 text-[15px] font-semibold text-white active:scale-[0.99]"
                >
                  동네 활동 둘러보기
                </Link>
                <p className="pt-1 text-center text-[13px] text-white/80">
                  로그인 없이 바로 시작 · 저장할 때만 가입
                </p>
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
