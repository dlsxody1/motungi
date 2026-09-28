"use client";

import { draftToAnswers } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiagnosisDesktop } from "@/components/diagnosis-desktop";
import { DiagnosisMobile } from "@/components/diagnosis-mobile";
import { DIAGNOSIS_MULTI_SELECT_STEP, DIAGNOSIS_QUESTIONS } from "@/data/diagnosis";
import { useAppStore } from "@/store/useAppStore";

/**
 * A1 · 60초 진단(3문항) — 반응형.
 *
 * **이 파일은 컨테이너다** — 훅·상태·핸들러만 들고 마크업은 두 자식이 그린다
 * (질문 정의는 두 자식이 함께 참조하므로 `data/diagnosis.ts`에 있다).
 * `md:hidden`은 CSS라 모바일·데스크톱 트리가 **둘 다 마운트**된다(선례: `app/report/page.tsx`).
 */
export default function DiagnosisPage() {
  const router = useRouter();
  const saveAnswers = useAppStore((s) => s.setAnswers);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});

  const question = DIAGNOSIS_QUESTIONS[step]!;
  const total = DIAGNOSIS_QUESTIONS.length;
  const isMultiStep = step === DIAGNOSIS_MULTI_SELECT_STEP;
  const stepAnswer = answers[step];
  const selectedValues = isMultiStep && Array.isArray(stepAnswer) ? stepAnswer : [];
  const hasSelection = isMultiStep ? selectedValues.length > 0 : !!stepAnswer;

  const goNext = () => {
    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    // 마지막 질문 완료 → 진단 답변을 core 형태로 검증·매핑해 저장 후 스코어링(로딩)으로.
    const validated = draftToAnswers(answers);
    if (!validated) return; // 방어적 분기 — 자동 진행 UX 상 실제로는 도달하지 않음.
    saveAnswers(validated);
    router.push("/loading");
  };
  const pick = (value: string, soon?: boolean) => {
    if (soon) return;
    if (isMultiStep) {
      setAnswers((a) => {
        const cur = Array.isArray(a[DIAGNOSIS_MULTI_SELECT_STEP]) ? (a[DIAGNOSIS_MULTI_SELECT_STEP] as string[]) : [];
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        return { ...a, [DIAGNOSIS_MULTI_SELECT_STEP]: next };
      });
      return;
    }
    setAnswers((a) => ({ ...a, [step]: value }));
  };
  const goBack = () => {
    if (step === 0) router.push("/location");
    else setStep(step - 1);
  };

  return (
    <>
      <DiagnosisMobile
        question={question}
        step={step}
        total={total}
        isMultiStep={isMultiStep}
        selectedValues={selectedValues}
        stepAnswer={stepAnswer}
        hasSelection={hasSelection}
        onPick={pick}
        onGoBack={goBack}
        onGoNext={goNext}
      />
      <DiagnosisDesktop
        questions={DIAGNOSIS_QUESTIONS}
        question={question}
        step={step}
        total={total}
        isMultiStep={isMultiStep}
        selectedValues={selectedValues}
        stepAnswer={stepAnswer}
        answers={answers}
        hasSelection={hasSelection}
        onPick={pick}
        onGoBack={goBack}
        onGoNext={goNext}
      />
    </>
  );
}
