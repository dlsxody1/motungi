import { describe, expect, it } from "vitest";
import { hashKey, parseFeeKrw, parseHour, parsePoint, toIsoDate } from "./util";

describe("parseFeeKrw", () => {
  it("무료 표기는 0", () => {
    expect(parseFeeKrw("무료")).toBe(0);
    expect(parseFeeKrw("전석 무료")).toBe(0);
  });
  it("금액 표기 파싱", () => {
    expect(parseFeeKrw("전석 15,000원")).toBe(15_000);
    expect(parseFeeKrw("10000")).toBe(10_000);
  });
  it("'만' 단위", () => {
    expect(parseFeeKrw("3만원")).toBe(30_000);
  });
  it("여러 금액이면 최소값(가장 싼 좌석)", () => {
    expect(parseFeeKrw("R석 50,000원 / S석 30,000원")).toBe(30_000);
  });
  it("파싱 불가/빈값은 undefined", () => {
    expect(parseFeeKrw("")).toBeUndefined();
    expect(parseFeeKrw(undefined)).toBeUndefined();
    expect(parseFeeKrw("추후 공지")).toBeUndefined();
  });
});

describe("parseHour", () => {
  it("HH:MM에서 시(hour) 추출", () => {
    expect(parseHour("수요일 11:00")).toBe(11);
    expect(parseHour("19:30")).toBe(19);
  });
  it("'오후 7시' 한글 표기", () => {
    expect(parseHour("오후 7시")).toBe(19);
    expect(parseHour("오전 10시")).toBe(10);
  });
  it("추출 불가 시 undefined", () => {
    expect(parseHour("상시")).toBeUndefined();
    expect(parseHour(undefined)).toBeUndefined();
  });
});

describe("toIsoDate", () => {
  it("YYYYMMDD", () => {
    expect(toIsoDate("20260729")).toBe("2026-07-29");
  });
  it("YYYY-MM-DD HH:MM:SS.s", () => {
    expect(toIsoDate("2026-10-28 00:00:00.0")).toBe("2026-10-28");
  });
  it("이미 ISO면 날짜부만", () => {
    expect(toIsoDate("2026-07-31")).toBe("2026-07-31");
  });
  it("파싱 불가 시 undefined", () => {
    expect(toIsoDate("")).toBeUndefined();
    expect(toIsoDate(undefined)).toBeUndefined();
    expect(toIsoDate("상시")).toBeUndefined();
  });
});

describe("hashKey", () => {
  it("동일 입력 → 동일 해시(결정적)", () => {
    expect(hashKey("a|b|c")).toBe(hashKey("a|b|c"));
  });
  it("다른 입력 → 다른 해시", () => {
    expect(hashKey("a|b|c")).not.toBe(hashKey("a|b|d"));
  });
});

describe("parsePoint", () => {
  it("정상 좌표는 { lat, lng }로 반환", () => {
    expect(parsePoint("37.5556", "126.9019")).toEqual({ lat: 37.5556, lng: 126.9019 });
  });
  it("(0,0)은 undefined", () => {
    expect(parsePoint("0", "0")).toBeUndefined();
  });
  it("NaN/비숫자는 undefined", () => {
    expect(parsePoint("abc", "126.9019")).toBeUndefined();
    expect(parsePoint("37.5556", "xyz")).toBeUndefined();
    expect(parsePoint(undefined, undefined)).toBeUndefined();
  });
  it("Infinity(숫자/문자열 모두)는 undefined", () => {
    expect(parsePoint("Infinity", "126.9019")).toBeUndefined();
    expect(parsePoint("37.5556", "Infinity")).toBeUndefined();
    expect(parsePoint("-Infinity", "126.9019")).toBeUndefined();
  });
  it("한쪽만 0이고 다른쪽이 유효하면 유효한 point 반환", () => {
    expect(parsePoint("0", "126.9019")).toEqual({ lat: 0, lng: 126.9019 });
    expect(parsePoint("37.5556", "0")).toEqual({ lat: 37.5556, lng: 0 });
  });
});
