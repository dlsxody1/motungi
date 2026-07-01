"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircleIcon, ChevronLeftIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";

/** 4문항 정의 — @motungi/core 의 DIAGNOSIS_STEPS 순서와 맞춤. */
type Option = { value: string; title: string; desc: string; soon?: boolean };
type Question = {
  eyebrow: string;
  title: string;
  hint: string;
  auto: boolean;
  options: Option[];
};

const QUESTIONS: Question[] = [
  {
    eyebrow: "Q1. 본업 직군",
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
    title: "언제 시간이 나세요?",
    hint: "퇴근 후·주말 중 잡기 좋은 걸 골라드려요.",
    auto: true,
    options: [
      { value: "weekday_evening", title: "평일 저녁", desc: "퇴근 후 2~3시간" },
      { value: "weekend", title: "주말", desc: "토·일 오전/오후" },
      { value: "flexible", title: "유연하게", desc: "그때그때 가능한 시간" },
    ],
  },
  {
    eyebrow: "Q3. 체력·에너지",
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
    <MobileScreen>
      <div className="flex flex-1 flex-col bg-bg">
        <SafeTop />

        {/* 진행바 */}
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
          <h1 className="mt-1.5 text-[24px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
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
                    <span
                      className={`block text-[16px] font-bold ${o.soon ? "text-faint" : "text-ink"}`}
                    >
                      {o.title}
                    </span>
                    {o.desc && (
                      <span className="mt-0.5 block text-[13px] text-muted">{o.desc}</span>
                    )}
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
  );
}
