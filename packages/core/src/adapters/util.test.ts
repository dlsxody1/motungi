import { describe, expect, it } from "vitest";
import {
  hashKey,
  joinDescription,
  parseFeeKrw,
  parseHour,
  parseHttpUrl,
  parsePoint,
  parseGpxPoints,
  parseTrailGuide,
  stripHtml,
  toIsoDate,
} from "./util";

describe("parseHttpUrl", () => {
  it("http(s) URL은 그대로 통과시킨다", () => {
    expect(parseHttpUrl("https://example.org/event")).toBe("https://example.org/event");
    expect(parseHttpUrl("http://example.org")).toBe("http://example.org");
  });

  it("앞뒤 공백은 잘라낸다", () => {
    expect(parseHttpUrl("  https://example.org  ")).toBe("https://example.org");
  });

  it("javascript:/data:/intent: 등 비 http(s) 스킴은 거부한다(M-077)", () => {
    expect(parseHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(parseHttpUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(parseHttpUrl("intent://scan/#Intent;scheme=zxing;end")).toBeUndefined();
  });

  it("깨진 URL·빈 값·undefined는 거부한다", () => {
    expect(parseHttpUrl("not a url")).toBeUndefined();
    expect(parseHttpUrl("")).toBeUndefined();
    expect(parseHttpUrl(undefined)).toBeUndefined();
    expect(parseHttpUrl("   ")).toBeUndefined();
  });
});

describe("stripHtml", () => {
  it("<br>은 개행으로 바꿔 문장이 붙지 않게 한다", () => {
    // 두루누비 실제 형식 — <br>을 지우기만 하면 "코스- 부산의"로 붙는다.
    const raw = "송도해수욕장까지 이어지는 코스<br>- 부산의 유명 관광지들을 둘러볼 수 있는 코스<br>";
    expect(stripHtml(raw)).toBe(
      "송도해수욕장까지 이어지는 코스\n- 부산의 유명 관광지들을 둘러볼 수 있는 코스",
    );
  });
  it("<br/>·<br />·대문자 BR도 처리한다", () => {
    expect(stripHtml("가<br/>나<br />다<BR>라")).toBe("가\n나\n다\n라");
  });
  it("일반 태그는 제거한다", () => {
    expect(stripHtml("<p>본문<strong>강조</strong></p>")).toBe("본문강조");
  });
  it("순수 텍스트엔 무영향(멱등)", () => {
    const t = "태그 없는 설명문";
    expect(stripHtml(t)).toBe(t);
    expect(stripHtml(stripHtml(t))).toBe(t);
  });
  it("빈 값·태그만 있는 값은 undefined", () => {
    expect(stripHtml("")).toBeUndefined();
    expect(stripHtml(undefined)).toBeUndefined();
    expect(stripHtml("<br><br>")).toBeUndefined();
  });
  it("3줄 이상 연속 개행은 2줄로 접는다", () => {
    expect(stripHtml("가<br><br><br><br>나")).toBe("가\n\n나");
  });
});

describe("joinDescription", () => {
  it("여러 조각을 빈 줄로 잇는다", () => {
    expect(joinDescription(["요약문", "상세 내용"])).toBe("요약문\n\n상세 내용");
  });
  it("완전히 같은 조각은 한 번만 넣는다(crsSummary ⊂ crsContents 대비)", () => {
    expect(joinDescription(["같은 문장", "같은 문장"])).toBe("같은 문장");
  });
  it("빈 조각은 건너뛴다", () => {
    expect(joinDescription([undefined, "본문", "", "<br>"])).toBe("본문");
  });
  it("전부 비면 undefined (DB null)", () => {
    expect(joinDescription([undefined, "", "<br>"])).toBeUndefined();
    expect(joinDescription([])).toBeUndefined();
  });
  it("조각 안의 HTML도 함께 정리된다", () => {
    expect(joinDescription(["<p>가</p>", "나<br>다"])).toBe("가\n\n나\n다");
  });
});

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

describe("parseTrailGuide", () => {
  // 아래 원문은 두루누비 courseList 실응답에서 그대로 가져온 것.
  it("서해랑길류: 시점·교통편·종점을 뽑는다", () => {
    const raw =
      "- 시점: 화성시 서신면 궁평리 궁평리어촌체험안내소<br>교통편) 수원역에서 400번 버스 승차 '궁평항'정류장에서 하차<br>- 종점: 화성시 서신면 전곡리 전곡항<br>- 관광지로 유명한 제부도 옆을 지나므로 일정에 포함시키는 것을 추천";
    const g = parseTrailGuide(raw);
    expect(g.start).toBe(
      "화성시 서신면 궁평리 궁평리어촌체험안내소 (수원역에서 400번 버스 승차 '궁평항'정류장에서 하차)",
    );
    expect(g.end).toBe("화성시 서신면 전곡리 전곡항");
    expect(g.notes).toBeUndefined();
  });

  it("DMZ류: 시점이 없으면 주의사항 목록으로 준다", () => {
    const raw =
      "- 도심구간으로 화장실 및 매점 이용 쉽다.<br>- 일산대교 통행 시 보차분리는 이루어져 있으나 신호등 미설치 및 북단 부근 노선 단절로 주의 필요하다";
    const g = parseTrailGuide(raw);
    expect(g.start).toBeUndefined();
    expect(g.notes).toHaveLength(2);
    expect(g.notes?.[0]).toBe("도심구간으로 화장실 및 매점 이용 쉽다.");
  });

  it("교통편이 없어도 시점만으로 성립한다", () => {
    const g = parseTrailGuide("- 시점: 강화군 곤릉버스정류장<br>- 종점: 강화파출소");
    expect(g.start).toBe("강화군 곤릉버스정류장");
    expect(g.end).toBe("강화파출소");
  });

  it("빈 값·태그뿐이면 아무것도 주지 않는다", () => {
    expect(parseTrailGuide("<br>")).toEqual({});
    expect(parseTrailGuide("")).toEqual({});
    expect(parseTrailGuide(undefined)).toEqual({});
  });
});

describe("parseGpxPoints", () => {
  const gpx = (n: number) =>
    `<gpx>${Array.from({ length: n }, (_, i) => `<trkpt lat="37.${1000 + i}" lon="126.${2000 + i}"></trkpt>`).join("")}</gpx>`;

  it("trkpt lat/lon을 순서대로 뽑는다", () => {
    const pts = parseGpxPoints('<gpx><trkpt lat="37.5" lon="126.9"/><trkpt lat="37.6" lon="127.0"/></gpx>');
    expect(pts).toEqual([
      [37.5, 126.9],
      [37.6, 127.0],
    ]);
  });

  it("lon이 lat보다 앞서 와도 파싱한다", () => {
    expect(parseGpxPoints('<gpx><trkpt lon="126.9" lat="37.5"/></gpx>')).toEqual([[37.5, 126.9]]);
  });

  it("rtept/wpt도 인식한다", () => {
    expect(parseGpxPoints('<rtept lat="1" lon="2"/><wpt lat="3" lon="4"/>')).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("maxPoints 이하면 그대로 둔다", () => {
    expect(parseGpxPoints(gpx(50), 200)).toHaveLength(50);
  });

  it("maxPoints를 넘으면 균등 샘플링하되 시작·끝은 보존한다", () => {
    const all = parseGpxPoints(gpx(1509), 10_000);
    const sub = parseGpxPoints(gpx(1509), 200);
    expect(sub).toHaveLength(200);
    expect(sub[0]).toEqual(all[0]);
    expect(sub.at(-1)).toEqual(all.at(-1));
  });

  it("좌표가 없으면 빈 배열", () => {
    expect(parseGpxPoints("<gpx></gpx>")).toEqual([]);
    expect(parseGpxPoints('<gpx><trkpt lat="abc" lon="x"/></gpx>')).toEqual([]);
  });
});
