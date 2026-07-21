import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthBoot } from "@/components/auth-boot";
import { KakaoSDK } from "@/components/kakao-sdk";
import "./globals.css";

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
    <html lang="ko">
      <head>
        {/* Pretendard — 본문 한글 웹폰트 (CDN) */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <AuthBoot />
        <KakaoSDK />
        {children}
      </body>
    </html>
  );
}
