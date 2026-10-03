/**
 * 웹 보안 응답 헤더(M-119). next.config.mjs의 headers()가 모든 경로에 적용한다.
 *
 * CSP는 Report-Only로 시작한다 — 카카오 JS SDK·네이버 지도·Supabase·Sentry의 실제 도메인을
 * 이 sandbox에서 검증할 수 없으므로, 차단 모드로 올리기 전에 브라우저 콘솔의 위반 리포트로
 * 허용 목록을 확인한다. 나머지 헤더는 동작을 바꾸지 않는 안전한 것만 강제 적용한다.
 *
 * script-src의 'unsafe-inline'은 Next가 주입하는 인라인 부트스트랩·JSON-LD 때문이다
 * (nonce 도입 전까지의 타협). 'unsafe-eval'은 개발 모드 HMR에만 허용한다.
 */
const isDev = process.env.NODE_ENV !== "production";

export const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://t1.kakaocdn.net", // 카카오 JS SDK
    "https://oapi.map.naver.com", // 네이버 지도 SDK
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:", "http://www.culture.go.kr", "http://www.kopis.or.kr"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://*.kakao.com",
    "https://*.kakaocdn.net",
    "https://*.naver.com",
    "https://*.ntruss.com",
  ],
  "frame-src": ["https://*.kakao.com"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
};

export const CSP_REPORT_ONLY = Object.entries(CSP_DIRECTIVES)
  .map(([k, v]) => `${k} ${v.join(" ")}`)
  .join("; ");

export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // 위치 권한은 위치 선택 화면이 쓰므로 self만 허용, 나머지는 닫는다.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];
