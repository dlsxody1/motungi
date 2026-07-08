"use client";

import { useEffect } from "react";
import { initAuthListener } from "@/lib/auth";

/**
 * 세션 부트스트랩 — 루트 layout에 삽입.
 * 마운트 시 현재 세션을 store에 반영하고 로그인/로그아웃을 구독한다.
 * (UI 없음)
 */
export function AuthBoot() {
  useEffect(() => initAuthListener(), []);
  return null;
}
