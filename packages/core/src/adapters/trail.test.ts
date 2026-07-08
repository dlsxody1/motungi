import { describe, expect, it } from "vitest";
import { normalizeTrail, normalizeTrails, type RawTrail } from "./trail";

/** 실제 두루누비 courseList 응답 1건 기반. */
const RAW: RawTrail = {
  crsIdx: "T_CRS_MNG0000005117",
  crsKorNm: "남파랑길 2코스",
  crsDstnc: "19",
  crsTotlRqrmHour: "450",
  crsLevel: "2",
  crsSummary: "부산역에서 시작하여 걷기 좋은 봉래산을 지나는 코스",
  crsContents: "갈맷길 3-3구간과 중첩되는 구간으로...",
  sigun: "부산 중구",
  gpxpath: "https://www.durunubi.kr/gpx/x.gpx",
};

describe("normalizeTrail", () => {
  it("걷기길을 Opportunity(active)로 정규화", () => {
    const o = normalizeTrail(RAW)!;
    expect(o.source).toBe("trail");
    expect(o.category).toBe("active");
    expect(o.title).toBe("남파랑길 2코스");
    expect(o.id).toBe("trail:T_CRS_MNG0000005117");
    expect(o.costKrw).toBe(0); // 걷기길은 무료
    expect(o.location?.dongName).toBe("부산 중구");
    expect(o.sourceLabel).toContain("두루누비");
  });

  it("난이도 level(1~3)을 difficulty(0~1)로 정규화", () => {
    expect(normalizeTrail({ ...RAW, crsLevel: "1" })!.difficulty).toBe(0);
    expect(normalizeTrail({ ...RAW, crsLevel: "2" })!.difficulty).toBeCloseTo(0.5);
    expect(normalizeTrail({ ...RAW, crsLevel: "3" })!.difficulty).toBe(1);
  });

  it("거리를 summary에 반영", () => {
    expect(normalizeTrail(RAW)!.summary).toContain("19");
  });

  it("crsIdx 또는 코스명 없으면 제외", () => {
    expect(normalizeTrail({ ...RAW, crsIdx: "" })).toBeNull();
    expect(normalizeTrail({ ...RAW, crsKorNm: "" })).toBeNull();
  });

  it("배열 정규화", () => {
    const out = normalizeTrails([RAW, { ...RAW, crsIdx: "" }]);
    expect(out).toHaveLength(1);
  });
});
