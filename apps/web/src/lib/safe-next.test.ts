import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it.each(["/saved", "/explore/마포구?x=1#a", "/"])("내부 경로 %s는 보존한다", (p) => {
    expect(safeNextPath(p)).toBe(p);
  });

  it.each([
    null,
    undefined,
    "",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "\\\\evil.com",
    "https://x",
    "javascript:alert(1)",
    "evil.com",
  ])("%j는 /my로 폴백한다", (p) => {
    expect(safeNextPath(p)).toBe("/my");
  });
});
