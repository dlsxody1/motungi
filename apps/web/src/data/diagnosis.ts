/**
 * 60초 진단 3문항 정의 — @motungi/core 의 DIAGNOSIS_STEPS(interests·timeSlot·energy) 순서와 맞춤.
 * app/diagnosis/page.tsx(컨테이너)와 components/diagnosis-mobile·diagnosis-desktop(뷰)이
 * 함께 참조하므로 두 레이어 아래(data/)에 둔다 — components는 app을 import할 수 없다
 * (import/no-restricted-paths, apps/web/.eslintrc.json).
 */
export type DiagnosisOption = { value: string; title: string; desc: string; soon?: boolean };
export type DiagnosisQuestion = {
  eyebrow: string;
  short: string;
  title: string;
  hint: string;
  options: DiagnosisOption[];
};

export const DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = [
  {
    eyebrow: "Q1. 관심사",
    short: "관심사",
    title: "퇴근하고 뭐 하고\n싶으세요?",
    hint: "끌리는 걸 하나 골라주세요. 그쪽부터 골라드려요.",
    options: [
      { value: "culture", title: "문화·공연", desc: "전시 · 공연 · 영화" },
      { value: "active", title: "운동·산책", desc: "러닝 · 걷기길 · 클래스" },
      { value: "food", title: "먹거리·마켓", desc: "맛집 · 야시장 · 플리마켓" },
      { value: "side_job", title: "동네 소일거리", desc: "짧게 · 부담 없이" },
    ],
  },
  {
    eyebrow: "Q2. 시간대",
    short: "시간대",
    title: "주로 언제\n시간이 나세요?",
    hint: "퇴근 후·주말 중 즐기기 좋은 걸 맞춰드려요.",
    options: [
      { value: "weekday_evening", title: "평일 저녁", desc: "퇴근 후 2~3시간" },
      { value: "weekend", title: "주말", desc: "토·일 오전/오후" },
      { value: "flexible", title: "유동적", desc: "그때그때 가능한 시간" },
    ],
  },
  {
    eyebrow: "Q3. 에너지",
    short: "오늘 에너지",
    title: "요즘 에너지는 어떠세요?",
    hint: "무리 없는 강도로 맞춰드려요.",
    options: [
      { value: "drained", title: "방전형", desc: "가볍게 · 앉아서 쉬듯" },
      { value: "moderate", title: "보통", desc: "적당한 활동까지 OK" },
      { value: "active", title: "활동형", desc: "몸 좀 움직이고 싶어요" },
    ],
  },
];

/** Q1(관심사)만 다중선택 — Q2·Q3는 단일선택 그대로(M-049). */
export const DIAGNOSIS_MULTI_SELECT_STEP = 0;
