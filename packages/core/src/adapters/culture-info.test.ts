import { describe, expect, it } from "vitest";
import {
  normalizeCultureInfo,
  normalizeCultureInfos,
  type RawCultureInfo,
} from "./culture-info";

/** 실제 한눈에보는문화정보(cultureinfo) 응답 1건 기반. */
const RAW: RawCultureInfo = {
  seq: "386189",
  title: "미술은행 20주년 특별전",
  startDate: "20250808",
  endDate: "20260731",
  place: "국립현대미술관 청주관",
  realmName: "전시",
  area: "충북",
  sigungu: "청주시",
  thumbnail: "http://www.culture.go.kr/img.png",
  gpsX: "127.4290",
  gpsY: "36.6357",
};

describe("normalizeCultureInfo", () => {
  it("문화정보를 Opportunity(culture)로 정규화", () => {
    const o = normalizeCultureInfo(RAW)!;
    expect(o.source).toBe("culture_info");
    expect(o.category).toBe("culture");
    expect(o.title).toBe(RAW.title);
    expect(o.id).toBe("culture-info:386189");
    expect(o.location?.dongName).toBe("충북 청주시");
    expect(o.location?.point).toEqual({ lat: 36.6357, lng: 127.429 });
    expect(o.deadline).toBe("2026-07-31");
    expect(o.sourceLabel).toContain("문화정보");
  });

  it("좌표 없으면 point 생략", () => {
    const o = normalizeCultureInfo({ ...RAW, gpsX: "", gpsY: "" })!;
    expect(o.location?.point).toBeUndefined();
  });

  it("seq 또는 title 없으면 제외", () => {
    expect(normalizeCultureInfo({ ...RAW, seq: "" })).toBeNull();
    expect(normalizeCultureInfo({ ...RAW, title: "" })).toBeNull();
  });

  it("배열 정규화", () => {
    const out = normalizeCultureInfos([RAW, { ...RAW, seq: "" }]);
    expect(out).toHaveLength(1);
  });
});
