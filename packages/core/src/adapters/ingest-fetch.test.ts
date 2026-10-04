import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dedupByKey,
  fetchGpxText,
  GPX_MAX_BYTES,
  inMetro,
  isAllowedGpxUrl,
  isCronAuthorized,
  isExpiredDeadline,
  isPlainRecord,
  judgeIngest,
  parseJsonItems,
  parseXmlItems,
  planPurge,
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

describe("isAllowedGpxUrl — M-059 SSRF 방지 (두루누비 GPX fetch 화이트리스트)", () => {
  it("https + 두루누비 호스트면 true", () => {
    expect(isAllowedGpxUrl("https://www.durunubi.kr/kor/gpx/course.gpx")).toBe(true);
  });
  it("http(비-https)면 false", () => {
    expect(isAllowedGpxUrl("http://www.durunubi.kr/kor/gpx/course.gpx")).toBe(false);
  });
  it("다른 호스트면 false (내부망/임의 서버 SSRF 시도)", () => {
    expect(isAllowedGpxUrl("https://evil.example.com/course.gpx")).toBe(false);
    expect(isAllowedGpxUrl("https://internal.durunubi.kr.evil.com/course.gpx")).toBe(false);
  });
  it("서브도메인이 정확히 일치하지 않으면 false", () => {
    expect(isAllowedGpxUrl("https://durunubi.kr/course.gpx")).toBe(false);
    expect(isAllowedGpxUrl("https://api.durunubi.kr/course.gpx")).toBe(false);
  });
  it("형식이 깨진 URL이면 false (new URL 실패)", () => {
    expect(isAllowedGpxUrl("not a url")).toBe(false);
    expect(isAllowedGpxUrl("durunubi.kr/course.gpx")).toBe(false);
  });
  it("null/undefined/빈 문자열이면 false", () => {
    expect(isAllowedGpxUrl(null)).toBe(false);
    expect(isAllowedGpxUrl(undefined)).toBe(false);
    expect(isAllowedGpxUrl("")).toBe(false);
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

describe("isExpiredDeadline / planPurge — M-126 마감 purge 판정(실제 함수)", () => {
  const today = "2026-08-08";
  it("과거 마감은 purge 대상", () => {
    expect(isExpiredDeadline("2026-07-01", today)).toBe(true);
  });
  it("null·undefined(상시)는 보존", () => {
    expect(isExpiredDeadline(null, today)).toBe(false);
    expect(isExpiredDeadline(undefined, today)).toBe(false);
  });
  it("미래 마감은 보존", () => {
    expect(isExpiredDeadline("2026-12-31", today)).toBe(false);
  });
  it("오늘(경계)은 보존 — .lt이므로 당일은 아직 안 지운다", () => {
    expect(isExpiredDeadline(today, today)).toBe(false);
  });
  it("정상 적재면 purge하고 cutoff는 today", () => {
    expect(planPurge({ allFailed: false }, today)).toEqual({ purge: true, cutoff: today });
  });
  it("전 소스 실패면 purge를 생략한다(M-040)", () => {
    expect(planPurge({ allFailed: true }, today).purge).toBe(false);
  });
  it("judgeIngest 결과를 그대로 넘길 수 있다 — 전부 실패 → 생략, 일부 실패 → 진행", () => {
    const fail = (source: string): IngestSourceResult => ({ source, fetched: 0, upserted: 0, error: "x" });
    const ok = (source: string): IngestSourceResult => ({ source, fetched: 1, upserted: 1 });
    expect(planPurge(judgeIngest([fail("a"), fail("b")]), today).purge).toBe(false);
    expect(planPurge(judgeIngest([fail("a"), ok("b")]), today).purge).toBe(true);
  });
});

describe("fetchGpxText — M-120 리다이렉트 재검증·타임아웃·크기 상한", () => {
  const OK = "https://www.durunubi.kr/a.gpx";
  afterEach(() => vi.unstubAllGlobals());

  it("정상 응답은 텍스트를 반환하고 redirect:manual + AbortSignal로 호출한다", async () => {
    const f = vi.fn().mockResolvedValue(new Response("<gpx/>", { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect(await fetchGpxText(OK)).toBe("<gpx/>");
    const init = f.mock.calls[0]?.[1] as RequestInit;
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("허용되지 않은 URL은 fetch 없이 throw", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(fetchGpxText("https://evil.example.com/a.gpx")).rejects.toThrow(/not allowed/);
    expect(f).not.toHaveBeenCalled();
  });

  it("허용 호스트 안의 리다이렉트는 따라가고, 밖으로 나가면 throw", async () => {
    const inHost = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/b.gpx" } }))
      .mockResolvedValueOnce(new Response("<gpx/>", { status: 200 }));
    vi.stubGlobal("fetch", inHost);
    expect(await fetchGpxText(OK)).toBe("<gpx/>");
    expect(inHost.mock.calls[1]?.[0]).toBe("https://www.durunubi.kr/b.gpx");

    const out = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://10.0.0.1/x" } }));
    vi.stubGlobal("fetch", out);
    await expect(fetchGpxText(OK)).rejects.toThrow(/not allowed/);
    expect(out).toHaveBeenCalledTimes(1);
  });

  it("리다이렉트 루프는 횟수 상한에서 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response(null, { status: 302, headers: { location: OK } })),
    );
    await expect(fetchGpxText(OK)).rejects.toThrow(/redirects/);
  });

  it("Content-Length가 상한을 넘으면 본문을 읽기 전에 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("x", { status: 200, headers: { "content-length": String(GPX_MAX_BYTES + 1) } }),
      ),
    );
    await expect(fetchGpxText(OK)).rejects.toThrow(/too large/);
  });

  it("Content-Length 없이 상한을 넘는 스트림도 throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(GPX_MAX_BYTES + 1))));
    await expect(fetchGpxText(OK)).rejects.toThrow(/too large/);
  });

  it("HTTP 오류는 throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 500 })));
    await expect(fetchGpxText(OK)).rejects.toThrow(/HTTP 500/);
  });
});
