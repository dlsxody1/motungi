/**
 * 로그인 후 복귀 경로(`next`) 검증 — 오픈 리다이렉트(CWE-601) 방어.
 *
 * WHATWG URL은 `\`를 `/`로 보고 탭·개행을 제거하므로 `/\evil.com`·`/\t/evil.com`은
 * `//evil.com`(프로토콜 상대 URL)로 해석된다. `startsWith("//")`만으로는 못 막는다.
 * 그래서 앞쪽이 단일 `/`이고, 제어문자·역슬래시가 전혀 없을 때만 내부 경로로 인정한다.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/my"): string {
  if (!raw) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  if (!/^\/(?![\\/])/.test(raw)) return fallback;
  return raw;
}
