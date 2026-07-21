import { describe, expect, it } from "vitest";
import {
  normalizeSeoulCulture,
  normalizeSeoulCultures,
  type RawSeoulCulture,
} from "./seoul-culture";

/** 실제 서울시 문화행사(culturalEventInfo) 응답 1건 기반. */
const RAW: RawSeoulCulture = {
  CODENAME: "콘서트",
  GUNAME: "강북구",
  TITLE: "[꿈의숲아트센터] 꿈의숲 마티네 콘서트",
  PLACE: "북서울꿈의숲 상상톡톡미술관",
  USE_TRGT: "8세 이상 관람 가능",
  USE_FEE: "전석 15,000원",
  ORG_LINK: "https://www.sejongpac.or.kr/perform",
  MAIN_IMG: "https://culture.seoul.go.kr/img.png",
  STRTDATE: "2026-10-28 00:00:00.0",
  END_DATE: "2026-10-28 00:00:00.0",
  LOT: "127.044324732036",
  LAT: "37.6202544613023",
  IS_FREE: "유료",
  PRO_TIME: "수요일 11:00",
};

describe("normalizeSeoulCulture", () => {
  it("문화행사를 Opportunity(culture)로 정규화", () => {
    const o = normalizeSeoulCulture(RAW)!;
    expect(o.source).toBe("seoul_culture");
    expect(o.category).toBe("culture");
    expect(o.title).toBe(RAW.TITLE);
    expect(o.costKrw).toBe(15_000);
    expect(o.location?.dongName).toBe("강북구");
    expect(o.location?.point).toEqual({ lat: 37.6202544613023, lng: 127.044324732036 });
    expect(o.ctaUrl).toBe(RAW.ORG_LINK);
    expect(o.deadline).toBe("2026-10-28");
    expect(o.timeWindow?.startHour).toBe(11);
    expect(o.sourceLabel).toContain("서울시 문화행사");
    expect(o.imageUrl).toBe(RAW.MAIN_IMG);
  });

  it("대표 이미지 없으면 imageUrl 생략", () => {
    expect(normalizeSeoulCulture({ ...RAW, MAIN_IMG: "" })!.imageUrl).toBeUndefined();
    expect(normalizeSeoulCulture({ ...RAW, MAIN_IMG: undefined })!.imageUrl).toBeUndefined();
  });

  it("무료 행사는 costKrw=0", () => {
    const o = normalizeSeoulCulture({ ...RAW, IS_FREE: "무료", USE_FEE: "" })!;
    expect(o.costKrw).toBe(0);
  });

  it("external_id는 제목+날짜+장소로 안정적으로 생성(중복 방지)", () => {
    const a = normalizeSeoulCulture(RAW)!;
    const b = normalizeSeoulCulture({ ...RAW })!;
    expect(a.id).toBe(b.id); // 같은 입력 → 같은 id
    const c = normalizeSeoulCulture({ ...RAW, TITLE: "다른 공연" })!;
    expect(c.id).not.toBe(a.id);
  });

  it("제목 없으면 제외(null)", () => {
    expect(normalizeSeoulCulture({ ...RAW, TITLE: "" })).toBeNull();
  });

  it("좌표 없으면 point 생략하되 카드는 유지", () => {
    const o = normalizeSeoulCulture({ ...RAW, LAT: "", LOT: "" })!;
    expect(o.location?.point).toBeUndefined();
    expect(o.location?.dongName).toBe("강북구");
  });

  it("배열 정규화 시 부적합(제목없음) 제거", () => {
    const out = normalizeSeoulCultures([RAW, { ...RAW, TITLE: "" }]);
    expect(out).toHaveLength(1);
  });
});
