import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
import type { ReactNode } from "react";
import { AuthBoot } from "@/components/auth-boot";
import { KakaoSDK } from "@/components/kakao-sdk";
import { WebVitals } from "@/components/web-vitals";
import { QueryProvider } from "@/lib/query";
import "./globals.css";

/* 워드마크 전용 귀여운 둥근고딕 — 로고 '모퉁이'에만 쓴다(본문은 Pretendard 유지). */
const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-wordmark-jua",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://motungi.app";
const TITLE = "모퉁이 Corner";
const DESCRIPTION =
  "퇴근하고 뭐하지? — 위치 + 60초 진단으로, 퇴근 후·주말 내 동네 문화·여가를 딱 하나만 골라주는 하이퍼로컬 큐레이션.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · 모퉁이 Corner",
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: ["모퉁이", "동네 문화", "여가", "퇴근 후", "하이퍼로컬", "큐레이션", "주말 활동"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    // opengraph-image.png (같은 폴더)가 자동으로 og:image 로 주입됨.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  // 브랜드 앱 아이콘(둥근 사각) — 파비콘 · 홈스크린 아이콘.
  icons: {
    icon: "/brand/app-icon-128-rounded.png",
    apple: "/brand/app-icon-128-rounded.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale/userScalable 미설정 — 사용자 확대 허용(WCAG 1.4.4).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0eb" },
    { media: "(prefers-color-scheme: dark)", color: "#f4f0eb" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={jua.variable}>
      <head>
        {/*
          Pretendard — 본문 한글 웹폰트. jsdelivr CDN에서 자체 호스팅으로 옮겼다.
          이유는 용량이 아니라 **연결 비용**이다: CDN판은 서드파티 오리진에서 CSS 1개 +
          한글 서브셋 woff2 15개 = 총 16요청이 나가는데 preconnect가 없어 DNS+TLS를
          폰트 발견 시점에야 새로 맺었다(실측 마지막 응답 133~149ms).
          같은 오리진에서 주면 이미 열린 커넥션을 재사용한다.

          next/font/local을 안 쓴 이유: 그건 파일을 명시해야 해서 통짜 가변폰트(2.0MB)를
          쓰게 되는데, 한글은 동적 서브셋(92개 유니코드 레인지 분할)이 훨씬 싸다.
          브라우저가 실제로 쓰는 글자의 서브셋만 받는다.
        */}
        <link rel="preload" as="style" href="/fonts/pretendard/pretendardvariable-dynamic-subset.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags -- next/font는 파일을 명시해야 해서
            동적 서브셋(92분할)을 못 쓴다. 통짜 2.0MB를 받느니 이 링크가 낫다(위 주석 참조). */}
        <link rel="stylesheet" href="/fonts/pretendard/pretendardvariable-dynamic-subset.css" />
      </head>
      <body>
        <QueryProvider>
          <AuthBoot />
          <KakaoSDK />
          <WebVitals />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
