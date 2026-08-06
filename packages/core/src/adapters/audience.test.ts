import { describe, expect, it } from "vitest";
import { isKidsOnly } from "./audience";

/**
 * 픽스처는 전부 실제 데이터다 — USE_TRGT는 서울시 문화행사 실응답, 제목은 운영 DB 실적재분.
 * 추정 문자열을 쓰면 표기 갈래를 놓쳐 게이트가 조용히 빗나간다.
 */
describe("isKidsOnly", () => {
  it("아동 전용 대상 표기는 제외한다", () => {
    expect(isKidsOnly("초등학생 4~6학년")).toBe(true);
    expect(isKidsOnly("미취학 아동 및 보호자")).toBe(true);
  });

  // 이 함수가 존재하는 이유. "이상"은 하한이라 성인도 포함한다.
  it("'○○ 이상'은 하한 표기라 제외하지 않는다", () => {
    expect(isKidsOnly("8세 이상 관람 가능")).toBe(false);
    expect(isKidsOnly("초등학생 이상")).toBe(false);
  });

  it("전연령·누구나 표기는 제외하지 않는다", () => {
    expect(isKidsOnly("어린이부터 누구나")).toBe(false);
    expect(isKidsOnly("전체관람가")).toBe(false);
  });

  it("대상 정보가 없으면 제목으로 판단한다", () => {
    expect(
      isKidsOnly(null, "[마포구립서강도서관] 8월/어린이 2026 어린이 여름 독서교실 [여름아, 읽자]"),
    ).toBe(true);
    expect(isKidsOnly(null, "2026 청소년을 위한 클래식 페스티벌")).toBe(true);
  });

  // 제목엔 상한없음 검사를 하지 않는다 — 제목의 "이상"은 대상 표기가 아니라 인명·전시명이다.
  // 실측: 제목에 "이상"을 가진 culture 8건 전부가 이런 경우였다.
  it("제목의 '이상'은 대상 표기가 아니므로 아동 판정에 영향을 주지 않는다", () => {
    expect(isKidsOnly(null, "[한솥아트스페이스] 이상원 개인전 [레스토피아 : RESTOPIA]")).toBe(false);
    expect(isKidsOnly(null, "⟪상, 상 이상: 모란조각대상의 작가들⟫")).toBe(false);
  });

  // 미상은 통과시킨다. 재적재 전까지 audience가 전 행 null이라, 제외하면 카탈로그가 빈다.
  it("판단 근거가 없으면 통과시킨다", () => {
    expect(isKidsOnly()).toBe(false);
    expect(isKidsOnly(null, null)).toBe(false);
    expect(isKidsOnly("", "")).toBe(false);
  });

  it("성인 대상 프로그램은 통과시킨다", () => {
    expect(isKidsOnly("성인", "[한성백제박물관] 성인 대상 [읽고 쓰는 백제사]")).toBe(false);
    expect(isKidsOnly(null, "[세종문화회관] 2026 누구나 클래식 with 대구시립교향악단")).toBe(false);
  });
});
