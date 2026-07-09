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

/** 핀 — 단순한 물방울 + 점. 위치/하이퍼로컬 */
export function PinIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 21c4.5-4.2 7-7.5 7-11a7 7 0 1 0-14 0c0 3.5 2.5 6.8 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </Base>
  );
}

/** 타깃 — 원픽/정확히 골라줌. 동심원 + 중심점 */
export function TargetIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 반짝임 — 진단/추천. 4점 별 하나 + 작은 하나 */
export function SparkIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 4c.4 3.2 1.4 4.2 4.6 4.6-3.2.4-4.2 1.4-4.6 4.6-.4-3.2-1.4-4.2-4.6-4.6C10.6 8.2 11.6 7.2 12 4Z" />
      <path d="M17.5 14.5c.2 1.4.7 1.9 2.1 2.1-1.4.2-1.9.7-2.1 2.1-.2-1.4-.7-1.9-2.1-2.1 1.4-.2 1.9-.7 2.1-2.1Z" />
    </Base>
  );
}

/** 번개 — 마찰 제로/빠름. 단순한 볼트 */
export function FlashIcon(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M13 3 5.5 13H11l-1 8 8.5-11H13l1-7Z" />
    </Base>
  );
}

/** 나침반 — 동네 리포트/탐색 */
export function CompassMiniIcon(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M15 9l-1.6 4.4L9 15l1.6-4.4L15 9Z" />
    </Base>
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
