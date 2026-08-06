/**
 * 모바일 테마 브리지 — @motungi/tokens(웹·앱 공용 소스)를 RN에서 쓰기 편한
 * 플랫한 형태로 재노출한다. 색·간격·radius 값은 웹과 100% 동일.
 */
import { color, radius, space } from "@motungi/tokens";

export const C = {
  primary: color.brand.primary,
  primaryDeep: color.brand.primaryDeep,
  tint: color.brand.tint,
  sun: color.brand.sun,
  purple: color.brand.purple,
  mint: color.brand.mint,
  mintTint: color.brand.mintTint,

  /**
   * ⚠️ bg === surface === #ffffff (2026-08-06 베이지 폐기).
   * 배경색으로 면을 나눌 수 없다 — 카드는 borderColor: C.lineAlt + cardShadow로 띄운다.
   * surfaceAlt는 "잠깐 눌린 면"(pressed/비활성)이고, 정지 상태의 회색 면은 gray100/200이다.
   */
  bg: color.neutral.bg,
  surface: color.neutral.surface,
  surfaceAlt: color.neutral.surfaceAlt,
  gray100: color.neutral.gray100,
  gray200: color.neutral.gray200,
  ink: color.neutral.ink,
  label: color.neutral.label,
  muted: color.neutral.muted,
  faint: color.neutral.faint,
  line: color.neutral.line,
  lineAlt: color.neutral.lineAlt,

  white: color.staticWhite,
} as const;

export const S = space;
export const R = radius;

/** 타이포 프리셋 — RN Text 스타일. 웹 typography 스케일과 맞춤. */
export const T = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: "800" as const, letterSpacing: -0.6 },
  h1: { fontSize: 24, lineHeight: 31, fontWeight: "800" as const, letterSpacing: -0.4 },
  h2: { fontSize: 21, lineHeight: 28, fontWeight: "800" as const, letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 24, fontWeight: "700" as const },
  body: { fontSize: 15, lineHeight: 23, fontWeight: "400" as const },
  bodySm: { fontSize: 14, lineHeight: 22, fontWeight: "400" as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
} as const;

/**
 * 그림자 — iOS/Android 공통 근사치.
 * 베이지 폐기 후 흰 배경 위 흰 카드를 띄우는 주 수단이라 예전보다 진하다(0.08 → 0.12).
 * 색도 웜 브라운에서 순중립으로 — 베이지 없는 배경에서 갈색 그림자는 누렇게 보인다.
 */
export const cardShadow = {
  shadowColor: "#1c1a17",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
