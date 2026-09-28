"use client";

import Link from "next/link";
import { CheckCircleIcon, CheckIcon, CloseIcon, TimerIcon } from "@/components/icons";
import { WebLogo } from "@/components/web-shell";
import type { DiagnosisQuestion } from "@/data/diagnosis";

type Props = {
  questions: DiagnosisQuestion[];
  question: DiagnosisQuestion;
  step: number;
  total: number;
  isMultiStep: boolean;
  selectedValues: string[];
  stepAnswer: string | string[] | undefined;
  answers: Record<number, string | string[]>;
  hasSelection: boolean;
  onPick: (value: string, soon?: boolean) => void;
  onGoBack: () => void;
  onGoNext: () => void;
};

/**
 * 60초 진단 — 데스크탑 트리. 모바일과 마크업을 공유하지 않는다(스텝 레일이 데스크탑에만
 * 있고 카드 크기·타이포가 달라 합치면 블록마다 삼항이 생긴다 — report-mobile/report-desktop과
 * 같은 판단).
 */
export function DiagnosisDesktop({
  questions,
  question,
  step,
  total,
  isMultiStep,
  selectedValues,
  stepAnswer,
  answers,
  hasSelection,
  onPick,
  onGoBack,
  onGoNext,
}: Props) {
  return (
    <div className="hidden min-h-dvh flex-col bg-bg md:flex" data-testid="diagnosis-desktop">
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
          className="h-full bg-primary transition-all duration-300"
          /* 진행바는 솔리드 — sun(#e8834a)은 흰 글씨를 못 얹는 장식색이고,
             그라데이션은 랜딩 전용이다. 진행률은 길이가 말하지 색이 말하지 않는다. */
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 gap-14 px-16 pb-15 pt-13">
        {/* 스텝 레일 */}
        <aside className="w-[264px] shrink-0 self-start rounded-2xl bg-surface p-6 shadow-web">
          <p className="text-[13px] font-extrabold tracking-[0.06em] text-primary">
            STEP {step + 1} / {total}
          </p>
          <div className="mt-4 space-y-1">
            {questions.map((qq, i) => {
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
                        {Array.isArray(answers[i])
                          ? (answers[i] as string[])
                              .map((v) => qq.options.find((o) => o.value === v)?.title)
                              .filter(Boolean)
                              .join(", ")
                          : qq.options.find((o) => o.value === answers[i])?.title}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 질문 영역 */}
        <div className="max-w-[720px] flex-1">
          <p className="text-[15px] font-semibold text-primary">{question.eyebrow}</p>
          <h1 className="mt-2 whitespace-pre-line text-[34px] font-extrabold leading-[1.28] tracking-[-0.025em] text-ink">
            {question.title}
          </h1>
          <p className="mt-2.5 text-[16px] leading-relaxed text-muted">{question.hint}</p>

          <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {question.options.map((o) => {
              const on = isMultiStep ? selectedValues.includes(o.value) : stepAnswer === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => onPick(o.value, o.soon)}
                  disabled={o.soon}
                  className={`relative flex items-center gap-3.5 rounded-2xl border p-[22px] text-left transition-all ${
                    o.soon
                      ? "cursor-not-allowed border-line-alt bg-gray-100 text-faint"
                      : on
                        ? "border-[1.5px] border-primary bg-surface shadow-web"
                        : "border-[1.5px] border-transparent bg-surface hover:border-line"
                  }`}
                >
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
              onClick={onGoBack}
              className="flex h-[52px] items-center rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold text-label hover:border-faint"
            >
              이전
            </button>
            <div className="flex-1" />
            <button
              onClick={onGoNext}
              disabled={!hasSelection}
              className="flex h-[52px] w-[220px] items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white transition-colors hover:bg-primary-deep disabled:opacity-40"
            >
              {step === total - 1 ? "결과 보기" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
