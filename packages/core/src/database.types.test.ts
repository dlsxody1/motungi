import { describe, expect, it } from "vitest";
import { isOpportunityCategory, isSourceKind } from "./database.types";
import type { OpportunityCategory, SourceKind } from "./types";

const APP_CATEGORIES: OpportunityCategory[] = [
  "culture",
  "active",
  "side_job",
  "class",
  "food",
  "market",
];

const APP_SOURCES: SourceKind[] = [
  "seoul_culture",
  "culture_info",
  "sports_facility",
  "trail",
  "seoul_jobs",
  "commercial_area",
];

const LEGACY_CATEGORIES = ["subsidy", "gig_deal", "class_talent", "space_used"];
const LEGACY_SOURCES = ["youth_policy", "affiliate_feed"];

const GARBAGE: unknown[] = ["garbage", "", 123, null, undefined, {}, [], true];

describe("isOpportunityCategory", () => {
  it("앱이 실제로 쓰는 카테고리 6종은 전부 true", () => {
    for (const category of APP_CATEGORIES) {
      expect(isOpportunityCategory(category)).toBe(true);
    }
  });

  it("DB에만 남은 레거시 카테고리는 false", () => {
    for (const legacy of LEGACY_CATEGORIES) {
      expect(isOpportunityCategory(legacy)).toBe(false);
    }
  });

  it("쓰레기 값은 false", () => {
    for (const garbage of GARBAGE) {
      expect(isOpportunityCategory(garbage)).toBe(false);
    }
  });
});

describe("isSourceKind", () => {
  it("앱이 실제로 쓰는 소스 6종은 전부 true", () => {
    for (const source of APP_SOURCES) {
      expect(isSourceKind(source)).toBe(true);
    }
  });

  it("DB에만 남은 레거시 소스는 false", () => {
    for (const legacy of LEGACY_SOURCES) {
      expect(isSourceKind(legacy)).toBe(false);
    }
  });

  it("쓰레기 값은 false", () => {
    for (const garbage of GARBAGE) {
      expect(isSourceKind(garbage)).toBe(false);
    }
  });
});
