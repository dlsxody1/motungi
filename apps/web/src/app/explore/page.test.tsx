/**
 * ExplorePage가 catalogStatus(ok/empty/error/unconfigured)에 따라
 * 올바른 문구/카드를 렌더하는지 검증한다. fetch 경로(useEnsureCatalog)는
 * 스토어를 idle이 아닌 상태로 시딩해서 우회한다.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import ExplorePage from "./page";

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

function seed(catalogStatus: "ok" | "empty" | "error" | "unconfigured", catalog: MockOpportunity[] = []) {
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
 * 재스코어링해 매칭 %를 표시·정렬하고, 진단 전에는 매칭 UI를 숨긴다.
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

  it("진단 전(answers=null): 매칭 % 뱃지·'매칭순 정렬' 라벨을 숨긴다", () => {
    seed("ok", [ONE_PICK]); // matchScore 92 픽스처가 있어도 표시 안 됨
    render(<ExplorePage />);
    expect(screen.queryByText(/매칭 \d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText("매칭순 정렬")).not.toBeInTheDocument();
    expect(screen.queryByText("★ 원픽")).not.toBeInTheDocument();
  });

  it("진단 후: 매칭 % 표시 + '매칭순 정렬' 라벨 + 점수순(관심사 우선) 정렬", () => {
    // 입력 순서는 food 먼저지만, culture가 관심사에 있어 재스코어링 후 앞서야 한다.
    seedDiagnosed([FOOD, ONE_PICK]);
    render(<ExplorePage />);

    expect(screen.getAllByText(/매칭 \d+%/).length).toBeGreaterThan(0);
    expect(screen.getByText("매칭순 정렬")).toBeInTheDocument();

    // 데스크탑 첫 카드(★ 원픽)가 culture 항목이어야 한다.
    const pick = screen.getByText("★ 원픽");
    const card = pick.closest("button");
    expect(card).not.toBeNull();
    expect(within(card!).getByText("망원동 동네 전시")).toBeInTheDocument();
  });
});

describe("ExplorePage a11y (M-013)", () => {
  afterEach(cleanup);

  it("검색 input에 접근 가능한 이름(aria-label)이 있다", () => {
    seed("ok", [ONE_PICK]);
    render(<ExplorePage />);
    // 모바일·데스크탑 각각의 검색 input
    expect(screen.getByLabelText("활동·키워드 검색")).toBeInTheDocument();
    expect(screen.getByLabelText("활동 검색")).toBeInTheDocument();
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
