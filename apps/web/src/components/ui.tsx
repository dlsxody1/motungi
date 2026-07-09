/**
 * 모퉁이 Corner — 공용 UI 프리미티브.
 * 모바일-퍼스트 반응형: 폰에선 화면을 꽉 채우고, 넓은 화면에선 앱 폭(420px)으로
 * 가운데 정렬해 앱과 동일한 레이아웃을 유지한다.
 */
import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";

/* ────────────────────────────────────────────────────────────
 * 타이포 스케일 (DESIGN.md · @motungi/tokens 와 1:1)
 *  페이지가 즉흥 text-[Npx] 를 쓰지 않도록 역할별 프리셋을 노출한다.
 *  size/leading/weight/tracking 을 한 클래스로 묶어 위계를 한 곳에서 보장.
 *  heroDisplay 는 데스크탑 marketing 히어로 전용(스케일 밖 대형 제목).
 * ──────────────────────────────────────────────────────────── */
export const text = {
  heroDisplay: "text-[clamp(2.25rem,4vw,3.5rem)] font-extrabold leading-[1.14] tracking-[-0.035em]",
  display: "text-[30px] font-extrabold leading-[39px] tracking-[-0.02em]",
  heading1: "text-[22px] font-bold leading-[30px] tracking-[-0.01em]",
  heading2: "text-[19px] font-bold leading-[27px] tracking-[-0.01em]",
  headline1: "text-[18px] font-semibold leading-[26px] tracking-[-0.01em]",
  headline2: "text-[17px] font-semibold leading-[24px]",
  body1: "text-[15px] font-normal leading-[23px]",
  body2: "text-[14px] font-normal leading-[22px]",
  label: "text-[13px] font-medium leading-[18px]",
  caption: "text-[11px] font-medium leading-[16px] tracking-[0.02em]",
} as const;

/** 타이포 프리셋을 적용하는 텍스트 요소. 기본 색은 상속(부모에서 지정). */
export function Txt({
  as: Tag = "p",
  preset = "body1",
  className = "",
  children,
}: {
  as?: ElementType;
  preset?: keyof typeof text;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`${text[preset]} ${className}`}>{children}</Tag>;
}

/* ────────────────────────────────────────────────────────────
 * 화면 컨테이너 (반응형)
 *  - 모바일: 100dvh 꽉 채움
 *  - 데스크톱: max-w-[420px] 가운데 정렬 + 은은한 경계
 * ──────────────────────────────────────────────────────────── */
export function MobileScreen({
  children,
  tone = "bg",
}: {
  children: ReactNode;
  /** 배경 톤 — A1 히어로처럼 컬러 배경이 필요하면 지정 */
  tone?: "bg" | "surface";
}) {
  const bg = tone === "surface" ? "bg-surface" : "bg-bg";
  return (
    <div className="flex min-h-dvh justify-center bg-surface-alt/60 sm:py-8">
      <div
        className={`flex min-h-dvh w-full max-w-[420px] flex-col ${bg} sm:min-h-[calc(100dvh-4rem)] sm:rounded-[28px] sm:shadow-card`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * 안전영역(노치/홈바) 여백만 확보하는 헬퍼.
 * 실제 상태바·홈 인디케이터는 OS가 그리므로 그리지 않는다.
 */
export function SafeTop() {
  return <div className="h-[max(env(safe-area-inset-top),12px)] shrink-0" />;
}
export function SafeBottom() {
  return <div className="h-[max(env(safe-area-inset-bottom),8px)] shrink-0" />;
}

/* ────────────────────────────────────────────────────────────
 * 버튼
 * ──────────────────────────────────────────────────────────── */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "lg" | "md";
  block?: boolean;
};

export function Button({
  variant = "primary",
  size = "lg",
  block = true,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-bold tap-safe transition-colors active:scale-[0.99] disabled:opacity-40";
  const sizes = {
    lg: "h-[52px] rounded-xl px-6 text-[16px]",
    md: "h-[44px] rounded-lg px-4 text-[14px]",
  };
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-deep",
    secondary: "bg-tint text-primary-deep hover:bg-tint/70",
    ghost: "bg-transparent text-muted hover:text-label",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
 * 칩 / 배지
 * ──────────────────────────────────────────────────────────── */
export function Chip({
  active = false,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`inline-flex h-[34px] items-center gap-1 rounded-pill border px-3.5 text-[13px] font-semibold transition-colors ${
        active
          ? "border-primary bg-primary/8 text-primary"
          : "border-line bg-surface text-label hover:border-faint"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** 카테고리 태그 (예: "동네 문화·공연") */
export function Tag({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "mint" | "muted";
}) {
  const tones = {
    brand: "bg-primary text-white",
    mint: "bg-mint text-white",
    muted: "bg-surface-alt text-muted",
  };
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-[6px] px-2 text-[11px] font-bold tracking-tight ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
 * 카드
 * ──────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-surface shadow-card ${className}`}>{children}</div>
  );
}

/* ────────────────────────────────────────────────────────────
 * 로고
 * ──────────────────────────────────────────────────────────── */
export function Logo({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="grid place-items-center rounded-[8px] font-black"
        style={{
          width: size,
          height: size,
          background: onDark ? "#ffffff" : "#e25067",
          color: onDark ? "#e25067" : "#ffffff",
          fontSize: size * 0.5,
        }}
      >
        모
      </span>
      <span
        className={`text-[17px] font-extrabold tracking-tight ${onDark ? "text-white" : "text-ink"}`}
      >
        모퉁이 <span className="font-semibold opacity-70">Corner</span>
      </span>
    </span>
  );
}
