"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Core Web Vitals 수집 → /api/vitals.
 *
 * 성능 수치는 계속 자체 수집한다. 에러 리포팅은 Sentry로 옮겼지만(instrumentation.ts),
 * 이 지표까지 벤더로 보낼 이유는 없다 — 필요한 건 "최적화 전후를 비교할 숫자" 하나뿐이고,
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
    // .catch가 필요한 이유: 아래 try/catch는 **동기** 예외만 잡는다. fetch가 반환한 프라미스가
    // 네트워크 실패로 거부되면 unhandled rejection이 되어, 계측이 제품 콘솔을 오염시킨다.
    // 여기 실패는 Sentry로도 보내지 않는다 — 계측 실패로 에러 리포팅을 채우면 신호가 죽는다.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/vitals", body);
        return;
      }
      void fetch("/api/vitals", { body, method: "POST", keepalive: true }).catch(() => {});
    } catch {
      /* 계측 실패는 사용자에게 영향 없음 */
    }
  });

  return null;
}
