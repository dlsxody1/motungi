import { describe, expect, it } from "vitest";
import { CSP_REPORT_ONLY, SECURITY_HEADERS } from "./security-headers.mjs";

const byKey = (k: string): string | undefined =>
  (SECURITY_HEADERS as { key: string; value: string }[]).find((h) => h.key === k)?.value;

describe("security headers (M-119)", () => {
  it("강제 적용 헤더 4종이 있다", () => {
    expect(byKey("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byKey("X-Frame-Options")).toBe("DENY");
    expect(byKey("Permissions-Policy")).toContain("geolocation=(self)");
  });

  it("CSP는 Report-Only로만 도입한다(차단 모드 아님)", () => {
    expect(byKey("Content-Security-Policy-Report-Only")).toBe(CSP_REPORT_ONLY);
    expect(byKey("Content-Security-Policy")).toBeUndefined();
  });

  it("CSP가 클릭재킹을 막고 카카오·네이버·Supabase·Sentry를 허용한다", () => {
    expect(CSP_REPORT_ONLY).toContain("frame-ancestors 'none'");
    expect(CSP_REPORT_ONLY).toContain("object-src 'none'");
    for (const host of ["t1.kakaocdn.net", "oapi.map.naver.com", "*.supabase.co", "*.ingest.sentry.io"]) {
      expect(CSP_REPORT_ONLY).toContain(host);
    }
  });
});
