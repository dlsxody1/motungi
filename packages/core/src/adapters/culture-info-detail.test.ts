import { describe, expect, it } from "vitest";
import {
  buildDetail2Url,
  isRateLimitError,
  nextRetryDelayMs,
  parseDetail2Description,
  selectPendingSeqs,
  summarizeBackfillOutcomes,
  type PendingBackfillRow,
} from "./culture-info-detail";

describe("buildDetail2Url", () => {
  it("serviceKey/seq로 detail2 URL을 조립한다(period2와 같은 base/인증 컨벤션)", () => {
    expect(buildDetail2Url("abc123", 987)).toBe(
      "https://apis.data.go.kr/B553457/cultureinfo/detail2?serviceKey=abc123&seq=987",
    );
  });

  it("serviceKey에 URL 특수문자가 있으면 인코딩한다(period2와 동일하게 여기서 인코딩)", () => {
    const url = buildDetail2Url("a+b/c==", "1");
    expect(url).toContain("serviceKey=a%2Bb%2Fc%3D%3D");
    expect(url).toContain("seq=1");
  });

  it("seq가 문자열로 와도 그대로 쓴다", () => {
    const url = buildDetail2Url("key", "12345");
    expect(url).toContain("seq=12345");
  });
});

describe("parseDetail2Description", () => {
  it("정상 detail2 XML에서 contents1을 추출한다", () => {
    const xml = `
      <response>
        <body>
          <items>
            <item>
              <seq>12345</seq>
              <title>가을 전시회</title>
              <contents1>가을을 주제로 한 사진 전시회입니다.<br>10월 한 달간 진행됩니다.</contents1>
            </item>
          </items>
        </body>
      </response>`;
    expect(parseDetail2Description(xml)).toBe(
      "가을을 주제로 한 사진 전시회입니다.\n10월 한 달간 진행됩니다.",
    );
  });

  it("CDATA·HTML 태그 섞인 값도 joinDescription/stripHtml로 정리된다", () => {
    // </p>와 <br>이 각각 개행 하나씩 만들어 연속 2개행 → stripHtml은 3개행 이상만 2줄로
    // 접으므로(util.test.ts와 동일 규칙) 2개행은 그대로 유지된다.
    const xml = `<item><contents1><![CDATA[<p>전시 안내</p><br>무료 관람]]></contents1></item>`;
    expect(parseDetail2Description(xml)).toBe("전시 안내\n\n무료 관람");
  });

  it("item이 없으면 undefined", () => {
    expect(parseDetail2Description("<response><body><items></items></body></response>")).toBeUndefined();
  });

  it("contents1 필드가 비어있으면 undefined", () => {
    const xml = `<item><seq>1</seq><title>제목만</title></item>`;
    expect(parseDetail2Description(xml)).toBeUndefined();
  });

  it("필드명을 커스텀으로 넘기면 그 필드를 읽는다", () => {
    const xml = `<item><contents2>다른 필드</contents2></item>`;
    expect(parseDetail2Description(xml, "contents2")).toBe("다른 필드");
  });
});

describe("isRateLimitError", () => {
  it("쿼터 초과 실제 에러 포맷(LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR)에서 true", () => {
    const xml = `
      <OpenAPI_ServiceResponse>
        <cmmMsgHeader>
          <errMsg>SERVICE ERROR</errMsg>
          <returnAuthMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</returnAuthMsg>
          <returnReasonCode>22</returnReasonCode>
        </cmmMsgHeader>
      </OpenAPI_ServiceResponse>`;
    expect(isRateLimitError(xml)).toBe(true);
  });

  it("정상 성공 응답에서는 false", () => {
    const xml = `<response><header><resultCode>00</resultCode></header><body><items><item><seq>1</seq></item></items></body></response>`;
    expect(isRateLimitError(xml)).toBe(false);
  });

  it("빈 문자열은 false", () => {
    expect(isRateLimitError("")).toBe(false);
  });
});

describe("nextRetryDelayMs", () => {
  it("attempt가 커질수록 단조 증가한다", () => {
    const d0 = nextRetryDelayMs(0, 1000);
    const d1 = nextRetryDelayMs(1, 1000);
    const d2 = nextRetryDelayMs(2, 1000);
    expect(d0).toBeLessThan(d1);
    expect(d1).toBeLessThan(d2);
  });

  it("baseMs * 2^attempt를 따른다(상한 이내)", () => {
    expect(nextRetryDelayMs(0, 500)).toBe(500);
    expect(nextRetryDelayMs(1, 500)).toBe(1000);
    expect(nextRetryDelayMs(3, 500)).toBe(4000);
  });

  it("상한(60초)을 넘지 않는다", () => {
    expect(nextRetryDelayMs(10, 1000)).toBe(60_000);
    expect(nextRetryDelayMs(100, 1000)).toBe(60_000);
  });

  it("음수 attempt는 0번째로 취급(방어)", () => {
    expect(nextRetryDelayMs(-1, 500)).toBe(500);
  });
});

describe("selectPendingSeqs", () => {
  const row = (over: Partial<PendingBackfillRow>): PendingBackfillRow => ({
    external_id: "1",
    source: "culture_info",
    description: null,
    ...over,
  });

  it("culture_info이고 description이 null인 행만 external_id를 반환한다", () => {
    const rows: PendingBackfillRow[] = [
      row({ external_id: "101", description: null }),
      row({ external_id: "102", description: "이미 채워짐" }),
      row({ external_id: "103", source: "trail" as PendingBackfillRow["source"] }),
      row({ external_id: "104", description: null }),
    ];
    expect(selectPendingSeqs(rows, 10)).toEqual(["101", "104"]);
  });

  it("limit을 넘지 않는다", () => {
    const rows: PendingBackfillRow[] = [
      row({ external_id: "1" }),
      row({ external_id: "2" }),
      row({ external_id: "3" }),
    ];
    expect(selectPendingSeqs(rows, 2)).toEqual(["1", "2"]);
  });

  it("external_id가 없는 행은 건너뛴다", () => {
    const rows: PendingBackfillRow[] = [row({ external_id: null }), row({ external_id: "5" })];
    expect(selectPendingSeqs(rows, 10)).toEqual(["5"]);
  });

  it("빈 배열은 빈 배열", () => {
    expect(selectPendingSeqs([], 10)).toEqual([]);
  });

  it("limit이 0이면 아무것도 선택하지 않는다", () => {
    expect(selectPendingSeqs([row({ external_id: "1" })], 0)).toEqual([]);
  });
});

describe("summarizeBackfillOutcomes", () => {
  it("success/failed/skipped 혼합 건수를 정확히 센다", () => {
    const r = summarizeBackfillOutcomes([
      { status: "success" },
      { status: "success" },
      { status: "failed" },
      { status: "skipped" },
      { status: "success" },
    ]);
    expect(r).toEqual({ success: 3, failed: 1, skipped: 1 });
  });

  it("빈 배열은 전부 0", () => {
    expect(summarizeBackfillOutcomes([])).toEqual({ success: 0, failed: 0, skipped: 0 });
  });

  it("부분 실패가 조용히 사라지지 않는다 — failed 1건도 누락 없이 집계", () => {
    const r = summarizeBackfillOutcomes([{ status: "failed" }]);
    expect(r.failed).toBe(1);
    expect(r.success).toBe(0);
  });
});
