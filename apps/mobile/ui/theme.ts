/**
 * 모바일 테마 브리지 — @motungi/tokens(웹·앱 공용 소스)를 RN에서 쓰기 편한
 * 플랫한 형태로 재노출한다. 색·간격·radius 값은 웹과 100% 동일.
 */
import { color, radius, shadow, space, typography } from "@motungi/tokens";

export const C = {
  primary: color.brand.primary,
  primaryDeep: color.brand.primaryDeep,
  tint: color.brand.tint,
  /** 딥로즈 — 노을의 붉은 끝. 가격·마감 등 진짜 강조에만(CTA 아님) */
  rose: color.brand.rose,
  /** ⚠️ sun·coral은 흰 글씨를 못 얹는다(1.99:1 / 3.04:1). 면·보더·아이콘 전용 */
  sun: color.brand.sun,
  coral: color.brand.coral,
  /** 남보라 — 노을의 가장 깊은 끝. 흰 글씨 최저 12.32:1 */
  duskDeep: color.brand.duskDeep,
  /** @deprecated 옛 차가운 퍼플. duskDeep을 가리킨다 — 옮기는 대로 지울 것 */
  purple: color.brand.purple,
  mint: color.brand.mint,
  mintTint: color.brand.mintTint,

  /**
   * ⚠️ bg(#fafaf9) ↔ surface(#ffffff)는 1.04:1로 차이가 미미하다(2026-08-06 베이지 폐기 후
   * 순백 일색이던 것을 반 단계 눌러 되살린 값). 배경만으로 면을 나누려 하지 마라 —
   * 카드는 여전히 borderColor: C.lineAlt + cardShadow로 띄우고 배경은 거들 뿐이다.
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

/** 타이포 프리셋 — RN Text 스타일. 웹 대비 +2px 스케일(의도된 차이, DESIGN.md 참조). 값 출처는 tokens.typography.mobile. */
export const T = typography.mobile;

/**
 * 그림자 — iOS/Android 공통 근사치. shadowOffset/elevation 형태는 웹 box-shadow와 달라
 * 변환이 불가피하지만 값 출처는 tokens.shadow.mobileCard.
 */
export const cardShadow = {
  shadowColor: shadow.mobileCard.color,
  shadowOpacity: shadow.mobileCard.opacity,
  shadowRadius: shadow.mobileCard.radius,
  shadowOffset: shadow.mobileCard.offset,
  elevation: shadow.mobileCard.elevation,
} as const;
