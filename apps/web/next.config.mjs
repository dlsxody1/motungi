/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 공용 TS 패키지를 소스째로 트랜스파일 (빌드 스텝 없이 workspace 공유)
  transpilePackages: ["@motungi/core", "@motungi/tokens"],
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

export default nextConfig;
