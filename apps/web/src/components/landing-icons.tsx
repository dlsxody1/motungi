/**
 * 랜딩 전용 아이콘 — 네이버/토스감 미니멀 라인.
 * 프로젝트 기본 아이콘(icons.tsx, stroke 2 / lucide풍)과 의도적으로 구분한다.
 * strokeWidth 1.6, 둥근 캡, 형태를 최대한 단순화해 "바이브코딩 티"를 지운다.
 * 모노톤(currentColor) — 색은 부모 타일에서 지정.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 돋보기 — 검색 */
export function SearchMiniIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m16 16 3.5 3.5" />
    </Base>
  );
}

/** 체크 원 — 로그인 없이 시작 */
export function CheckMiniIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" />
    </Base>
  );
}

/** 화살표 — CTA. 얇고 긴 형태 */
export function ArrowMiniIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5 12h13" />
      <path d="m12.5 6 6 6-6 6" />
    </Base>
  );
}
