import { describe, expect, it } from "vitest";
import {
  dedupByKey,
  inMetro,
  isCronAuthorized,
  isPlainRecord,
  judgeIngest,
  parseJsonItems,
  parseXmlItems,
  safeMapItems,
  type IngestSourceResult,
} from "./ingest-fetch";

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

  // M-028: 배열 원소 중 평범한 객체가 아닌 값은 매핑 단계까지 새어나가면 mapper가
  // .trim() 등을 던지고, 그 예외가 소스 전체 배치를 버리게 만든다 — 여기서 미리 걷어낸다.
  it("배열 원소 중 객체가 아닌 값(문자열/숫자/null/배열)은 걸러낸다", () => {
    const json = {
      response: {
        body: { items: { item: [{ a: "1" }, "이상한 문자열", 42, null, ["중첩", "배열"], { a: "2" }] } },
      },
    };
    expect(parseJsonItems(json)).toEqual([{ a: "1" }, { a: "2" }]);
  });

  it("단일 object quirk 값이 객체가 아니면(예: 문자열) 빈 배열", () => {
    const json = { response: { body: { items: { item: "이상한 문자열" } } } };
    expect(parseJsonItems(json)).toEqual([]);
  });
});

describe("isPlainRecord", () => {
  it("평범한 객체는 true", () => {
    expect(isPlainRecord({ a: "1" })).toBe(true);
    expect(isPlainRecord({})).toBe(true);
  });
  it("null·배열·원시값은 false", () => {
    expect(isPlainRecord(null)).toBe(false);
    expect(isPlainRecord(undefined)).toBe(false);
    expect(isPlainRecord([])).toBe(false);
    expect(isPlainRecord(["a"])).toBe(false);
    expect(isPlainRecord("문자열")).toBe(false);
    expect(isPlainRecord(42)).toBe(false);
  });
});

describe("safeMapItems — 항목 단위 격리(M-028)", () => {
  it("정상 항목은 그대로 매핑 결과에 남는다", () => {
    const { results, skipped } = safeMapItems([1, 2, 3], (n) => n * 10);
    expect(results).toEqual([10, 20, 30]);
    expect(skipped).toBe(0);
  });

  it("특정 항목에서 mapper가 던지면 그 항목만 건너뛰고 나머지는 살린다", () => {
    const mapper = (raw: { v: unknown }) => {
      // 실제 버그를 재현: 문자열 전제 코드가 숫자를 받으면 던진다.
      if (typeof raw.v !== "string") throw new TypeError("v는 문자열이어야 함");
      return raw.v.trim();
    };
    const items = [{ v: "  a  " }, { v: 42 }, { v: "  b  " }];
    const { results, skipped } = safeMapItems(items, mapper);
    expect(results).toEqual(["a", "b"]);
    expect(skipped).toBe(1);
  });

  it("모든 항목이 던져도 예외가 밖으로 새어나가지 않는다", () => {
    const mapper = () => {
      throw new Error("항상 실패");
    };
    expect(() => safeMapItems([1, 2, 3], mapper)).not.toThrow();
    const { results, skipped } = safeMapItems([1, 2, 3], mapper);
    expect(results).toEqual([]);
    expect(skipped).toBe(3);
  });

  it("빈 배열은 빈 결과", () => {
    const { results, skipped } = safeMapItems<number, number>([], (n) => n);
    expect(results).toEqual([]);
    expect(skipped).toBe(0);
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

describe("isCronAuthorized — M-026 cron 시크릿 검증", () => {
  it("헤더 값이 서버 시크릿과 일치하면 true", () => {
    expect(isCronAuthorized("s3cr3t", "s3cr3t")).toBe(true);
  });
  it("헤더 값이 다르면 false", () => {
    expect(isCronAuthorized("s3cr3t", "wrong")).toBe(false);
  });
  it("헤더가 없으면(null/undefined) false", () => {
    expect(isCronAuthorized("s3cr3t", null)).toBe(false);
    expect(isCronAuthorized("s3cr3t", undefined)).toBe(false);
  });
  it("서버 시크릿이 미설정(빈 값)이면 헤더가 무엇이든 항상 false — '시크릿 없음=통과' 금지", () => {
    expect(isCronAuthorized(undefined, "anything")).toBe(false);
    expect(isCronAuthorized(null, "anything")).toBe(false);
    expect(isCronAuthorized("", "")).toBe(false);
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

describe("judgeIngest — 적재 결과 판정", () => {
  const ok = (source: string, n: number): IngestSourceResult => ({
    source,
    fetched: n,
    upserted: n,
    error: undefined,
  });
  const fail = (source: string, msg: string): IngestSourceResult => ({
    source,
    fetched: 0,
    upserted: 0,
    error: msg,
  });

  it("전 소스 실패면 allFailed — 이게 ok:true로 나가면 실패가 성공처럼 보인다(M-040)", () => {
    // 실제로 겪은 상황: 키 secret이 비어 cron이 매일 '성공'을 반환하며 아무것도 적재하지 않았다.
    const r = judgeIngest([
      fail("seoul_culture", "SEOUL_OPENAPI_KEY 없음"),
      fail("culture_info", "DATA_GO_KR_SERVICE_KEY 없음"),
      fail("trail", "DATA_GO_KR_SERVICE_KEY 없음"),
    ]);
    expect(r.allFailed).toBe(true);
    expect(r.total).toBe(0);
    expect(r.failedSources).toEqual(["seoul_culture", "culture_info", "trail"]);
  });

  it("일부만 실패하면 allFailed가 아니다 — 나머지는 갱신됐으므로 정상 경로로 둔다", () => {
    const r = judgeIngest([ok("seoul_culture", 300), fail("trail", "HTTP 500")]);
    expect(r.allFailed).toBe(false);
    expect(r.failedSources).toEqual(["trail"]);
    expect(r.total).toBe(300);
  });

  it("전부 성공이면 실패 목록이 비어 있다", () => {
    const r = judgeIngest([ok("seoul_culture", 300), ok("culture_info", 234), ok("trail", 19)]);
    expect(r.allFailed).toBe(false);
    expect(r.failedSources).toEqual([]);
    expect(r.total).toBe(553); // 2026-08-03 실측 적재량
  });

  it("빈 배열은 allFailed가 아니다 — '실행할 소스가 없음'과 '전부 실패'는 다르다", () => {
    const r = judgeIngest([]);
    expect(r.allFailed).toBe(false);
    expect(r.total).toBe(0);
  });

  it("성공했지만 0건인 소스는 실패가 아니다(그날 신규 활동이 없을 수 있다)", () => {
    const r = judgeIngest([ok("trail", 0)]);
    expect(r.allFailed).toBe(false);
    expect(r.failedSources).toEqual([]);
  });
});
