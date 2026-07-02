"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircleIcon, CheckIcon, ChevronLeftIcon, CloseIcon, ShieldIcon, TimerIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { WebLogo } from "@/components/web-shell";

/** 4문항 정의 — @motungi/core 의 DIAGNOSIS_STEPS 순서와 맞춤. */
type Option = { value: string; title: string; desc: string; soon?: boolean };
type Question = {
  eyebrow: string;
  short: string;
  title: string;
  hint: string;
  auto: boolean;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    eyebrow: "Q1. 본업 직군",
    short: "본업 직군",
    title: "어떤 일을 하고 계세요?",
    hint: "MVP는 마케팅·개발·디자인부터 시작해요.",
    auto: true,
    options: [
      { value: "office", title: "마케팅", desc: "콘텐츠 · 퍼포먼스 · 브랜드" },
      { value: "dev", title: "개발", desc: "프론트 · 백엔드 · 데이터" },
      { value: "design", title: "디자인", desc: "UX · 그래픽 · 브랜드" },
      { value: "etc", title: "그 외 직군", desc: "", soon: true },
    ],
  },
  {
    eyebrow: "Q2. 가용 시간",
    short: "가용 시간",
    title: "부업에 쓸 수 있는\n시간은 언제인가요?",
    hint: "퇴근 후·주말 중 잡기 좋은 걸 골라드려요.",
    auto: true,
    options: [
      { value: "weekend_am", title: "주말 오전", desc: "토·일 오전 단타임" },
      { value: "weekday_evening", title: "평일 저녁", desc: "퇴근 후 2~3시간" },
      { value: "weekend_pm", title: "주말 오후", desc: "토·일 오후 여유" },
      { value: "flexible", title: "자투리 · 유동", desc: "그때그때 가능한 시간" },
    ],
  },
  {
    eyebrow: "Q3. 체력·에너지",
    short: "퇴근 후 체력",
    title: "요즘 에너지는 어떠세요?",
    hint: "무리 없는 난이도로 맞춰드려요.",
    auto: true,
    options: [
      { value: "drained", title: "방전형", desc: "가볍게 · 부담 없이" },
      { value: "moderate", title: "보통", desc: "적당한 몰입까지 OK" },
      { value: "active", title: "활동형", desc: "제대로 벌고 싶어요" },
    ],
  },
  {
    eyebrow: "Q4. 목표 월 수익",
    short: "목표 월 수익",
    title: "얼마를 벌고 싶으세요?",
    hint: "목표에 맞춰 기회를 정렬해요.",
    auto: false,
    options: [
      { value: "under_30", title: "30만 원 이하", desc: "용돈벌이면 충분" },
      { value: "30_to_50", title: "30~50만 원", desc: "고정비 한 축 커버" },
      { value: "50_to_100", title: "50~100만 원", desc: "제대로 사이드잡" },
      { value: "over_100", title: "100만 원 이상", desc: "본격적으로" },
    ],
  },
];

export default function DiagnosisPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const q = QUESTIONS[step]!;
  const total = QUESTIONS.length;
  const selected = answers[step];

  const goNext = () => {
    if (step < total - 1) setStep(step + 1);
    else router.push("/loading");
  };
  const pick = (value: string, soon?: boolean) => {
    if (soon) return;
    setAnswers((a) => ({ ...a, [step]: value }));
    if (q.auto) window.setTimeout(goNext, 260);
  };
  const goBack = () => {
    if (step === 0) router.push("/location");
    else setStep(step - 1);
  };

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex items-center gap-3 px-6 py-2">
              <button onClick={goBack} className="tap-safe -ml-2 flex w-9 text-ink">
                <ChevronLeftIcon size={22} />
              </button>
              <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-line-alt">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${((step + 1) / total) * 100}%` }}
                />
              </div>
              <span className="text-[13px] font-semibold tabular-nums text-muted">
                {step + 1} / {total}
              </span>
            </div>

            <div className="flex flex-1 flex-col px-6 pt-4">
              <p className="text-[13px] font-bold text-primary">{q.eyebrow}</p>
              <h1 className="mt-1.5 whitespace-pre-line text-[24px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
                {q.title}
              </h1>
              <p className="mt-2 text-[14px] text-muted">{q.hint}</p>

              <div className="mt-5 space-y-3">
                {q.options.map((o) => {
                  const on = selected === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => pick(o.value, o.soon)}
                      disabled={o.soon}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        o.soon
                          ? "border-transparent bg-surface-alt/70 text-faint"
                          : on
                            ? "border-primary bg-surface shadow-card"
                            : "border-transparent bg-surface shadow-card"
                      }`}
                    >
                      <span className="flex-1">
                        <span className={`block text-[16px] font-bold ${o.soon ? "text-faint" : "text-ink"}`}>
                          {o.title}
                        </span>
                        {o.desc && <span className="mt-0.5 block text-[13px] text-muted">{o.desc}</span>}
                      </span>
                      {o.soon ? (
                        <span className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-faint">
                          준비중
                        </span>
                      ) : (
                        on && <CheckCircleIcon size={22} className="text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pb-6 text-center text-[13px] text-faint">
                {q.auto ? "선택하면 다음 질문으로 넘어가요" : ""}
              </div>

              {!q.auto && (
                <button
                  onClick={goNext}
                  disabled={!selected}
                  className="tap-safe mb-3 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white disabled:opacity-40"
                >
                  결과 보기
                </button>
              )}
            </div>
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <div className="hidden min-h-dvh flex-col bg-bg md:flex">
        {/* 슬림 앱바 */}
        <header className="flex h-[66px] items-center justify-between border-b border-line-alt bg-surface px-10">
          <WebLogo size={32} />
          <span className="flex items-center gap-1.5 text-[15px] font-bold text-primary">
            <TimerIcon size={18} /> 60초 진단
          </span>
          <Link href="/location" className="flex items-center gap-1 text-[14px] font-semibold text-muted hover:text-ink">
            나가기 <CloseIcon size={18} />
          </Link>
        </header>

        {/* 진행바 */}
        <div className="h-[6px] bg-track">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((step + 1) / total) * 100}%`,
              background: "linear-gradient(90deg, var(--color-sun), var(--color-primary))",
            }}
          />
        </div>

        <div className="mx-auto flex w-full max-w-[1280px] flex-1 gap-14 px-16 pb-15 pt-13">
          {/* 스텝 레일 */}
          <aside className="w-[264px] shrink-0">
            <p className="text-[13px] font-extrabold tracking-[0.06em] text-primary">
              STEP {step + 1} / {total}
            </p>
            <div className="mt-4 space-y-1">
              {QUESTIONS.map((qq, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div
                    key={qq.short}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${
                      active ? "border border-primary/30 bg-surface shadow-[0_2px_8px_rgba(85,52,30,0.05)]" : ""
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                        done
                          ? "bg-mint-tint text-mint"
                          : active
                            ? "bg-primary text-white"
                            : "border-[1.5px] border-line text-faint"
                      }`}
                    >
                      {done ? <CheckIcon size={15} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-[14px] font-semibold ${
                          active ? "text-ink" : done ? "text-label" : "text-faint"
                        }`}
                      >
                        {qq.short}
                      </span>
                      {done && answers[i] && (
                        <span className="block truncate text-[12px] text-mint">
                          {qq.options.find((o) => o.value === answers[i])?.title}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-[14px] bg-info-bg p-4">
              <ShieldIcon size={18} className="mt-0.5 shrink-0 text-muted" />
              <p className="text-[12px] leading-relaxed text-muted">
                답변은 추천에만 쓰이고 저장 전까지 기기에만 있어요.
              </p>
            </div>
          </aside>

          {/* 질문 영역 */}
          <div className="max-w-[720px] flex-1">
            <p className="text-[15px] font-semibold text-primary">{q.eyebrow}</p>
            <h1 className="mt-2 whitespace-pre-line text-[34px] font-extrabold leading-[1.28] tracking-[-0.025em] text-ink">
              {q.title}
            </h1>
            <p className="mt-2.5 text-[16px] leading-relaxed text-muted">{q.hint}</p>

            <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {q.options.map((o) => {
                const on = selected === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => pick(o.value, o.soon)}
                    disabled={o.soon}
                    className={`relative flex items-start gap-3.5 rounded-2xl border p-[22px] text-left transition-all ${
                      o.soon
                        ? "cursor-not-allowed border-transparent bg-surface-alt/70"
                        : on
                          ? "border-[1.5px] border-primary bg-surface shadow-web"
                          : "border-[1.5px] border-transparent bg-surface hover:border-line"
                    }`}
                  >
                    <span
                      className={`grid size-[52px] shrink-0 place-items-center rounded-[14px] text-[18px] font-extrabold ${
                        on ? "bg-tint text-primary" : "bg-tile text-muted"
                      }`}
                    >
                      {o.title.slice(0, 1)}
                    </span>
                    <span className="flex-1">
                      <span className={`block text-[17px] font-bold ${o.soon ? "text-faint" : "text-ink"}`}>
                        {o.title}
                      </span>
                      {o.desc && <span className="mt-0.5 block text-[13px] text-muted">{o.desc}</span>}
                    </span>
                    {o.soon ? (
                      <span className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-faint">
                        준비중
                      </span>
                    ) : (
                      on && <CheckCircleIcon size={22} className="shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex items-center gap-3">
              <button
                onClick={goBack}
                className="flex h-[52px] items-center rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold text-label hover:border-faint"
              >
                이전
              </button>
              <div className="flex-1" />
              <button
                onClick={goNext}
                disabled={!q.auto && !selected}
                className="flex h-[52px] w-[220px] items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white transition-colors hover:bg-primary-deep disabled:opacity-40"
              >
                {step === total - 1 ? "결과 보기" : "다음"}
              </button>
            </div>
            {q.auto && (
              <p className="mt-4 text-center text-[13px] text-faint">선택하면 다음 질문으로 넘어가요</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
