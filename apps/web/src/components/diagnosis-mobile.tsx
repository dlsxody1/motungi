"use client";

import { CheckCircleIcon, ChevronLeftIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import type { DiagnosisQuestion } from "@/data/diagnosis";

type Props = {
  question: DiagnosisQuestion;
  step: number;
  total: number;
  isMultiStep: boolean;
  selectedValues: string[];
  stepAnswer: string | string[] | undefined;
  hasSelection: boolean;
  onPick: (value: string, soon?: boolean) => void;
  onGoBack: () => void;
  onGoNext: () => void;
};

/**
 * 60초 진단 — 모바일 트리. 데스크탑과 마크업을 공유하지 않는다(스텝 레일 유무·카드
 * 크기가 달라 합치면 블록마다 삼항이 생긴다 — report-mobile/report-desktop과 같은 판단).
 */
export function DiagnosisMobile({
  question,
  step,
  total,
  isMultiStep,
  selectedValues,
  stepAnswer,
  hasSelection,
  onPick,
  onGoBack,
  onGoNext,
}: Props) {
  return (
    <div className="md:hidden" data-testid="diagnosis-mobile">
      <MobileScreen>
        <div className="flex flex-1 flex-col bg-bg">
          <SafeTop />
          <div className="flex items-center gap-3 px-6 py-2">
            <button
              onClick={onGoBack}
              aria-label="뒤로가기"
              className="tap-safe -ml-2 flex h-9 w-9 items-center justify-center text-ink"
            >
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

          {/* MobileScreen이 h-dvh 고정이라 넘치는 내용은 여기서 스크롤돼야 한다
              (안 그러면 작은 화면에서 마지막 선택지에 닿을 수 없다). */}
          <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-4">
            <p className="text-[13px] font-bold text-primary">{question.eyebrow}</p>
            <h1 className="mt-1.5 whitespace-pre-line text-[24px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
              {question.title}
            </h1>
            <p className="mt-2 text-[14px] text-muted">{question.hint}</p>

            <div className="mt-5 space-y-3">
              {question.options.map((o) => {
                const on = isMultiStep ? selectedValues.includes(o.value) : stepAnswer === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => onPick(o.value, o.soon)}
                    disabled={o.soon}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      o.soon
                        ? "border-line-alt bg-gray-100 text-faint"
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

            <div className="mt-auto pb-6" />

            <button
              onClick={onGoNext}
              disabled={!hasSelection}
              className="tap-safe mb-3 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary text-[16px] font-bold text-white disabled:opacity-40"
            >
              {step === total - 1 ? "결과 보기" : "다음"}
            </button>
          </div>
          <SafeBottom />
        </div>
      </MobileScreen>
    </div>
  );
}
