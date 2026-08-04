import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

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
export default bundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
