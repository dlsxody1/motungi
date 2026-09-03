import { describe, expect, it } from "vitest";
import { GENRE_ALIASES, normalizeGenre } from "./genre";

describe("normalizeGenre", () => {
  /**
   * 소스마다 같은 개념을 다른 이름으로 준다(실측 2026-09-03):
   *   전시/미술(seoul_culture 55) vs 전시(culture_info 44)
   *   콘서트(17)            vs 음악/콘서트(17)
   *   무용(10)              vs 무용/발레(1)
   * 통합 라벨이 없으면 "미술"로 검색했을 때 culture_info의 44건이 통째로 안 잡힌다.
   */
  it("소스별로 갈린 같은 개념을 한 라벨로 모은다", () => {
    expect(normalizeGenre("전시/미술")).toBe(normalizeGenre("전시"));
    expect(normalizeGenre("콘서트")).toBe(normalizeGenre("음악/콘서트"));
    expect(normalizeGenre("무용")).toBe(normalizeGenre("무용/발레"));
  });

  it("축제 하위 분류를 하나로 모은다 — 축제-문화/예술·축제-기타·행사/축제", () => {
    const festival = normalizeGenre("축제-문화/예술");
    expect(normalizeGenre("축제-기타")).toBe(festival);
    expect(normalizeGenre("축제-시민화합")).toBe(festival);
    expect(normalizeGenre("행사/축제")).toBe(festival);
  });

  it("클래식·국악·독주/독창회는 음악으로 모인다", () => {
    const music = normalizeGenre("콘서트");
    expect(normalizeGenre("클래식")).toBe(music);
    expect(normalizeGenre("국악")).toBe(music);
    expect(normalizeGenre("독주/독창회")).toBe(music);
  });

  it("서로 다른 개념은 섞지 않는다", () => {
    expect(normalizeGenre("전시")).not.toBe(normalizeGenre("연극"));
    expect(normalizeGenre("영화")).not.toBe(normalizeGenre("교육/체험"));
  });

  it("kopis 어휘도 같은 라벨로 모인다 — 소스가 셋이 되면서 음악이 3갈래로 갈렸다", () => {
    // 실측(2026-09-03, 서울 300건): 서양음악(클래식) 99 · 대중음악 83 · 한국음악(국악) 21.
    expect(normalizeGenre("서양음악(클래식)")).toBe("음악");
    expect(normalizeGenre("대중음악")).toBe("음악");
    expect(normalizeGenre("한국음악(국악)")).toBe("음악");
    // 기존 소스의 "콘서트"·"클래식"과 같은 라벨이어야 필터가 한 줄로 선다.
    expect(normalizeGenre("서양음악(클래식)")).toBe(normalizeGenre("클래식"));
    expect(normalizeGenre("무용(서양/한국무용)")).toBe("무용");
    expect(normalizeGenre("대중무용")).toBe("무용");
    // kopis는 "뮤지컬"만 주는데 기존 소스는 "뮤지컬/오페라"다 — 갈리면 안 된다.
    expect(normalizeGenre("뮤지컬")).toBe(normalizeGenre("뮤지컬/오페라"));
  });

  it("모르는 값은 원문을 그대로 돌려준다 — 새 장르가 사라지지 않게", () => {
    expect(normalizeGenre("판소리")).toBe("판소리");
    expect(normalizeGenre("  서커스  ")).toBe("서커스");
  });

  it("null·빈값은 undefined", () => {
    expect(normalizeGenre(null)).toBeUndefined();
    expect(normalizeGenre(undefined)).toBeUndefined();
    expect(normalizeGenre("   ")).toBeUndefined();
  });

  it("멱등 — 정규화 결과를 다시 넣어도 같다", () => {
    for (const raw of Object.keys(GENRE_ALIASES)) {
      const once = normalizeGenre(raw)!;
      expect(normalizeGenre(once)).toBe(once);
    }
  });
});
