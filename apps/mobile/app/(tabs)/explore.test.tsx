/**
 * ExploreScreen(B1 · 탐색) 렌더 스모크.
 *
 * FlatList 전환(M-023) 이후 이 화면엔 렌더 테스트가 하나도 없어 "typecheck가 통과한다"가
 * 곧 "화면이 뜬다"를 뜻하지 않는 상태였다. 목록이 실제로 행을 렌더하는지와, 데이터가
 * 없을 때 ListEmptyComponent가 상태별 문구로 갈리는지만 본다(인터랙션은 범위 밖).
 *
 * 목업 컨벤션은 report.test.tsx와 동일 — store는 가변 state + selector 흉내,
 * useEnsureCatalog는 자체 테스트가 있으므로 vi.fn()으로 완전히 우회한다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import type { UserAnchors } from "@motungi/core";

const { pushMock, setAnchorMock, state } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  setAnchorMock: vi.fn(),
  state: {
    catalog: [] as MockOpportunity[],
    catalogStatus: "idle" as string,
    answers: null as unknown,
    anchors: {} as UserAnchors,
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: typeof state & { setAnchor: typeof setAnchorMock }) => unknown) =>
    selector({ ...state, setAnchor: setAnchorMock }),
}));

vi.mock("@/hooks/useEnsureCatalog", () => ({ useEnsureCatalog: vi.fn() }));

import ExploreScreen from "./explore";

function makeOpp(overrides: Partial<MockOpportunity> & { id: string; title: string }): MockOpportunity {
  return {
    source: "seoul_culture",
    category: "culture",
    summary: "요약 문구",
    categoryLabel: "문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 0,
    meta: [],
    tone: "brand",
    ...overrides,
  };
}

beforeEach(() => {
  pushMock.mockReset();
  setAnchorMock.mockReset();
  state.catalog = [];
  state.catalogStatus = "idle";
  state.answers = null;
  state.anchors = {};
});

describe("ExploreScreen", () => {
  it("카탈로그가 있으면 헤더·검색·활동 행을 렌더한다", () => {
    state.catalogStatus = "ok";
    state.anchors = { home: { dongName: "망원동" } };
    state.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시" }),
    ];

    render(<ExploreScreen />);

    expect(screen.getByText("탐색")).toBeInTheDocument();
    expect(screen.getByText("망원동")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("활동·키워드 검색")).toBeInTheDocument();
    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();
  });

  it("catalogStatus가 idle이면 스켈레톤을 렌더하고 빈 문구는 렌더하지 않는다(M-054)", () => {
    state.catalogStatus = "idle";
    state.catalog = [];

    const { container } = render(<ExploreScreen />);

    expect(
      container.querySelectorAll('[data-testid="explore-row-skeleton"]'),
    ).toHaveLength(6);
    expect(screen.queryByText("아직 등록된 활동이 없어요. 곧 채워질 거예요.")).not.toBeInTheDocument();
  });

  it("catalogStatus가 idle을 벗어나 진짜 비어있으면 빈 문구를 렌더하고 스켈레톤은 렌더하지 않는다(M-054)", () => {
    state.catalogStatus = "ok";
    state.catalog = [];

    const { container } = render(<ExploreScreen />);

    expect(screen.getByText("아직 등록된 활동이 없어요. 곧 채워질 거예요.")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="explore-row-skeleton"]')).toHaveLength(0);
  });

  it("카탈로그가 비어있고 catalogStatus가 error면 로드 실패 문구를 렌더한다", () => {
    state.catalogStatus = "error";

    render(<ExploreScreen />);

    expect(
      screen.getByText("활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
    ).toBeInTheDocument();
  });

  it("카탈로그가 비어있고 catalogStatus가 비에러면 '아직 등록된 활동이 없어요'를 렌더한다", () => {
    state.catalogStatus = "empty";

    render(<ExploreScreen />);

    expect(screen.getByText("아직 등록된 활동이 없어요. 곧 채워질 거예요.")).toBeInTheDocument();
  });

  it("지역 칩을 고르면 해당 구의 활동만 남는다(M-032)", () => {
    state.catalogStatus = "ok";
    state.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스", location: { dongName: "서울 마포구" } }),
      makeOpp({ id: "op-2", title: "성수 팝업 전시", location: { dongName: "서울 성동구" } }),
    ];

    render(<ExploreScreen />);

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.getByText("성수 팝업 전시")).toBeInTheDocument();

    fireEvent.click(screen.getByText("마포구 (1)"));

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(screen.queryByText("성수 팝업 전시")).not.toBeInTheDocument();
  });

  /**
   * 검색 회귀(M-104) — 이 화면엔 검색 테스트가 **하나도 없어서** web과 갈라진 걸 아무도 몰랐다.
   *
   * 예전 구현은 `${title} ${summary} ${genre}`를 조합해 통짜 `includes` 하나였다. 그래서
   * ① 두 단어를 띄어 치면 연속 부분문자열이 아니라 0건 ② 지역명·카테고리 라벨은 아예 검색 대상
   * 밖이었다. web은 같은 화면에서 셋 다 됐다 — 계산을 core로 올려(packages/core/src/explore.ts)
   * 양쪽이 같은 함수를 쓰게 하면서 고쳤다.
   *
   * 픽스처는 web page.test.tsx·core explore.test.ts와 같은 JAZZ/TRAIL이다.
   */
  describe("검색(M-104) — web과 동일 동작", () => {
    const seedJazzAndTrail = () => {
      state.catalogStatus = "ok";
      state.catalog = [
        makeOpp({
          id: "op-jazz",
          title: "카즈미 타테이시 트리오 내한공연",
          summary: "마포구 · 마포아트센터 아트홀맥 · 재즈",
          categoryLabel: "동네 문화·공연",
          location: { dongName: "마포구" },
        }),
        makeOpp({
          id: "op-trail",
          category: "active",
          title: "서해랑길 42코스",
          summary: "경기 화성시 · 12km · 바다를 따라 걷는 길",
          categoryLabel: "동네 산책·운동",
          location: { dongName: "경기 화성시" },
        }),
      ];
    };
    const searchFor = (text: string) =>
      fireEvent.change(screen.getByPlaceholderText("활동·키워드 검색"), {
        target: { value: text },
      });

    it("공백으로 떨어진 두 단어를 AND로 매칭한다", () => {
      seedJazzAndTrail();
      render(<ExploreScreen />);

      searchFor("마포 재즈");

      expect(screen.getByText("카즈미 타테이시 트리오 내한공연")).toBeInTheDocument();
      expect(screen.queryByText("서해랑길 42코스")).not.toBeInTheDocument();
    });

    it("구 이름으로 검색된다", () => {
      seedJazzAndTrail();
      render(<ExploreScreen />);

      searchFor("마포");

      expect(screen.getByText("카즈미 타테이시 트리오 내한공연")).toBeInTheDocument();
      expect(screen.queryByText("서해랑길 42코스")).not.toBeInTheDocument();
    });

    it("categoryLabel로 검색된다 — summary엔 없는 우리 라벨", () => {
      seedJazzAndTrail();
      render(<ExploreScreen />);

      searchFor("동네 문화·공연");

      expect(screen.getByText("카즈미 타테이시 트리오 내한공연")).toBeInTheDocument();
      expect(screen.queryByText("서해랑길 42코스")).not.toBeInTheDocument();
    });

    it("두 단어가 서로 다른 행에만 있으면 매칭되지 않는다(AND이므로)", () => {
      seedJazzAndTrail();
      render(<ExploreScreen />);

      searchFor("마포 서해랑길");

      expect(screen.queryByText("카즈미 타테이시 트리오 내한공연")).not.toBeInTheDocument();
      expect(screen.queryByText("서해랑길 42코스")).not.toBeInTheDocument();
    });
  });

  it("낮음만 보기를 켜면 난이도 0.33 초과 활동이 숨는다(M-032)", () => {
    state.catalogStatus = "ok";
    state.catalog = [
      makeOpp({ id: "op-1", title: "가벼운 산책", difficulty: 0.2 }),
      makeOpp({ id: "op-2", title: "고강도 클라이밍", difficulty: 0.8 }),
    ];

    render(<ExploreScreen />);
    fireEvent.click(screen.getByText("낮음만 보기"));

    expect(screen.getByText("가벼운 산책")).toBeInTheDocument();
    expect(screen.queryByText("고강도 클라이밍")).not.toBeInTheDocument();
  });

  it("앵커가 없으면 거리순 칩이 비활성(disabled)이다(M-032)", () => {
    state.catalogStatus = "ok";
    state.anchors = {};
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];

    render(<ExploreScreen />);

    const distanceChip = screen.getByText("거리순").closest("button");
    expect(distanceChip).toBeDisabled();
  });

  it("imageUrl이 있는 활동은 썸네일 이미지를 렌더한다(M-051)", () => {
    state.catalogStatus = "ok";
    state.catalog = [
      makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스", imageUrl: "https://example.test/a.jpg" }),
    ];

    const { container } = render(<ExploreScreen />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.test/a.jpg");
  });

  it("imageUrl이 없는 활동은 이미지 태그 없이 플레이스홀더만 렌더한다(M-051)", () => {
    state.catalogStatus = "ok";
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];

    const { container } = render(<ExploreScreen />);

    expect(screen.getByText("망원 한강 러닝 클래스")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("앵커가 있으면 거리순 정렬이 가까운 활동을 먼저 보여준다(M-032)", () => {
    state.catalogStatus = "ok";
    state.anchors = { home: { dongName: "망원동", point: { lat: 37.5556, lng: 126.9019 } } };
    state.catalog = [
      makeOpp({
        id: "far",
        title: "먼 활동",
        location: { dongName: "판교동", point: { lat: 37.3948, lng: 127.1112 } },
      }),
      makeOpp({
        id: "near",
        title: "가까운 활동",
        location: { dongName: "합정동", point: { lat: 37.5495, lng: 126.9138 } },
      }),
    ];

    render(<ExploreScreen />);
    fireEvent.click(screen.getByText("거리순"));

    const titles = screen.getAllByText(/활동$/).map((el) => el.textContent);
    expect(titles.indexOf("가까운 활동")).toBeLessThan(titles.indexOf("먼 활동"));
  });

  it("활동 행이 접근 가능한 button role로 노출된다(M-058)", () => {
    state.catalogStatus = "ok";
    state.catalog = [makeOpp({ id: "op-1", title: "망원 한강 러닝 클래스" })];

    render(<ExploreScreen />);

    expect(screen.getByText("망원 한강 러닝 클래스").closest('[role="button"]')).not.toBeNull();
  });

  describe("동네 변경(M-085)", () => {
    it("인기 동네를 고르면 setAnchor를 호출해 인라인으로 앵커를 갱신하고, 화면 이동은 하지 않는다", () => {
      state.catalogStatus = "ok";
      state.anchors = { home: { dongName: "성수동" } };

      render(<ExploreScreen />);

      fireEvent.click(screen.getByLabelText("동네 변경"));
      fireEvent.click(screen.getByText("망원동"));

      expect(setAnchorMock).toHaveBeenCalledTimes(1);
      expect(setAnchorMock).toHaveBeenCalledWith("home", {
        dongName: "망원동",
        admCode: undefined,
        region: "서울 마포구",
        point: { lat: 37.5556, lng: 126.9019 },
      });
      // 재진단 플로우로 튕겨나가지 않는다 — 탐색 화면에 그대로 머문다.
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("'동네 다시 설정하기'는 별도 동작으로 /location 재진단 플로우로 이동하고 setAnchor는 직접 호출하지 않는다", () => {
      state.catalogStatus = "ok";
      state.anchors = { home: { dongName: "성수동" } };

      render(<ExploreScreen />);

      fireEvent.click(screen.getByLabelText("동네 변경"));
      fireEvent.click(screen.getByText("동네 다시 설정하기"));

      expect(pushMock).toHaveBeenCalledWith("/location");
      expect(setAnchorMock).not.toHaveBeenCalled();
    });
  });
});
