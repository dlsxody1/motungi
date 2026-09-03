import { describe, expect, it } from "vitest";
import { buildFacilityIndex, facilityKey, parseGuFromAddress } from "./kopis";

describe("facilityKey", () => {
  it("후행공백을 무시한다 — 실측 사전엔 '(재)정효문화재단 '처럼 공백이 붙어 온다", () => {
    expect(facilityKey("(재)정효문화재단 ")).toBe(facilityKey("(재)정효문화재단"));
  });

  it("내부 연속공백도 하나로 접는다", () => {
    expect(facilityKey("예술의전당  [서울]")).toBe(facilityKey("예술의전당 [서울]"));
  });

  it("빈 이름은 null — 키가 될 수 없다", () => {
    expect(facilityKey("   ")).toBeNull();
    expect(facilityKey(undefined)).toBeNull();
  });

  it("서로 다른 공연장을 같은 키로 뭉개지 않는다", () => {
    expect(facilityKey("한성아트홀(구. 인켈아트홀)")).not.toBe(facilityKey("한성아트홀"));
  });
});

describe("buildFacilityIndex", () => {
  it("이름 키로 시설ID를 찾는다", () => {
    const idx = buildFacilityIndex([
      { fcltynm: "연희예술극장", mt10id: "FC001234" },
      { fcltynm: "쌀롱드무지끄 ", mt10id: "FC005678" },
    ]);
    expect(idx.get(facilityKey("연희예술극장")!)).toBe("FC001234");
    // 사전 쪽 후행공백이 있어도 공백 없는 조회명으로 찾혀야 한다.
    expect(idx.get(facilityKey("쌀롱드무지끄")!)).toBe("FC005678");
  });

  it("이름·ID가 비면 건너뛴다(빈 키로 오염되지 않게)", () => {
    const idx = buildFacilityIndex([
      { fcltynm: "  ", mt10id: "FC000001" },
      { fcltynm: "정상", mt10id: "" },
    ]);
    expect(idx.size).toBe(0);
  });

  it("이름이 겹치면 먼저 온 것을 유지한다(뒤엣것이 조용히 덮어쓰지 않게)", () => {
    const idx = buildFacilityIndex([
      { fcltynm: "같은이름", mt10id: "FC000001" },
      { fcltynm: "같은이름", mt10id: "FC000002" },
    ]);
    expect(idx.get(facilityKey("같은이름")!)).toBe("FC000001");
  });
});

describe("parseGuFromAddress", () => {
  it("서울 주소에서 구를 뽑는다 — 실측 응답 형식", () => {
    expect(parseGuFromAddress("서울특별시 서초구 사임당로18길 52-2 (서초동) ")).toBe("서초구");
    expect(parseGuFromAddress("서울특별시 종로구 종로1길 50 (중학동)더케이트윈타워")).toBe("종로구");
  });

  it("경기·인천의 시/군도 뽑는다 — 수도권 필터가 읽는 값이다", () => {
    expect(parseGuFromAddress("경기도 성남시 분당구 …")).toBe("성남시");
    expect(parseGuFromAddress("인천광역시 미추홀구 …")).toBe("미추홀구");
  });

  it("구/시/군이 없으면 null — 지어내지 않는다", () => {
    expect(parseGuFromAddress("서울특별시 어딘가로 1")).toBeNull();
    expect(parseGuFromAddress("")).toBeNull();
    expect(parseGuFromAddress(undefined)).toBeNull();
  });
});
