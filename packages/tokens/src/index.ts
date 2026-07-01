/**
 * 디자인 토큰 — 모퉁이 Corner · 트와일라잇 로즈(Twilight Rose) 팔레트.
 *
 * Figma 디자인시스템(원티드 디자인 시스템 기반)에서 추출한 값을 단일 소스로 둔다.
 * 웹(Next.js)은 이 토큰을 CSS 변수/Tailwind로, 앱(Expo/RN)은 style 객체로 참조한다.
 * 값은 플랫폼 무관한 primitive(문자열/숫자)로만 유지한다.
 *
 * 접근성(§8): 히트타깃 ≥44px, 본문 대비 WCAG AA.
 */

/** 간격 스케일(px) — 8pt 그리드 기반 */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 56,
  "6xl": 80,
} as const;

/** 모서리 반경(px) */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  pill: 999,
} as const;

/**
 * 색상 팔레트.
 * brand: 트와일라잇 로즈 계열 / neutral: 웜 그레이(오렌지 언더톤) / semantic: 상태색.
 */
export const color = {
  brand: {
    /** 메인 로즈 — 주요 CTA·강조 */
    primary: "#e25067",
    /** 진한 로즈 — hover/press, 진지한 강조 */
    primaryDeep: "#b0344e",
    /** 연한 로즈 틴트 — 배경·칩 */
    tint: "#fbe8ec",
    /** 선셋 오렌지 — 히어로 그라데이션 */
    sun: "#f2a06a",
    /** 퍼플 — 보조 강조 */
    purple: "#6e4e9c",
    /** 민트 — 지원금/정책 강조 */
    mint: "#1e6e64",
    /** 민트 틴트 */
    mintTint: "#e0f0ec",
  },
  neutral: {
    /** 앱 배경(웜 아이보리) */
    bg: "#f4f0eb",
    /** 카드/표면 흰색 */
    surface: "#ffffff",
    /** 대체 표면(살짝 어두운 아이보리) */
    surfaceAlt: "#f1ede6",
    /** 최상위 텍스트 */
    ink: "#1c1a17",
    /** 본문 텍스트 */
    label: "#4a453e",
    /** 보조 텍스트 */
    muted: "#8a8378",
    /** 흐린 텍스트/플레이스홀더 */
    faint: "#b4ada1",
    /** 구분선(중립) */
    line: "#6e4e3c2e",
    /** 옅은 구분선 */
    lineAlt: "#6e4e3c17",
  },
  semantic: {
    negative: "#ff4242",
    /** 소셜(구글 등) 참고색 */
    google: "#4285f4",
    kakao: "#fee500",
  },
  /** 항상 흰/검 */
  staticWhite: "#ffffff",
  staticBlack: "#000000",
} as const;

/** 폰트 패밀리 */
export const fontFamily = {
  /** 본문·UI (Pretendard 우선, 시스템 한글 산세리프 폴백) */
  sans: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
} as const;

/** 폰트 두께 */
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

/**
 * 타이포그래피 스케일. size/lineHeight 는 px, tracking 은 em.
 */
export const typography = {
  display: { size: 30, lineHeight: 39, weight: fontWeight.extrabold, tracking: "-0.02em" },
  heading1: { size: 22, lineHeight: 30, weight: fontWeight.bold, tracking: "-0.01em" },
  heading2: { size: 19, lineHeight: 27, weight: fontWeight.bold, tracking: "-0.01em" },
  headline1: { size: 18, lineHeight: 26, weight: fontWeight.semibold, tracking: "-0.01em" },
  headline2: { size: 17, lineHeight: 24, weight: fontWeight.semibold, tracking: "0em" },
  body1: { size: 15, lineHeight: 23, weight: fontWeight.regular, tracking: "0em" },
  body2: { size: 14, lineHeight: 22, weight: fontWeight.regular, tracking: "0em" },
  label: { size: 13, lineHeight: 18, weight: fontWeight.medium, tracking: "0em" },
  caption: { size: 11, lineHeight: 16, weight: fontWeight.medium, tracking: "0.02em" },
} as const;

/** 그림자 */
export const shadow = {
  card: "0 1px 2px rgba(46, 42, 36, 0.04), 0 8px 24px rgba(46, 42, 36, 0.06)",
  hero: "0 12px 32px rgba(176, 52, 78, 0.18)",
  bottomBar: "0 -1px 0 rgba(110, 78, 60, 0.09)",
} as const;

/** 접근성 최소 히트타깃(px) — §8 */
export const MIN_HIT_TARGET = 44;

export type Tokens = {
  space: typeof space;
  radius: typeof radius;
  color: typeof color;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  fontWeight: typeof fontWeight;
  shadow: typeof shadow;
};

export const tokens: Tokens = {
  space,
  radius,
  color,
  typography,
  fontFamily,
  fontWeight,
  shadow,
};
