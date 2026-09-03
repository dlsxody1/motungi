/**
 * 인메모리 고정 윈도우 레이트리미터 — /api/geo·/api/why-reasons처럼 과금되는 업스트림을
 * 감싸는 공개 프록시의 쿼터 소진을 늦추는 최소 방어선(M-076).
 *
 * 서버리스 인스턴스마다 별도 메모리라 완벽한 전역 제한은 아니다(best-effort) — Redis/Upstash
 * 도입 전까지는 이걸로 충분하다(HANDOFF.md 기준 현재 사용자 0명 단계). 인스턴스가 재시작되면
 * 버킷도 초기화된다.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  /** 초과 시 재시도까지 남은 초. 허용된 요청이면 0. */
  retryAfterSec: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * 요청에서 클라이언트 식별 키를 뽑는다. 프록시 뒤(Vercel)에서는 x-forwarded-for의
 * 첫 값이 실 클라이언트 IP다. 둘 다 없으면(로컬/테스트) 고정 문자열로 뭉뚱그린다 —
 * IP가 없다고 레이트리밋을 완전히 끄지 않는다.
 */
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** 테스트 전용 — 버킷 상태를 초기화해 테스트 간 레이트리밋 상태가 새지 않게 한다. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
