import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 홈 디렉터리(~/pnpm-lock.yaml)에도 lockfile이 있어 Next가 워크스페이스 루트를
  // 잘못 추론한다(빌드 트레이싱이 repo 밖을 훑음). 모노레포 루트를 명시해 고정한다.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // 공용 TS 패키지를 소스째로 트랜스파일 (빌드 스텝 없이 workspace 공유)
  transpilePackages: ["@motungi/core", "@motungi/tokens"],
  async headers() {
    return [
      {
        // public/ 정적 파일의 기본 헤더는 `max-age=0`이라 재방문마다 재검증한다.
        // 폰트는 버전이 박힌 불변 자산(pretendard 1.3.9)이므로 1년 immutable로 준다.
        // 갱신이 필요하면 경로에 버전을 넣어 새 URL로 배포한다.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  images: {
    // 랜딩 플레이스홀더는 우리가 만든 신뢰된 SVG(public/landing/). 실사진 교체 시에도 동일 슬롯 사용.
    // CSP로 인라인 스크립트/외부 리소스 차단(우리 자산엔 스크립트 없음).
    dangerouslyAllowSVG: true,
    // 공공데이터 원본(culture.seoul/culture.go.kr)은 느리고 http도 섞여 있다. 원본 응답에
    // Cache-Control이 없으면 next/image는 기본 60초만 캐시해 사실상 매번 원본을 다시 당긴다
    // → 히어로 3D 링의 포스터 12장이 그때마다 처음부터 느려진다. 포스터는 사실상 불변이므로
    // 최적화 결과를 30일 붙잡아 둔다(첫 방문자만 원본 대기를 치른다).
    minimumCacheTTL: 60 * 60 * 24 * 30,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 실 활동 썸네일 원본 호스트(공공데이터). next/image가 서버에서 프록시·최적화(AVIF/WebP)하므로
    // 브라우저는 이 호스트를 직접 부르지 않고, culture.go.kr의 http 원본도 서버 프록시로 안전히 처리된다.
    remotePatterns: [
      { protocol: "https", hostname: "culture.seoul.go.kr" },
      { protocol: "http", hostname: "www.culture.go.kr" },
      { protocol: "https", hostname: "www.culture.go.kr" },
    ],
  },
};

// ANALYZE=true 일 때만 번들 리포트를 뽑는다(평소 빌드에 부담 주지 않음).
// 사용: ANALYZE=true pnpm --filter @motungi/web build
const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Sentry 래핑 — source map 업로드는 SENTRY_AUTH_TOKEN이 있을 때만 일어난다(로컬 빌드는 그냥 통과).
// tunnelRoute는 넣지 않는다: 광고차단 우회 이득보다 서버 부하가 크다. 이벤트 유실이 실측되면 추가.
export default withSentryConfig(withAnalyzer(nextConfig), {
  // 조직·프로젝트는 시크릿이 아니다(소스맵을 어디로 올릴지 가리키는 식별자). 진짜 시크릿은
  // SENTRY_AUTH_TOKEN 하나뿐이라 그것만 env로 둔다. env 미설정 시 업로드는 조용히 건너뛴다.
  org: process.env.SENTRY_ORG ?? "34745a4ae607",
  project: process.env.SENTRY_PROJECT ?? "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // 클라이언트 소스 파일을 넓게 올린다 — 이게 없으면 청크 경계 밖 프레임이 난독화된 채로 남는다.
  widenClientFileUpload: true,
  // 클라이언트 번들에서 소스맵 참조를 지운다 — 업로드는 하되 공개는 하지 않는다.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Sentry SDK 디버그 로거를 프로덕션 번들에서 트리셰이킹(번들 절감).
  // 예전 disableLogger의 후속 옵션 — 10.x에서 deprecated 경고가 뜬다.
  webpack: { treeshake: { removeDebugLogging: true } },
});
