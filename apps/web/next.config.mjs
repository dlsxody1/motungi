/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 공용 TS 패키지를 소스째로 트랜스파일 (빌드 스텝 없이 workspace 공유)
  transpilePackages: ["@motungi/core", "@motungi/tokens"],
};

export default nextConfig;
