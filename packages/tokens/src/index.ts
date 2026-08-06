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
    primary: "#d42f4a",
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
  /**
   * 중립 스케일 — 순중립 회색(chroma 0).
   *
   * 2026-08-06 웜 아이보리(베이지) 폐기. 배경은 순백이고, **위계는 배경색이 아니라
   * 테두리(lineAlt) + 그림자(shadow.card)가 만든다.** 예전엔 "베이지 배경 위 흰 카드"가
   * 위계였으나, 그 대비는 3.1:1도 안 되는 데다 웜 언더톤이 브랜드 로즈와 충돌했다.
   *
   * ⚠️ bg === surface === #ffffff 다. 배경색으로 면을 나누려 하지 마라 — 안 나뉜다.
   *    카드·박스는 반드시 `border-line-alt` + `shadow-card`를 함께 쓴다(DESIGN.md 박스 규칙).
   *    회색 면(gray100/gray200)은 **스켈레톤·호버·트랙처럼 "일시적 상태"에만** 쓴다.
   */
  neutral: {
    /** 앱 배경 — 순백. surface와 같은 값이며, 이제 배경/표면은 색으로 구분되지 않는다. */
    bg: "#ffffff",
    /** 카드/표면 흰색 */
    surface: "#ffffff",
    /**
     * 대체 표면 — 호버·비활성처럼 **잠깐 나타나는 면**. 흰 위에서 1.07:1로 아주 옅지만
     * 상태 변화 신호로는 충분하다(정지 상태의 위계용이 아님).
     */
    surfaceAlt: "#f7f7f8",
    /** 회색 100 — 스켈레톤·트랙 등 "빈 자리"를 나타내는 면. 흰 대비 1.13:1 */
    gray100: "#f1f1f3",
    /** 회색 200 — 회색 면 위 스켈레톤, 진행바 트랙처럼 한 단계 더 눌러야 할 때. 1.25:1 */
    gray200: "#e6e6e9",
    /** 최상위 텍스트 — 흰 대비 17.4:1 */
    ink: "#1c1a17",
    /** 본문 텍스트 — 흰 대비 9.5:1 */
    label: "#4a453e",
    /** 보조 텍스트 — 흰 대비 5.8:1(WCAG AA 본문). 읽는 텍스트는 이 이상 사용 */
    muted: "#6b645a",
    /** 흐린 텍스트 — 흰 대비 4.3:1. 장식·아이콘·큰 텍스트 전용(본문 금지) */
    faint: "#807970",
    /** 구분선(중립) — 웜 반투명에서 순중립으로 */
    line: "#1c1a1726",
    /** 옅은 구분선 — 카드 테두리 기본값. 흰 배경에서 카드를 띄우는 핵심 수단 */
    lineAlt: "#1c1a1714",
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

/**
 * 그림자.
 *
 * ⚠️ 베이지 폐기 이후 **그림자는 장식이 아니라 위계 그 자체다**(2026-08-06).
 * 흰 배경 위 흰 카드를 띄우는 유일한 수단이므로 card는 예전보다 진하다
 * (0.04/0.06 → 0.06/0.10). 웜 브라운 톤(46,42,36)도 순중립(28,26,23)으로 바꿨다 —
 * 베이지가 사라진 배경에서 갈색 그림자는 누렇게 보인다.
 */
export const shadow = {
  card: "0 1px 2px rgba(28, 26, 23, 0.06), 0 8px 24px rgba(28, 26, 23, 0.10)",
  hero: "0 12px 32px rgba(176, 52, 78, 0.18)",
  bottomBar: "0 -1px 0 rgba(28, 26, 23, 0.10)",
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
