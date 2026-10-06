import { describe, expect, it } from "vitest";
import { C, alpha } from "./theme";

describe("alpha — 토큰 hex에 알파를 입힌다 (M-124)", () => {
  it("#rrggbb를 rgba 문자열로 바꾼다", () => {
    expect(alpha("#ffffff", 0.5)).toBe("rgba(255,255,255,0.5)");
    expect(alpha("#6b3d6e", 0.25)).toBe("rgba(107,61,110,0.25)");
  });

  it("tokens의 보라 tint/primary에서 나온다 — 옛 로즈 값이 아니다", () => {
    expect(alpha(C.tint, 0.6)).toBe("rgba(243,235,244,0.6)");
    expect(alpha(C.primary, 0.15)).toBe("rgba(107,61,110,0.15)");
  });

  it("6자리 hex가 아니면 입력을 그대로 돌려준다", () => {
    expect(alpha("red", 0.5)).toBe("red");
    expect(alpha("#abc", 0.5)).toBe("#abc");
  });
});
