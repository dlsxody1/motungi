/**
 * 탐색 목록 연산 테스트.
 *
 * **이 파일이 web·mobile 동작 일치의 기준선이다.** 아래 JAZZ/TRAIL 픽스처와 검색 케이스는
 * web의 `apps/web/src/app/explore/(list)/page.test.tsx`에서 그대로 가져왔다 —
 * 두 앱이 같은 입력에 같은 기대를 갖는지를 여기서 못박는다. 여기가 깨지면
 * 둘 중 하나가 조용히 갈라졌다는 뜻이다(M-104가 정확히 그 사고였다).
 */
import { describe, expect, it } from "vitest";
import {
  buildSearchHaystacks,
  EASY_DIFFICULTY_MAX,
  exploreCategoryCounts,
  exploreRegionCounts,
  filterExplore,
  matchesTerms,
  searchHaystack,
  searchTerms,
  sortByDistance,
  type ExploreItem,
} from "./explore";

function item(over: Partial<ExploreItem> & { id: string }): ExploreItem {
  return {
    source: "seoul_culture",
    category: "culture",
    title: "제목",
    summary: "요약",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "동네 문화·공연",
    ...over,
  } as ExploreItem;
}

/** web page.test.tsx와 동일한 픽스처 — 두 앱의 기대를 한곳에 고정한다. */
const JAZZ = item({
  id: "op-jazz",
  title: "카즈미 타테이시 트리오 내한공연",
  summary: "마포구 · 마포아트센터 아트홀맥 · 재즈",
  categoryLabel: "동네 문화·공연",
  location: { dongName: "마포구" },
});

const TRAIL = item({
  id: "op-trail",
  category: "active",
  title: "서해랑길 42코스",
  summary: "경기 화성시 · 12km · 바다를 따라 걷는 길",
  categoryLabel: "동네 산책·운동",
  location: { dongName: "경기 화성시" },
});

/** 검색 헬퍼 — 실제 호출부(web·mobile)가 하는 조립을 그대로 따라한다. */
function search(items: readonly ExploreItem[], query: string): string[] {
  return filterExplore(items, {
    category: null,
    region: null,
    terms: searchTerms(query),
    easyOnly: false,
    haystacks: buildSearchHaystacks(items),
  }).map((o) => o.id);
}

describe("searchHaystack", () => {
  it("제목·요약·카테고리 라벨을 모두 담는다", () => {
    const hay = searchHaystack(JAZZ);
    expect(hay).toContain("카즈미");
    expect(hay).toContain("아트홀맥");
    // categoryLabel은 우리가 붙인 라벨이라 summary 어디에도 없다 — 따로 넣지 않으면 0건이 된다.
    expect(hay).toContain("동네 문화·공연");
  });

  it("동 이름과 정규화한 구 이름을 함께 담는다", () => {
    const hay = searchHaystack(item({ id: "x", location: { dongName: "서울 마포구" } }));
    expect(hay).toContain("서울 마포구");
    expect(hay).toContain("마포구");
  });

  it("genre는 원문과 통합 라벨을 둘 다 담는다", () => {
    // 소스마다 어휘가 갈린다(전시/미술 vs 전시). 원문만 넣으면 한쪽이 통째로 빠진다.
    const hay = searchHaystack(item({ id: "x", genre: "전시/미술" }));
    expect(hay).toContain("전시/미술");
    expect(hay).toContain("미술");
  });

  it("없는 필드가 \"undefined\" 문자열로 새지 않는다", () => {
    const hay = searchHaystack(item({ id: "x", title: "제목", summary: "요약" }));
    expect(hay).not.toContain("undefined");
  });

  it("전부 소문자로 만든다", () => {
    expect(searchHaystack(item({ id: "x", title: "Jazz Night" }))).toContain("jazz night");
  });
});

describe("searchTerms", () => {
  it("공백으로 쪼개고 앞뒤·연속 공백을 버린다", () => {
    expect(searchTerms("  망원  재즈  ")).toEqual(["망원", "재즈"]);
  });

  it("빈 검색어는 빈 배열", () => {
    expect(searchTerms("")).toEqual([]);
    expect(searchTerms("   ")).toEqual([]);
  });

  it("소문자로 만든다", () => {
    expect(searchTerms("Jazz")).toEqual(["jazz"]);
  });
});

describe("matchesTerms", () => {
  it("검색어가 없으면 전부 통과한다", () => {
    expect(matchesTerms("아무거나", [])).toBe(true);
    expect(matchesTerms(undefined, [])).toBe(true);
  });

  it("하이스택이 없는 행은 검색어가 있으면 탈락한다", () => {
    expect(matchesTerms(undefined, ["마포"])).toBe(false);
  });

  it("모든 term이 있어야 통과한다(AND)", () => {
    expect(matchesTerms("마포구 재즈 공연", ["마포", "재즈"])).toBe(true);
    expect(matchesTerms("마포구 재즈 공연", ["마포", "산책"])).toBe(false);
  });
});

/** web page.test.tsx "ExplorePage 검색"의 4개 케이스를 그대로 옮긴 것. */
describe("검색 (web page.test.tsx와 동일 케이스)", () => {
  it("categoryLabel로 검색된다 — summary엔 없는 우리 라벨", () => {
    expect(search([JAZZ, TRAIL], "동네 문화·공연")).toEqual(["op-jazz"]);
  });

  it("구 이름으로 검색된다", () => {
    expect(search([JAZZ, TRAIL], "마포")).toEqual(["op-jazz"]);
  });

  it("공백으로 떨어진 두 단어를 AND로 매칭한다", () => {
    // 연속 부분문자열이 아니라 통짜 includes로는 0건이었다(mobile이 이 상태였다).
    expect(search([JAZZ, TRAIL], "마포 재즈")).toEqual(["op-jazz"]);
  });

  it("두 단어가 서로 다른 행에만 있으면 매칭되지 않는다(AND이므로)", () => {
    expect(search([JAZZ, TRAIL], "마포 서해랑길")).toEqual([]);
  });
});

describe("filterExplore", () => {
  const haystacks = buildSearchHaystacks([JAZZ, TRAIL]);
  const base = { category: null, region: null, terms: [], easyOnly: false, haystacks } as const;

  it("카테고리로 거른다", () => {
    expect(filterExplore([JAZZ, TRAIL], { ...base, category: "active" }).map((o) => o.id)).toEqual([
      "op-trail",
    ]);
  });

  it("지역(구)으로 거른다", () => {
    expect(filterExplore([JAZZ, TRAIL], { ...base, region: "마포구" }).map((o) => o.id)).toEqual([
      "op-jazz",
    ]);
  });

  it("카테고리와 지역을 함께 만족해야 한다", () => {
    expect(filterExplore([JAZZ, TRAIL], { ...base, category: "culture", region: "화성시" })).toEqual(
      [],
    );
  });

  it("easyOnly는 경계값을 포함하고 그 위를 버린다", () => {
    const easy = item({ id: "easy", difficulty: EASY_DIFFICULTY_MAX });
    const hard = item({ id: "hard", difficulty: EASY_DIFFICULTY_MAX + 0.01 });
    const hs = buildSearchHaystacks([easy, hard]);
    expect(
      filterExplore([easy, hard], { ...base, haystacks: hs, easyOnly: true }).map((o) => o.id),
    ).toEqual(["easy"]);
  });

  it("easyOnly는 난이도를 모르는 행을 제외한다", () => {
    // "낮은 난이도"라고 볼 근거가 없으므로 포함하면 거짓말이 된다.
    const unknown = item({ id: "unknown", difficulty: undefined });
    const hs = buildSearchHaystacks([unknown]);
    expect(filterExplore([unknown], { ...base, haystacks: hs, easyOnly: true })).toEqual([]);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const src = [JAZZ, TRAIL];
    filterExplore(src, { ...base, category: "active" });
    expect(src.map((o) => o.id)).toEqual(["op-jazz", "op-trail"]);
  });
});

describe("sortByDistance", () => {
  const anchors = { home: { point: { lat: 37.5, lng: 127.0 } } };
  const near = item({ id: "near", location: { point: { lat: 37.501, lng: 127.001 } } });
  const far = item({ id: "far", location: { point: { lat: 37.7, lng: 127.3 } } });
  const noCoord = item({ id: "no-coord" });

  it("가까운 순으로 정렬한다", () => {
    expect(sortByDistance([far, near], anchors).map((o) => o.id)).toEqual(["near", "far"]);
  });

  it("좌표가 없는 행은 뒤로 보낸다", () => {
    expect(sortByDistance([noCoord, far, near], anchors).map((o) => o.id)).toEqual([
      "near",
      "far",
      "no-coord",
    ]);
  });

  it("집·회사 중 가까운 쪽을 기준으로 삼는다", () => {
    // near는 home 옆, far는 work 옆 — 둘 다 "가깝다"고 판정돼야 한다.
    const both = { home: { point: { lat: 37.5, lng: 127.0 } }, work: { point: { lat: 37.7, lng: 127.3 } } };
    const sorted = sortByDistance([noCoord, far, near], both).map((o) => o.id);
    expect(sorted[2]).toBe("no-coord");
    expect(sorted.slice(0, 2).sort()).toEqual(["far", "near"]);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const src = [far, near];
    sortByDistance(src, anchors);
    expect(src.map((o) => o.id)).toEqual(["far", "near"]);
  });
});

describe("exploreRegionCounts", () => {
  it("구별로 세고 많은 순으로 준다", () => {
    const items = [
      item({ id: "a", location: { dongName: "마포구" } }),
      item({ id: "b", location: { dongName: "마포구" } }),
      item({ id: "c", location: { dongName: "강남구" } }),
    ];
    expect(exploreRegionCounts(items)).toEqual([
      { label: "마포구", count: 2 },
      { label: "강남구", count: 1 },
    ]);
  });

  it("표기가 달라도 같은 구로 합친다", () => {
    // "서울 마포구"와 "마포구"가 따로 세어지면 칩이 둘로 갈라진다.
    const items = [
      item({ id: "a", location: { dongName: "서울 마포구" } }),
      item({ id: "b", location: { dongName: "마포구" } }),
    ];
    expect(exploreRegionCounts(items)).toEqual([{ label: "마포구", count: 2 }]);
  });

  it("구를 알 수 없는 행은 세지 않는다", () => {
    expect(exploreRegionCounts([item({ id: "a" })])).toEqual([]);
  });
});

describe("exploreCategoryCounts", () => {
  it("\"전체\"는 전체 길이이고 필터 순서를 유지한다", () => {
    const counts = exploreCategoryCounts([JAZZ, TRAIL]);
    expect(counts[0]).toEqual({ label: "전체", category: null, count: 2 });
    expect(counts.find((c) => c.category === "culture")?.count).toBe(1);
    expect(counts.find((c) => c.category === "active")?.count).toBe(1);
  });

  it("해당 활동이 없는 카테고리는 0으로 준다(거르지 않는다)", () => {
    // 거르는 건 UI 결정이라 호출부가 한다 — web은 건수를 칩에 표시하고 mobile은 하지 않는다.
    expect(exploreCategoryCounts([JAZZ]).find((c) => c.category === "food")?.count).toBe(0);
  });
});
