import { describe, expect, it } from "vitest";
import { parseNeighborhoodSearchResponse, parseReverseGeoResponse } from "./geo";

describe("parseReverseGeoResponse", () => {
  it("admCode·dongName이 있으면 그대로 반환한다", () => {
    expect(parseReverseGeoResponse({ admCode: "11", dongName: "역삼동" })).toEqual({
      admCode: "11",
      dongName: "역삼동",
    });
  });

  it("admCode가 없으면 null(값)로 채운다", () => {
    expect(parseReverseGeoResponse({ dongName: "역삼동" })).toEqual({
      admCode: null,
      dongName: "역삼동",
    });
  });

  it("dongName이 없으면 null을 반환한다", () => {
    expect(parseReverseGeoResponse({ admCode: "11" })).toBeNull();
  });

  it("빈 객체·null·undefined·원시값은 null을 반환한다", () => {
    expect(parseReverseGeoResponse({})).toBeNull();
    expect(parseReverseGeoResponse(null)).toBeNull();
    expect(parseReverseGeoResponse(undefined)).toBeNull();
    expect(parseReverseGeoResponse("역삼동")).toBeNull();
  });
});

describe("parseNeighborhoodSearchResponse", () => {
  it("items가 있으면 그대로 반환한다", () => {
    const items = [
      { admCode: "1111051500", dongName: "망원동", sigungu: "서울 마포구", lat: 37.5556, lng: 126.9019 },
    ];
    expect(parseNeighborhoodSearchResponse({ items })).toEqual(items);
  });

  it("items 키가 없으면 빈 배열을 반환한다", () => {
    expect(parseNeighborhoodSearchResponse({})).toEqual([]);
  });

  it("items가 배열이 아니면 빈 배열을 반환한다", () => {
    expect(parseNeighborhoodSearchResponse({ items: "역삼동" })).toEqual([]);
  });

  it("null·undefined·원시값은 빈 배열을 반환한다", () => {
    expect(parseNeighborhoodSearchResponse(null)).toEqual([]);
    expect(parseNeighborhoodSearchResponse(undefined)).toEqual([]);
    expect(parseNeighborhoodSearchResponse(42)).toEqual([]);
  });
});
