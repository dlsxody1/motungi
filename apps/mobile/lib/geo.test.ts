import { describe, expect, it } from "vitest";
import { reverseGeocode } from "./geo";

/**
 * geo.ts는 모듈 로드 시 EXPO_PUBLIC_WEB_ORIGIN을 캡처한다.
 * 테스트 환경엔 오리진이 없으므로 항상 null(폴백)로 빠지는 계약을 검증한다.
 */
describe("reverseGeocode", () => {
  it("WEB_ORIGIN 미설정이면 네트워크 호출 없이 null", async () => {
    expect(await reverseGeocode(37.5, 127.0)).toBeNull();
  });
});
