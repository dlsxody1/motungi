"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { KakaoLoginButton } from "@/components/kakao-login-button";
import { Logo } from "@/components/ui";
import { signInWithKakao } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";

/**
 * 로그인 전용 화면.
 *
 * 왜 별도 화면인가: 예전엔 마이(D1) 한복판에 노란 카카오 배너만 덜렁 놓여 있었다.
 * 로그인이 "화면"이 아니라 메뉴 사이에 낀 배너라 무게가 없었고, 왜 로그인해야 하는지
 * 설명할 자리도 없었다. 로그인은 계정을 만드는 결정이므로 자기 화면을 가진다.
 *
 * 레이아웃: 데스크톱은 좌우 2단(브랜드 색면 / 로그인), 모바일은 1단.
 * 색면은 랜딩과 같은 물감 언어(paint-*)를 재사용한다 — 새 비주얼을 만들지 않는다.
 *
 * 로그인은 선택이다. 모퉁이는 로그인 없이도 전부 쓸 수 있으므로
 * "나중에 할게요"를 항상 같은 무게로 남겨둔다(강제 로그인 벽 금지).
 */
function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAppStore((s) => s.user);
  const savedCount = useAppStore((s) => s.savedIds.length);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  /** 로그인 후 돌아갈 곳. 오픈 리다이렉트 방지를 위해 내부 경로(/로 시작)만 허용한다. */
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/my";

  // 이미 로그인된 사용자가 이 화면에 올 이유가 없다 — 돌려보낸다.
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const login = async () => {
    setBusy(true);
    setLoginError(null);
    const { error } = await signInWithKakao();
    // 성공 시 카카오로 리다이렉트되므로 아래는 실패 시에만 도달.
    setBusy(false);
    if (error) setLoginError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
  };

  return (
    <main className="flex min-h-dvh flex-col md:flex-row">
      {/* ── 브랜드 색면 (데스크톱 좌측 / 모바일 상단) ──
          랜딩 히어로와 같은 그라데이션 + 안료 얼룩. 모바일에선 높이를 낮춰
          로그인 버튼이 첫 화면 안에 들어오게 한다. */}
      <section
        className="relative flex shrink-0 flex-col justify-between overflow-hidden px-6 py-8 md:w-[46%] md:px-12 md:py-14"
        style={{
          background:
            "linear-gradient(150deg, var(--color-sun) 0%, var(--color-primary) 52%, var(--color-purple) 118%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 88% 8%, rgba(255,255,255,0.16), transparent 46%), radial-gradient(90% 80% at 6% 100%, rgba(46,26,16,0.14), transparent 52%)",
          }}
        />
        {/* 안료 결 — 그라데이션이 아니라 "칠한 면"으로 읽히게 하는 한 겹(랜딩과 동일). */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.28] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.009 0.016' numOctaves='5' seed='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23l)'/%3E%3C/svg%3E\")",
            backgroundSize: "460px 460px",
          }}
        />

        <Link href="/" className="relative z-10 inline-flex w-fit" aria-label="모퉁이 홈으로">
          <Logo size={30} onDark />
        </Link>

        <div className="relative z-10 mt-8 md:mt-0">
          <h1 className="text-[26px] font-extrabold leading-[34px] tracking-[-0.02em] text-white md:text-[38px] md:leading-[48px]">
            퇴근하고 뭐하지?
            <br />
            동네에서 찾은 오늘의 원픽.
          </h1>
          <p className="mt-3 max-w-[34ch] text-[14px] leading-[22px] text-white/85 md:mt-4 md:text-[16px] md:leading-[26px]">
            로그인하면 저장한 활동이 계정에 남아, 폰을 바꾸거나 PC로 봐도 그대로예요.
          </p>
        </div>

        {/* 데스크톱에만 — 모바일에선 접히는 공간이 아깝다. */}
        <p className="relative z-10 hidden text-[13px] text-white/70 md:block">
          모퉁이 Corner · 서울 · 수도권
        </p>
      </section>

      {/* ── 로그인 패널 ── */}
      <section className="flex flex-1 items-center justify-center bg-bg px-6 py-10 md:px-12">
        <div className="w-full max-w-[380px]">
          <h2 className="text-[22px] font-bold leading-[30px] tracking-[-0.01em] text-ink">
            카카오로 시작하기
          </h2>
          <p className="mt-2 text-[14px] leading-[22px] text-label">
            {savedCount > 0
              ? `지금 저장한 ${savedCount}개를 계정으로 옮겨요.`
              : "가입 절차 없이 카카오 계정으로 바로 시작해요."}
          </p>

          <div className="mt-6">
            <KakaoLoginButton onClick={login} busy={busy} error={loginError} />
          </div>

          {/* 로그인은 선택 — 빠져나갈 길을 같은 무게로 둔다. */}
          <Link
            href={next}
            className="mt-4 flex h-[52px] w-full items-center justify-center rounded-xl text-[15px] font-semibold text-muted transition-colors hover:text-label"
          >
            나중에 할게요
          </Link>

          <p className="mt-6 text-center text-[12px] leading-[18px] text-muted">
            로그인하지 않아도 진단·탐색·보관함은 모두 쓸 수 있어요.
            <br />
            저장은 이 기기에만 남아요.
          </p>
        </div>
      </section>
    </main>
  );
}

/** useSearchParams는 Suspense 경계가 필요하다(App Router). */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <LoginContent />
    </Suspense>
  );
}
