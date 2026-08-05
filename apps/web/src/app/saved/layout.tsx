/**
 * /saved 메타데이터 — **noindex**.
 *
 * 진단 답변·저장 목록에 따라 내용이 달라지는 개인화 화면이라, 크롤러가 보면
 * 로그인/진단 전의 빈 상태만 색인된다. robots.ts의 disallow와 짝을 이룬다
 * (둘 중 하나만 두면 신호가 어긋난다).
 * page.tsx가 "use client"라 metadata를 export할 수 없어 레이아웃으로 감싼다.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "보관함",
  description: "저장해둔 동네 활동을 모아봅니다.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
