import { describe, expect, it } from "vitest";
import {
  extractDeadline,
  normalizeYouthPolicy,
  parseSupportKrw,
  type RawYouthPolicy,
} from "./youth-policy";

describe("parseSupportKrw", () => {
  it("'만' 단위", () => {
    expect(parseSupportKrw("연 240만원 지원")).toBe(2_400_000);
  });
  it("'원' 단위", () => {
    expect(parseSupportKrw("2,400,000원")).toBe(2_400_000);
  });
  it("'억' 단위", () => {
    expect(parseSupportKrw("최대 1억")).toBe(100_000_000);
  });
  it("금액 없으면 undefined", () => {
    expect(parseSupportKrw("상담 후 결정")).toBeUndefined();
    expect(parseSupportKrw(undefined)).toBeUndefined();
  });
});

describe("extractDeadline", () => {
  it("기간에서 마지막 날짜를 마감으로", () => {
    expect(extractDeadline("2026.06.01 ~ 2026.07.31")).toBe("2026-07-31");
  });
  it("한 자리 월/일 zero-pad", () => {
    expect(extractDeadline("2026-6-1 ~ 2026-7-5")).toBe("2026-07-05");
  });
  it("날짜 없으면 undefined", () => {
    expect(extractDeadline("상시")).toBeUndefined();
    expect(extractDeadline(undefined)).toBeUndefined();
  });
});

const RAW: RawYouthPolicy = {
  policyId: "R2026-0007",
  policyName: "청년 월세 한시 특별지원",
  content: "만 19~34세 · 마포구 거주 요건 충족",
  supportContent: "연 240만원 지원",
  applyPeriod: "2026.06.01 ~ 2026.07.31",
  region: "마포구",
  applyUrl: "https://www.youthcenter.go.kr/policy/R2026-0007",
};

describe("normalizeYouthPolicy", () => {
  it("Opportunity로 정규화", () => {
    const o = normalizeYouthPolicy(RAW);
    expect(o.id).toBe("youth-policy:R2026-0007");
    expect(o.source).toBe("youth_policy");
    expect(o.category).toBe("subsidy");
    expect(o.estimatedIncomeKrw).toBe(2_400_000);
    expect(o.deadline).toBe("2026-07-31");
    expect(o.location?.dongName).toBe("마포구");
    expect(o.sourceLabel).toBe("온통청년");
  });
});
