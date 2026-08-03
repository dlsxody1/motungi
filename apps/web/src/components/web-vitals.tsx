"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Core Web Vitals 수집 → /api/vitals.
 *
 * SaaS(Sentry·PostHog·Vercel Analytics)를 쓰지 않는다: 사용자 0명 단계에서 벤더를 붙이면
 * 비용·번들·프라이버시 표면만 늘고, 정작 필요한 건 "최적화 전후를 비교할 숫자" 하나뿐이다.
 * next/web-vitals의 useReportWebVitals는 Next가 이미 번들에 갖고 있어 신규 의존성이 0이다.
 *
 * 전송은 sendBeacon 우선 — 페이지가 언로드되는 중에도(LCP·CLS는 보통 그때 확정된다)
 * 요청이 취소되지 않는다. 미지원 환경은 keepalive fetch로 폴백.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      // 라우트별로 비교해야 의미가 있다(탐색 195kB vs 랜딩 185kB).
      path: window.location.pathname,
    });

    // 계측이 제품을 깨뜨리면 안 된다 — 실패는 조용히 삼킨다.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/vitals", body);
        return;
      }
      void fetch("/api/vitals", { body, method: "POST", keepalive: true });
    } catch {
      /* 계측 실패는 사용자에게 영향 없음 */
    }
  });

  return null;
}
