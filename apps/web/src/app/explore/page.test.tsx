/**
 * ExplorePage가 catalogStatus(ok/empty/error/unconfigured)에 따라
 * 올바른 문구/카드를 렌더하는지 검증한다. fetch 경로(useEnsureCatalog)는
 * 스토어를 idle이 아닌 상태로 시딩해서 우회한다.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import ExplorePage from "./page";

/**
 * 전역 setup의 next/navigation mock은 빈 searchParams를 준다.
 * URL 시드 동작을 검증하려면 테스트마다 파라미터를 바꿔야 해서 여기서 재정의한다.
 */
const searchParamsRef = { current: new URLSearchParams() };
const replaceSpy = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: (...args: unknown[]) => replaceSpy(...args),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/explore",
  useSearchParams: () => searchParamsRef.current,
}));

const ONE_PICK: MockOpportunity = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  title: "망원동 동네 전시",
  summary: "망원동 갤러리에서 열리는 소규모 전시",
  costKrw: 0,
  difficulty: 0.2,
  categoryLabel: "동네 문화·공연",
  costLabel: "무료",
  costUnit: "1인",
  costHeading: "참가비",
  matchScore: 92,
  meta: [],
  tone: "brand",
};

function seed(
  // "idle" = 조회 전/중. 이 상태를 시드해야 로딩 UI를 검증할 수 있다.
  catalogStatus: "idle" | "ok" | "empty" | "error" | "unconfigured",
  catalog: MockOpportunity[] = [],
) {
  // 데이터 슬라이스를 매 테스트마다 완전히 덮어써 이전 테스트의 잔여 상태를 제거한다
  // (액션 함수는 그대로 유지되므로 partial merge로 충분하다).
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog,
    catalogStatus,
    savedIds: [],
    user: null,
  });
}

describe("ExplorePage", () => {
  beforeEach(() => {
    seed("ok", []);
  });

  it("ok 상태 + 데이터 있음 → 활동 카드를 렌더한다", () => {
    seed("ok", [ONE_PICK]);

    render(<ExplorePage />);

    expect(screen.getAllByText("망원동 동네 전시").length).toBeGreaterThan(0);
    expect(screen.getAllByText("무료").length).toBeGreaterThan(0);
    expect(screen.queryByText(/불러오지 못했어요/)).not.toBeInTheDocument();
  });

  /**
   * idle(=조회 중)에 "아직 등록된 활동이 없어요"가 뜨던 버그의 회귀 테스트.
   * empty와 idle은 사용자에게 정반대의 사실이다 — 없는 것과 오는 중인 것.
   */
  it("idle 상태(조회 중) → 빈 문구 대신 로딩을 알린다", () => {
    seed("idle", []);

    render(<ExplorePage />);

    expect(screen.queryByText("아직 등록된 활동이 없어요. 곧 채워질 거예요.")).toBeNull();
    expect(screen.getAllByText("활동을 불러오는 중").length).toBeGreaterThan(0);
  });

  it("empty 상태(조회 성공, 0건) → 빈 카탈로그 안내 문구를 렌더한다", () => {
    seed("empty", []);

    render(<ExplorePage />);

    expect(screen.getAllByText("아직 등록된 활동이 없어요. 곧 채워질 거예요.").length).toBeGreaterThan(0);
  });

  it("error 상태(조회 실패) → 로드 실패 안내 문구를 렌더한다", () => {
    seed("error", []);

    render(<ExplorePage />);

    expect(
      screen.getAllByText("활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.").length,
    ).toBeGreaterThan(0);
  });

  it("unconfigured 상태(env 미설정) → 로드 실패 안내 문구를 렌더한다", () => {
    seed("unconfigured", []);

    render(<ExplorePage />);

    expect(
      screen.getAllByText("활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.").length,
    ).toBeGreaterThan(0);
  });
});

/**
 * M-005: catalog는 matchScore 0으로 적재되므로, 진단 답변이 있을 때만
 * 재스코어링해 추천순으로 정렬한다. 매칭 %는 화면에 표시하지 않는다.
 */
const FOOD: MockOpportunity = {
  ...ONE_PICK,
  id: "op-2",
  category: "food", // answers.interests에 없음 → fit 낮음
  title: "동네 국밥집",
  categoryLabel: "먹거리·마켓",
  costLabel: "₩8,000",
  costKrw: 8000,
  matchScore: 50,
};

function seedDiagnosed(catalog: MockOpportunity[]) {
  useAppStore.setState({
    anchors: {},
    answers: { interests: ["culture"], timeSlot: "weekday_evening", energy: "moderate" },
    results: [],
    catalog,
    catalogStatus: "ok",
    savedIds: [],
    user: null,
  });
}

describe("ExplorePage 매칭 랭킹 (M-005)", () => {
  afterEach(cleanup);

  it("진단 전(answers=null): '추천순' 정렬 옵션과 원픽 강조가 없다", () => {
    seed("ok", [ONE_PICK]);
    render(<ExplorePage />);
    // 추천순은 진단 시에만 나오는 정렬 옵션 → 진단 전엔 없음
    expect(screen.queryByRole("option", { name: "추천순" })).not.toBeInTheDocument();
    // 원픽 강조는 전면 제거됨
    expect(screen.queryByText("★ 원픽")).not.toBeInTheDocument();
  });

  it("진단 여부와 무관하게 매칭 % 뱃지는 표시하지 않는다", () => {
    seedDiagnosed([FOOD, ONE_PICK]); // matchScore 픽스처가 있어도 화면엔 안 뜸
    render(<ExplorePage />);
    expect(screen.queryByText(/매칭 \d+%/)).not.toBeInTheDocument();
  });

  it("진단 후: '추천순' 정렬 옵션 + 점수순(관심사 우선) 정렬", () => {
    // 입력 순서는 food 먼저지만, culture가 관심사에 있어 재스코어링 후 앞서야 한다.
    seedDiagnosed([FOOD, ONE_PICK]);
    render(<ExplorePage />);

    expect(screen.getByRole("option", { name: "추천순" })).toBeInTheDocument();

    // 재스코어링 후 culture(망원동 동네 전시)가 food보다 앞서야 한다.
    // 데스크탑 그리드 카드 제목만 뽑아 첫 번째가 culture인지 확인.
    const titles = screen
      .getAllByRole("button")
      .map((b) => within(b).queryByText(/망원동 동네 전시|동네 국밥집/)?.textContent)
      .filter((t): t is string => t != null);
    expect(titles[0]).toBe("망원동 동네 전시");
  });
});

/**
 * 검색 대상 확장 + AND 매칭.
 * summary는 "구 · 장소 · 장르" 조인 문자열이라 지역·장소는 원래 잡혔지만,
 * categoryLabel(우리가 붙인 라벨)은 어디에도 없어 그대로 치면 0건이었다.
 */
const JAZZ: MockOpportunity = {
  ...ONE_PICK,
  id: "op-jazz",
  title: "카즈미 타테이시 트리오 내한공연",
  summary: "마포구 · 마포아트센터 아트홀맥 · 재즈",
  categoryLabel: "동네 문화·공연",
  location: { dongName: "마포구" },
};

const TRAIL: MockOpportunity = {
  ...ONE_PICK,
  id: "op-trail",
  category: "active",
  title: "서해랑길 42코스",
  summary: "경기 화성시 · 12km · 바다를 따라 걷는 길",
  categoryLabel: "동네 산책·운동",
  location: { dongName: "경기 화성시" },
};

/**
 * 검색어 입력 후 150ms 디바운스가 반영되길 기다린다.
 * 모바일·데스크탑 트리가 동시에 마운트되므로(md:hidden / DesktopShell) 제목은 항상 복수다
 * → queryAllByText로 세고, 걸러졌으면 0이 된다.
 */
async function searchFor(text: string) {
  // 모바일·데스크탑 입력이 같은 state를 공유하므로 아무거나 하나에 넣으면 둘 다 걸린다.
  const [input] = screen.getAllByLabelText("활동 좁히기");
  fireEvent.change(input!, { target: { value: text } });
}
const countOf = (title: string) => screen.queryAllByText(title).length;

describe("ExplorePage 검색", () => {
  afterEach(cleanup);

  it("categoryLabel로 검색된다 — summary엔 없는 우리 라벨", async () => {
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    await searchFor("동네 문화·공연");

    await waitFor(() => expect(countOf("서해랑길 42코스")).toBe(0));
    expect(countOf("카즈미 타테이시 트리오 내한공연")).toBeGreaterThan(0);
  });

  it("구 이름으로 검색된다", async () => {
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    await searchFor("마포");

    await waitFor(() => expect(countOf("서해랑길 42코스")).toBe(0));
    expect(countOf("카즈미 타테이시 트리오 내한공연")).toBeGreaterThan(0);
  });

  it("공백으로 떨어진 두 단어를 AND로 매칭한다", async () => {
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    // 연속 부분문자열이 아니라 예전엔 0건이었다.
    await searchFor("마포 재즈");

    await waitFor(() => expect(countOf("서해랑길 42코스")).toBe(0));
    expect(countOf("카즈미 타테이시 트리오 내한공연")).toBeGreaterThan(0);
  });

  it("두 단어가 서로 다른 행에만 있으면 매칭되지 않는다(AND이므로)", async () => {
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    await searchFor("마포 서해랑길");

    await waitFor(() => expect(countOf("카즈미 타테이시 트리오 내한공연")).toBe(0));
    expect(countOf("서해랑길 42코스")).toBe(0);
  });
});

/**
 * URL 상태 — q·cat만 직렬화한다(region·sort·easyOnly 제외).
 * 리포트의 "더 찾아보기"가 ?cat=으로 프리필하는 경로가 여기에 의존한다.
 */
describe("ExplorePage URL 상태", () => {
  afterEach(() => {
    cleanup();
    searchParamsRef.current = new URLSearchParams();
    replaceSpy.mockClear();
  });

  it("?q=로 진입하면 검색어가 적용된 상태로 시작한다", async () => {
    searchParamsRef.current = new URLSearchParams("q=마포");
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    await waitFor(() => expect(countOf("서해랑길 42코스")).toBe(0));
    expect(countOf("카즈미 타테이시 트리오 내한공연")).toBeGreaterThan(0);
  });

  it("?cat=으로 진입하면 카테고리 필터가 적용된다", async () => {
    searchParamsRef.current = new URLSearchParams("cat=운동·산책");
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    await waitFor(() => expect(countOf("카즈미 타테이시 트리오 내한공연")).toBe(0));
    expect(countOf("서해랑길 42코스")).toBeGreaterThan(0);
  });

  it("모르는 cat 값은 무시하고 '전체'로 둔다", () => {
    searchParamsRef.current = new URLSearchParams("cat=없는카테고리");
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    // 둘 다 남아야 한다 — 존재하지 않는 필터로 목록이 비면 안 된다.
    expect(countOf("카즈미 타테이시 트리오 내한공연")).toBeGreaterThan(0);
    expect(countOf("서해랑길 42코스")).toBeGreaterThan(0);
  });

  it("검색어를 입력하면 URL에 q를 되쓴다", async () => {
    seed("ok", [JAZZ, TRAIL]);
    render(<ExplorePage />);

    await searchFor("재즈");

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/explore?q=%EC%9E%AC%EC%A6%88", { scroll: false });
    });
  });
});

describe("ExplorePage a11y (M-013)", () => {
  afterEach(cleanup);

  it("검색 input에 접근 가능한 이름(aria-label)이 있다", () => {
    seed("ok", [ONE_PICK]);
    render(<ExplorePage />);
    // 모바일·데스크탑 각각의 입력. 카피는 "검색"이 아니라 목록 좁히기 어휘다
    // (랜딩이 검색을 별도의 길로 안내하므로, 탐색 안의 입력은 필터로 읽혀야 한다).
    expect(screen.getAllByLabelText("활동 좁히기")).toHaveLength(2);
  });

  it("필터 칩이 선택 상태를 aria-pressed로 노출한다('전체' 기본 선택)", () => {
    seed("ok", [ONE_PICK]);
    render(<ExplorePage />);
    // 기본 활성 필터 '전체' → pressed 칩이 최소 1개
    expect(screen.getAllByRole("button", { pressed: true }).length).toBeGreaterThan(0);
  });
});

describe("ExplorePage 난이도 체크박스 포커스 링 (M-014)", () => {
  afterEach(cleanup);

  it("sr-only 체크박스는 peer 클래스를 갖고, 장식용 형제 span은 peer-focus-visible 링 클래스를 갖는다", () => {
    seed("ok", [ONE_PICK]);
    render(<ExplorePage />);

    const checkbox = screen.getByRole("checkbox", { name: "낮음만 보기 (방전형 추천)" });
    expect(checkbox).toHaveClass("peer");

    const decorativeSpan = checkbox.nextElementSibling;
    expect(decorativeSpan).not.toBeNull();
    expect(decorativeSpan!.className).toMatch(/peer-focus-visible/);
  });
});
