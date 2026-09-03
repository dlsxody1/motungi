/**
 * Sentry — Node 런타임(route handler·서버 컴포넌트).
 * DSN이 비어 있으면 SDK는 조용히 no-op이므로, DSN 발급 전에도 안전하게 머지된다.
 */
import * as Sentry from "@sentry/nextjs";

/**
 * 쿼리스트링에 시크릿이 실릴 수 있는 업스트림 호스트(M-078). Gemini는 과거 ?key=,
 * NAVER/data.go.kr도 같은 계열 위험(자격증명·서비스키가 URL에 실림) — breadcrumb/이벤트에서
 * 쿼리스트링을 통째로 제거한다. Gemini는 이제 헤더로 키를 보내지만(why-reasons/route.ts),
 * 회귀·다른 호출부를 대비해 여기서도 방어한다.
 */
const SENSITIVE_HOSTS = [
  "generativelanguage.googleapis.com",
  "maps.apigw.ntruss.com",
  "apis.data.go.kr",
];

/** url이 SENSITIVE_HOSTS 중 하나면 쿼리스트링을 제거한 문자열을 돌려준다. 파싱 실패 시 원본 그대로. */
function stripSensitiveQuery(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (SENSITIVE_HOSTS.includes(parsed.hostname)) {
      parsed.search = "";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 사용자 0명 단계 — 트레이스는 끄고 에러만 받는다. 트래픽이 생기면 올린다.
  tracesSampleRate: 0,
  // 스택 프레임에 지역변수 값을 붙인다 — 서버 전용이라 클라 번들 비용이 0이고,
  // "어떤 id로 부를 때 터졌나"를 재현 없이 알 수 있다.
  includeLocalVariables: true,
  // 개발 중 콘솔에 SDK 로그를 뿌리지 않는다.
  debug: false,
  // fetch/http breadcrumb의 data.url에 민감 호스트 쿼리스트링이 그대로 남는 것을 막는다(M-078).
  beforeBreadcrumb(breadcrumb) {
    if (typeof breadcrumb.data?.url === "string") {
      breadcrumb.data.url = stripSensitiveQuery(breadcrumb.data.url);
    }
    return breadcrumb;
  },
  // 이벤트 자체(request.url)와 이미 붙은 breadcrumbs 배열도 동일하게 스크러빙한다.
  beforeSend(event) {
    if (event.request?.url) {
      event.request.url = stripSensitiveQuery(event.request.url);
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) =>
        typeof b.data?.url === "string"
          ? { ...b, data: { ...b.data, url: stripSensitiveQuery(b.data.url) } }
          : b,
      );
    }
    return event;
  },
});
