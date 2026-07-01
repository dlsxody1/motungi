import Link from "next/link";
import { DIAGNOSIS_STEPS } from "@motungi/core";
import { Logo } from "@/components/ui";

/**
 * 목업 갤러리 — 메인 플로우(A) 화면으로 진입하는 인덱스.
 * 각 카드는 실제 라우트로 연결된다.
 */
const SCREENS = [
  { href: "/onboarding", code: "A1", title: "온보딩", desc: "선셋 히어로 · 진입" },
  { href: "/location", code: "A2", title: "위치 / 동네 설정", desc: "행정동 기준 선택" },
  { href: "/diagnosis", code: "A3", title: "60초 진단", desc: "4문항 · 자동 진행" },
  { href: "/loading", code: "A4", title: "로딩", desc: "데이터 취합" },
  { href: "/report", code: "A5", title: "동네 리포트", desc: "오늘의 원픽" },
  { href: "/opportunity", code: "A6", title: "기회 상세", desc: "수입 · 시작 방법" },
  { href: "/saved", code: "A7", title: "보관함 / 홈", desc: "저장 · 재진단" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Logo size={34} />

      <h1 className="mt-8 text-[34px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
        내 동네 모퉁이에,
        <br />
        기회가 있다
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        하이퍼로컬 기회 내비게이션 · 트와일라잇 로즈 팔레트. 아래 카드에서 메인 플로우(A)
        화면 목업을 확인하세요. 진단 {DIAGNOSIS_STEPS.length}문항이 실제로 동작합니다.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SCREENS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-center gap-4 rounded-xl bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-tint text-[15px] font-extrabold text-primary">
              {s.code}
            </span>
            <span className="flex-1">
              <span className="block text-[16px] font-bold text-ink">{s.title}</span>
              <span className="block text-[13px] text-muted">{s.desc}</span>
            </span>
            <span className="text-faint transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-[13px] text-faint">
        모퉁이 Corner · 디자인시스템 + 메인 플로우(A) 구현 · 다음 단계: 탐색·로그인·마이(B~F)
      </p>
    </main>
  );
}
