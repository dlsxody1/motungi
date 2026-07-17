import { describe, expect, it } from "vitest";
import { dedupByKey, inMetro, parseJsonItems, parseXmlItems } from "./ingest-fetch";

describe("parseXmlItems", () => {
  it("CDATA 포함 태그를 값으로 추출", () => {
    const xml = `<items><item><title><![CDATA[제목 & 설명]]></title></item></items>`;
    expect(parseXmlItems(xml)).toEqual([{ title: "제목 & 설명" }]);
  });

  it("중첩 태그가 있는 item도 최상위 태그별로 추출", () => {
    const xml = `<items><item><a>1</a><b>2</b></item></items>`;
    expect(parseXmlItems(xml)).toEqual([{ a: "1", b: "2" }]);
  });

  it("빈 <item></item>은 결과에서 제외", () => {
    const xml = `<items><item></item><item><a>1</a></item></items>`;
    expect(parseXmlItems(xml)).toEqual([{ a: "1" }]);
  });

  it("item이 없으면 빈 배열", () => {
    expect(parseXmlItems("<items></items>")).toEqual([]);
  });
});

describe("parseJsonItems", () => {
  it("정상 배열 응답을 그대로 반환", () => {
    const json = { response: { body: { items: { item: [{ a: "1" }, { a: "2" }] } } } };
    expect(parseJsonItems(json)).toEqual([{ a: "1" }, { a: "2" }]);
  });

  it("단일 object quirk(결과 1건)는 배열로 정규화", () => {
    const json = { response: { body: { items: { item: { a: "1" } } } } };
    expect(parseJsonItems(json)).toEqual([{ a: "1" }]);
  });

  it("items가 빈 경우 빈 배열", () => {
    expect(parseJsonItems({ response: { body: { items: {} } } })).toEqual([]);
    expect(parseJsonItems({})).toEqual([]);
    expect(parseJsonItems(null)).toEqual([]);
  });

  it("body.items 형태(대체 경로)도 지원", () => {
    const json = { body: { items: [{ a: "1" }] } };
    expect(parseJsonItems(json)).toEqual([{ a: "1" }]);
  });
});

describe("inMetro", () => {
  it("서울로 시작하면 true", () => {
    expect(inMetro("서울특별시 마포구")).toBe(true);
  });
  it("경기/인천도 true", () => {
    expect(inMetro("경기도 수원시")).toBe(true);
    expect(inMetro("인천광역시 남동구")).toBe(true);
  });
  it("부산 등 수도권 밖이면 false", () => {
    expect(inMetro("부산광역시 해운대구")).toBe(false);
  });
  it("null/undefined는 true(미기재는 통과)", () => {
    expect(inMetro(null)).toBe(true);
    expect(inMetro(undefined)).toBe(true);
  });
});

describe("dedupByKey", () => {
  it("같은 key가 반복되면 두 번째부터 제외", () => {
    const items = [{ id: "a", v: 1 }, { id: "a", v: 2 }, { id: "b", v: 3 }];
    expect(dedupByKey(items, (i) => i.id)).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 3 },
    ]);
  });

  it("빈 배열은 빈 배열", () => {
    expect(dedupByKey<{ id: string }>([], (i) => i.id)).toEqual([]);
  });
});
