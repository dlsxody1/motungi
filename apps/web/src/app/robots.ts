/**
 * robots.txt — 크롤링 허용 범위 + 사이트맵 위치.
 *
 * disallow 목록은 "비밀"이 아니라 **색인 가치가 없는 경로**다. 개인화 화면은
 * 크롤러가 봐도 로그인 전 빈 상태만 보이므로, 색인되면 품질 낮은 페이지만 늘어난다.
 * (진짜 접근 제어는 RLS와 서버가 한다 — robots.txt는 요청 차단 수단이 아니다.)
 */
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/my",
        "/saved",
        "/report",
        "/diagnosis",
        "/loading",
        // 구형 쿼리 URL — 정식 경로로 308 리다이렉트되지만 애초에 긁지 않게 한다.
        "/opportunity?",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
