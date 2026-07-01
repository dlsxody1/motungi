import Link from "next/link";
import { Logo, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";

/** A1 · 온보딩 — 선셋 그라데이션 히어로 + 3개 기회 티저 + CTA */
export default function OnboardingPage() {
  return (
    <MobileScreen>
      <div
        className="relative flex flex-1 flex-col overflow-hidden text-white sm:rounded-[28px]"
        style={{
          background:
            "linear-gradient(160deg, #e25067 0%, #e05f67 42%, #f2a06a 100%)",
        }}
      >
        <SafeTop />

        <div className="flex flex-1 flex-col px-6 pb-4 pt-6">
          <Logo onDark size={30} />

          <div className="mt-14">
            <h1 className="text-[34px] font-extrabold leading-[1.18] tracking-[-0.02em]">
              내 동네 모퉁이에,
              <br />
              기회가 있다
            </h1>
            <p className="mt-4 max-w-[17rem] text-[15px] leading-relaxed text-white/85">
              최근 내 우리 동네에서 잡을 수 있는 기회,
              <br />딱 1~3개만 골라드려요.
            </p>
          </div>

          <ul className="mt-8 space-y-3.5">
            {[
              { k: "마챌 세일", v: "인근샵 60초면 끝나요" },
              { k: "원픽", v: "수백 개 대신 딱 1~3개만" },
              { k: "아이어로컬", v: "내 동네 기준으로 추천돼요" },
            ].map((t) => (
              <li key={t.k} className="flex items-baseline gap-3">
                <span className="w-[74px] shrink-0 text-[14px] font-bold text-white">
                  {t.k}
                </span>
                <span className="text-[14px] text-white/75">{t.v}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto space-y-3 pt-10">
            <Link
              href="/location"
              className="tap-safe flex h-[52px] w-full items-center justify-center rounded-xl bg-white text-[16px] font-bold text-primary-deep active:scale-[0.99]"
            >
              내 동네 기회 보기
            </Link>
            <Link
              href="/report"
              className="tap-safe flex h-[44px] w-full items-center justify-center text-[14px] font-semibold text-white/80"
            >
              로그인 없이 바로 시작
            </Link>
          </div>
        </div>

        <SafeBottom />
      </div>
    </MobileScreen>
  );
}
