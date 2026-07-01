/**
 * 디자인 토큰 — 자리만 잡아둔 스켈레톤.
 * 값(색·타이포·간격)은 디자인 확정 단계에서 채운다. 지금은 웹·앱이
 * 동일 소스에서 토큰을 import 하는 구조만 검증한다.
 *
 * 접근성 제약(§8)은 채울 때 반영: 히트타깃 ≥44px, WCAG AA 대비.
 */

export const space = {
  // 예: xs: 4, sm: 8, md: 16 ... (미정)
} as const;

export const color = {
  // 라이트/다크 (미정)
} as const;

export const radius = {} as const;

export const typography = {} as const;

/** 접근성 최소 히트타깃(px) — §8 */
export const MIN_HIT_TARGET = 44;

export type Tokens = {
  space: typeof space;
  color: typeof color;
  radius: typeof radius;
  typography: typeof typography;
};
