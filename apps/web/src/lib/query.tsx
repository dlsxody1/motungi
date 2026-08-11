"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * 서버 상태 경계. 활동 데이터(카탈로그·단건·걷기길)는 여기 산다.
 * Zustand(useAppStore)는 이제 **클라이언트 상태 전용**이다 — 앵커·진단답변·저장목록·유저.
 *
 * 왜 나눴나: catalog를 Zustand에 두니 캐시 무효화·요청 취소·재시도를 전부 손으로 짜게 됐다
 * (lastPointRef 수동 캐시키, cancelled 플래그, retry nonce). 전부 queryKey가 하는 일이다.
 */

/** 활동 데이터는 마감·신규 적재가 분 단위로 바뀌지 않는다 — 5분은 재조회 없이 재사용. */
const STALE_MS = 5 * 60 * 1000;

export const queryKeys = {
  /** 반경 카탈로그. point가 키에 들어가므로 동네를 바꾸면 자동으로 다른 캐시 항목이 된다. */
  catalog: (point: { lat: number; lng: number } | undefined) =>
    ["catalog", point ? `${point.lat},${point.lng}` : "no-anchor"] as const,
  /** 단건 상세. 보관함·상세가 같은 키를 공유해 중복 조회가 사라진다. */
  opportunity: (id: string) => ["opportunity", id] as const,
  /**
   * 리포트 직접진입 fallback(6건). 카탈로그와 다른 쿼리다 — limit이 달라 섞이면 안 된다.
   * point가 키에 들어간다: 예전엔 키가 상수여서 동네를 바꿔도 이전 동네 6건이 캐시에서
   * 그대로 나왔다(강남에서 금천 원픽이 뜨던 경로 중 하나).
   */
  reportFallback: (point: { lat: number; lng: number } | undefined) =>
    ["report-fallback", point ? `${point.lat},${point.lng}` : "no-anchor"] as const,
  /** 걷기길 경로. */
  trailRoute: (id: string) => ["trail-route", id] as const,
  /**
   * LLM 근거 생성(M-044). breakdownKey는 breakdown 5축 직렬화값 —
   * 진단답변·앵커가 바뀌어 breakdown이 달라지면 자동으로 다른 캐시 항목이 된다.
   */
  whyReasons: (id: string, breakdownKey: string) => ["why-reasons", id, breakdownKey] as const,
} as const;

export function QueryProvider({ children }: { children: ReactNode }) {
  // 클라이언트를 state에 담는 이유: 모듈 스코프에 두면 SSR에서 요청 간 캐시가 공유돼
  // 다른 사용자의 데이터가 새어나갈 수 있다(Next.js 공식 권고).
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_MS,
            // 창 포커스마다 재조회하면 탐색 목록이 스크롤 중에 갈린다. 수동 무효화로 충분하다.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
