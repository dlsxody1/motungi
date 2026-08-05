/**
 * /explore 메타데이터.
 *
 * page.tsx가 "use client"라 거기선 metadata를 export할 수 없다 — 레이아웃으로 감싼다.
 * 탐색은 상세 다음으로 색인 가치가 큰 공개 페이지다(카테고리·동네 검색 유입).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

const TITLE = "동네 활동 탐색";
const DESCRIPTION =
  "퇴근 후·주말에 우리 동네에서 즐길 문화·공연·체험·걷기길을 한곳에서. 동네와 카테고리로 좁혀 보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/explore" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/explore",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return children;
}
