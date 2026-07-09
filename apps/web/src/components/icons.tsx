/**
 * 아이콘 세트 — 라인(stroke) 스타일, 24px 그리드.
 * 디자인시스템의 아이콘을 인라인 SVG로 구현. `currentColor` 상속으로
 * 텍스트/버튼 색을 그대로 따른다. size 로 픽셀 크기 조절.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function LocationIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function CheckCircleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Svg>
  );
}

export function BookmarkIcon({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p} fill={filled ? "currentColor" : "none"}>
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />
    </Svg>
  );
}

export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </Svg>
  );
}

export function RefreshIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </Svg>
  );
}

export function ExternalLinkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Svg>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </Svg>
  );
}

export function CompassIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </Svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  );
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function FireIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c1 3-1 4-1 6a3 3 0 1 0 5 2c1 2 1.5 3.5 1.5 5A5.5 5.5 0 1 1 8 12c.5-2 2-3.5 4-9Z" />
    </Svg>
  );
}

export function SparkleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </Svg>
  );
}

export function BoltIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </Svg>
  );
}

export function SavingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 9a2 2 0 0 0 0-4c-1 0-1.6.7-1.9 1.4A7 7 0 0 0 4 11v3l-2 1v3h4l1-2a7 7 0 0 0 8 0v2h3v-4a7 7 0 0 0-1-6.5" />
      <circle cx="8.5" cy="10.5" r="0.5" fill="currentColor" />
    </Svg>
  );
}

export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Svg>
  );
}

export function ShieldIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
    </Svg>
  );
}

export function TimerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9" />
      <path d="M9 2h6" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function InsightsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19V5" />
      <path d="M4 15l5-5 4 3 6-7" />
      <path d="M19 6h.01" />
    </Svg>
  );
}
