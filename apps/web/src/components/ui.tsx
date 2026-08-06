/**
 * 모퉁이 Corner — 공용 UI 프리미티브.
 * 모바일-퍼스트 반응형: 폰에선 화면을 꽉 채우고, 넓은 화면에선 앱 폭(420px)으로
 * 가운데 정렬해 앱과 동일한 레이아웃을 유지한다.
 */
import Image from "next/image";
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
    // 데스크톱 게터(앱 프레임 바깥 여백) — 프레임이 흰색이 됐으므로 게터는 확실한
    // 회색이어야 프레임이 "떠 있는 화면"으로 읽힌다. 예전 bg-surface-alt/60은
    // 베이지였기에 대비가 났지만 지금 값으로는 흰 위 흰이 된다.
    <div className="flex min-h-dvh justify-center bg-gray-100 sm:py-8">
      {/*
       * 높이는 min-h가 아니라 **h-dvh(고정)** 다.
       *
       * min-h-dvh였을 땐 내용이 화면보다 길면 프레임 자체가 늘어났다. 그러면 안쪽
       * overflow-y-auto가 넘칠 일이 없어 스크롤이 페이지 전체에서 일어나고,
       * 하단 내비(BottomNav)가 화면 아래가 아니라 **문서 맨 끝**에 붙는다 —
       * 스크롤을 끝까지 내려야 탭이 보이던 이유가 이것이다.
       * 고정 높이라야 자식의 flex-1 + overflow-y-auto가 실제로 스크롤 영역이 되고,
       * 내비는 프레임 바닥에 고정된다(앱과 같은 동작).
       */}
      <main
        className={`flex h-dvh w-full max-w-[420px] flex-col overflow-hidden ${bg} sm:h-[calc(100dvh-4rem)] sm:rounded-[28px] sm:shadow-card`}
      >
        {children}
      </main>
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
      aria-pressed={active}
      className={`inline-flex h-[34px] items-center gap-1 rounded-pill border px-3.5 text-[13px] font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-white"
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
    // 흰 배경에서 뱃지가 면으로 읽히려면 gray-100이어야 한다(surface-alt는 호버용 1.07:1).
    muted: "bg-gray-100 text-muted",
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

/**
 * 정보/확인 박스 — 흰 배경 + 통일된 border/shadow. 포인트 컬러는 아이콘에만 절제해서 쓴다.
 * 선택 확인·안내처럼 "상태를 알려주는" 한 줄 박스에 사용(핑크 틴트 배경 대신 이걸로 통일).
 * icon의 색은 호출부가 className으로 지정(기본 뉴트럴). 강조가 필요하면 text-mint 권장 — 빨강은 지양.
 */
export function InfoBox({
  icon,
  children,
  className = "",
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-line-alt bg-surface px-4 py-3 shadow-card ${className}`}
    >
      {icon != null && <span className="shrink-0 text-mint">{icon}</span>}
      <span className="min-w-0 flex-1 text-[14px] text-label">{children}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * 스켈레톤
 *  로딩 중 "무엇이 어디에 올지"를 미리 보여주는 회색 블록.
 *  스피너와 달리 레이아웃을 선점하므로 데이터가 도착해도 화면이 튀지 않는다.
 *  ⚠️ 스켈레톤 자체는 스크린리더에 무의미하다 — 감싸는 컨테이너에
 *     aria-busy="true" + 상태 문구(sr-only)를 두는 건 호출부 책임.
 * ──────────────────────────────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  // ⚠️ bg-gray-100이어야 한다. 베이지 폐기(2026-08-06)로 배경·카드가 모두 흰색이 되면서
  // 예전 값(bg-surface-alt)은 흰 위 1.07:1로 사실상 안 보인다 — animate-pulse가
  // "아무것도 없는 화면"이 되는 회귀. 스켈레톤은 빈 자리를 보여주는 게 일이므로
  // 흰 대비가 확실한 gray-100(1.13:1)을 쓴다.
  return <div aria-hidden className={`animate-pulse rounded-md bg-gray-100 ${className}`} />;
}

/* ────────────────────────────────────────────────────────────
 * 로고
 * ──────────────────────────────────────────────────────────── */
export function Logo({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/brand/app-icon-128-rounded.png"
        alt="모퉁이"
        width={size}
        height={size}
        className="rounded-[8px] shadow-sm"
        style={{ width: size, height: size }}
        priority
      />
      <span
        className={`font-extrabold tracking-tight ${onDark ? "text-white" : "text-ink"}`}
        style={{ fontSize: Math.round(size * 0.56) }}
      >
        모퉁이
      </span>
    </span>
  );
}
