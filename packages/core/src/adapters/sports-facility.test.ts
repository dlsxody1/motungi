import { describe, expect, it } from "vitest";
import {
  normalizeSportsFacility,
  normalizeSportsFacilities,
  type RawSportsFacility,
} from "./sports-facility";

/** 추정 스키마 기반 샘플 1건 (발급 후 실제 응답으로 교체). */
const RAW: RawSportsFacility = {
  FCLTY_SN: "1234",
  FCLTY_NM: "망원한강공원 수영장",
  FCLTY_TY_NM: "수영장",
  RDNMADR: "서울특별시 마포구 마포나루길 467",
  SIGNGU_NM: "마포구",
  LATITUDE: "37.5556",
  LONGITUDE: "126.9019",
  UTILIZA_CHRGE: "1회 5,000원",
  HMPG_URL: "https://hangang.seoul.go.kr/mangwon",
};

describe("normalizeSportsFacility", () => {
  it("체육시설을 Opportunity(active)로 정규화", () => {
    const o = normalizeSportsFacility(RAW)!;
    expect(o.source).toBe("sports_facility");
    expect(o.category).toBe("active");
    expect(o.title).toBe("망원한강공원 수영장");
    expect(o.id).toBe("sports:1234");
    expect(o.sourceLabel).toBe("공공체육시설");
  });

  it("이용요금을 costKrw로 파싱", () => {
    expect(normalizeSportsFacility(RAW)!.costKrw).toBe(5000);
    expect(normalizeSportsFacility({ ...RAW, UTILIZA_CHRGE: "무료" })!.costKrw).toBe(0);
  });

  it("요금 미상이면 costKrw는 0이 아니라 undefined", () => {
    expect(normalizeSportsFacility({ ...RAW, UTILIZA_CHRGE: undefined })!.costKrw).toBeUndefined();
  });

  it("위/경도를 location.point로 반영", () => {
    const o = normalizeSportsFacility(RAW)!;
    expect(o.location?.point).toEqual({ lat: 37.5556, lng: 126.9019 });
    expect(o.location?.dongName).toBe("마포구");
  });

  it("0,0 좌표는 point 없이 처리", () => {
    const o = normalizeSportsFacility({ ...RAW, LATITUDE: "0", LONGITUDE: "0" })!;
    expect(o.location?.point).toBeUndefined();
    expect(o.location?.dongName).toBe("마포구"); // dongName은 유지
  });

  it("시설 일련번호 없으면 시설명+주소 해시로 id 생성 (결정적)", () => {
    const a = normalizeSportsFacility({ ...RAW, FCLTY_SN: undefined })!;
    const b = normalizeSportsFacility({ ...RAW, FCLTY_SN: undefined })!;
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^sports:/);
    expect(a.id).not.toBe("sports:1234");
  });

  it("유형·자치구·주소를 summary에 반영", () => {
    const s = normalizeSportsFacility(RAW)!.summary;
    expect(s).toContain("수영장");
    expect(s).toContain("마포구");
  });

  it("시설명 없으면 제외", () => {
    expect(normalizeSportsFacility({ ...RAW, FCLTY_NM: "" })).toBeNull();
  });

  it("배열 정규화 — 무효 레코드 제외", () => {
    const out = normalizeSportsFacilities([RAW, { ...RAW, FCLTY_NM: "" }]);
    expect(out).toHaveLength(1);
  });
});
