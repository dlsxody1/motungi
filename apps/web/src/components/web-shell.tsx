/**
 * 모퉁이 Corner — 데스크탑(웹) 공용 셸.
 * 피그마 데스크탑 목업 기준: 상단 스티키 네비 + 1280px 콘텐츠 컨테이너 + 다크 푸터.
 * 모바일에서는 각 페이지가 별도의 MobileScreen 레이아웃을 쓰고, 이 셸은 `md:` 이상에서만 렌더된다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { NeighborhoodMenu } from "./neighborhood-menu";

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
          /* 로고는 브랜드 마크라 토큰을 따라가지 않는다 — 원래의 노을 3색을 리터럴로 고정한다.
             (CTA 색을 보라로 바꿀 때 로고까지 같이 변해버린 사고가 있었다.) */
          background: "linear-gradient(152deg, #f2a06a, #d42f4a 58%, #6e4e9c)",
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
        className={`font-wordmark text-[23px] leading-none tracking-[0.01em] ${
          onDark ? "text-white" : "text-ink-dark"
        }`}
      >
        모퉁이
      </span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────
 * 상단 네비게이션 (스티키)
 *  - variant "marketing": 검색 · 로그인 · 시작하기 CTA (랜딩)
 *  - variant "app":        동네 pill · 로그인/아바타 (앱 내부)
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
  hideNeighborhood = false,
}: {
  active?: NavKey;
  variant?: "marketing" | "app";
  /** 앱 variant 동네 pill 표기. 없으면 "동네 설정". */
  dongName?: string;
  /** 앱 variant 아바타 표기 이름(첫 글자만 렌더). 없으면 게스트. */
  userName?: string;
  /**
   * 헤더의 동네 pill을 숨긴다.
   *
   * 탐색 화면은 사이드바에 "내 동네"(앵커 변경)와 "지역"(결과 내 필터)을 나란히 두는데,
   * 헤더에도 같은 모양의 동네 pill이 있으면 **생김새는 같고 하는 일은 다른 컨트롤이
   * 한 화면에 둘** 있게 된다(하나는 재조회, 하나는 클라 필터). 앵커 변경 진입점을
   * 사이드바 한 곳으로 모으고 헤더는 비운다.
   */
  hideNeighborhood?: boolean;
}) {
  const dongLabel = dongName ?? "동네 설정";
  return (
    <header className="sticky top-0 z-50 hidden h-[72px] items-center justify-between border-b border-line-alt bg-surface px-10 md:flex">
      <div className="flex items-center gap-9">
        <WebLogo />
        <nav className="flex items-center gap-7">
          {NAV_ITEMS.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              aria-current={active === it.key ? "page" : undefined}
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
          <Link href="/my" className="text-[15px] font-semibold text-nav-link hover:text-ink-dark">
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
          {!hideNeighborhood && (
            <NeighborhoodMenu
              dongLabel={dongLabel}
              triggerClassName="flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-label shadow-card"
            />
          )}
          {/* 보관함 입구는 좌측 내비의 "보관함" 하나로 충분하다 — 같은 /saved로 가는
              북마크 아이콘을 헤더에 또 두지 않는다(입구 중복). */}
          {userName ? (
            <Link
              href="/my"
              className="grid size-9 place-items-center rounded-full bg-tint text-[13px] font-bold text-primary-deep"
              aria-label="마이"
            >
              {userName.slice(0, 1)}
            </Link>
          ) : (
            <Link
              href="/my"
              className="flex h-9 items-center rounded-pill border border-line bg-surface px-4 text-[13px] font-semibold text-label shadow-card hover:border-faint"
            >
              로그인
            </Link>
          )}
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
  hideNeighborhood = false,
}: {
  children: ReactNode;
  active?: NavKey;
  variant?: "marketing" | "app";
  footer?: boolean;
  dongName?: string;
  userName?: string;
  /** 헤더 동네 pill을 숨긴다 — 화면이 자체 앵커 진입점을 가질 때(TopNav 주석 참조). */
  hideNeighborhood?: boolean;
}) {
  return (
    <div className="hidden min-h-dvh flex-col bg-bg md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-[14px] focus:font-bold focus:text-white"
      >
        본문 바로가기
      </a>
      <TopNav
        active={active}
        variant={variant}
        dongName={dongName}
        userName={userName}
        hideNeighborhood={hideNeighborhood}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
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
