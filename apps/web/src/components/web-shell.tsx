/**
 * 모퉁이 Corner — 데스크탑(웹) 공용 셸.
 * 피그마 데스크탑 목업 기준: 상단 스티키 네비 + 1280px 콘텐츠 컨테이너 + 다크 푸터.
 * 모바일에서는 각 페이지가 별도의 MobileScreen 레이아웃을 쓰고, 이 셸은 `md:` 이상에서만 렌더된다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { BookmarkIcon, ChevronDownIcon, LocationIcon, SearchIcon } from "./icons";

/* ────────────────────────────────────────────────────────────
 * 로고 (그라데이션 마크 + 워드마크)
 * ──────────────────────────────────────────────────────────── */
export function WebLogo({
  size = 34,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span
        className="grid shrink-0 place-items-center rounded-[10px]"
        style={{
          width: size,
          height: size,
          background:
            "linear-gradient(152deg, var(--color-sun), var(--color-primary) 58%, var(--color-purple))",
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 20V6h14"
            stroke="#fff"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.5" cy="16" r="2.4" fill="#fff" />
        </svg>
      </span>
      <span
        className={`text-[20px] font-extrabold tracking-[-0.01em] ${
          onDark ? "text-white" : "text-ink-dark"
        }`}
      >
        모퉁이 <span className="text-[15px] font-semibold opacity-70">Corner</span>
      </span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────
 * 상단 네비게이션 (스티키)
 *  - variant "marketing": 검색 · 로그인 · 시작하기 CTA (랜딩)
 *  - variant "app":        동네 pill · 북마크 · 아바타 (앱 내부)
 * ──────────────────────────────────────────────────────────── */
type NavKey = "home" | "explore" | "report" | "saved" | "my";

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "home", label: "홈", href: "/" },
  { key: "explore", label: "탐색", href: "/explore" },
  { key: "report", label: "동네 리포트", href: "/report" },
  { key: "saved", label: "보관함", href: "/saved" },
];

export function TopNav({
  active,
  variant = "app",
  dongName,
  userName,
}: {
  active?: NavKey;
  variant?: "marketing" | "app";
  /** 앱 variant 동네 pill 표기. 없으면 "동네 설정". */
  dongName?: string;
  /** 앱 variant 아바타 표기 이름(첫 글자만 렌더). 없으면 게스트. */
  userName?: string;
}) {
  const dongLabel = dongName ?? "동네 설정";
  const avatarChar = userName ? userName.slice(0, 1) : "게";
  return (
    <header className="sticky top-0 z-50 hidden h-[72px] items-center justify-between border-b border-line-alt bg-surface px-10 md:flex">
      <div className="flex items-center gap-9">
        <WebLogo />
        <nav className="flex items-center gap-7">
          {NAV_ITEMS.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              className={`text-[15px] font-semibold transition-colors hover:text-ink-dark ${
                active === it.key ? "text-ink-dark" : "text-nav-link"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </div>

      {variant === "marketing" ? (
        <div className="flex items-center gap-5">
          <button className="grid size-8 place-items-center text-nav-link" aria-label="검색">
            <SearchIcon size={22} />
          </button>
          <Link href="/report" className="text-[15px] font-semibold text-nav-link hover:text-ink-dark">
            로그인
          </Link>
          <Link
            href="/location"
            className="flex h-10 items-center rounded-[11px] bg-primary px-[18px] text-[14px] font-bold text-white transition-colors hover:bg-primary-deep"
          >
            시작하기
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-[18px]">
          <Link
            href="/location"
            className="flex items-center gap-1.5 rounded-pill border border-primary/28 bg-tint px-3.5 py-2 text-[13px] font-semibold text-primary-deep"
            aria-label="동네 변경"
          >
            <LocationIcon size={16} />
            {dongLabel}
            <ChevronDownIcon size={16} />
          </Link>
          <Link href="/saved" className="grid size-8 place-items-center text-nav-link" aria-label="보관함">
            <BookmarkIcon size={22} />
          </Link>
          <Link
            href="/my"
            className="grid size-9 place-items-center rounded-full bg-tint text-[13px] font-bold text-primary-deep"
            aria-label="마이"
          >
            {avatarChar}
          </Link>
        </div>
      )}
    </header>
  );
}

/* ────────────────────────────────────────────────────────────
 * 다크 푸터
 * ──────────────────────────────────────────────────────────── */
export function SiteFooter() {
  return (
    <footer className="hidden bg-ink-dark px-10 py-10 md:block lg:px-16">
      <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-8 md:flex-row">
        <div className="max-w-[520px]">
          <WebLogo size={28} onDark />
          <p className="mt-4 text-[12px] leading-[1.7] text-white/65">
            모퉁이는 공공·제휴 정보를 큐레이션해 주최·출처 채널로 연결할 뿐, 예약·주최·거래의 당사자가 아니에요.
            표시된 참가비·일정은 예상치이며 실제와 다를 수 있어요.
          </p>
        </div>
        <div className="flex gap-9">
          <div>
            <p className="text-[13px] font-semibold text-white/85">서비스 소개</p>
            <ul className="mt-3 space-y-2 text-[13px] text-white/65">
              <li>이용약관</li>
              <li>개인정보 처리방침</li>
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white/85">앱 다운로드</p>
            <ul className="mt-3 space-y-2 text-[13px] text-white/65">
              <li>App Store</li>
              <li>Google Play</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────
 * 데스크탑 페이지 셸 — 네비 + (min-h) 본문 + 푸터
 *  본문은 필요에 따라 컨테이너를 직접 감싸 쓸 수 있게 그대로 노출한다.
 * ──────────────────────────────────────────────────────────── */
export function DesktopShell({
  children,
  active,
  variant = "app",
  footer = true,
  dongName,
  userName,
}: {
  children: ReactNode;
  active?: NavKey;
  variant?: "marketing" | "app";
  footer?: boolean;
  dongName?: string;
  userName?: string;
}) {
  return (
    <div className="hidden min-h-dvh flex-col bg-bg md:flex">
      <TopNav active={active} variant={variant} dongName={dongName} userName={userName} />
      <main className="flex-1">{children}</main>
      {footer && <SiteFooter />}
    </div>
  );
}

/** 1280px 중앙 컨테이너 — 본문 섹션에서 사용 */
export function WebContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] px-10 ${className}`}>{children}</div>
  );
}
