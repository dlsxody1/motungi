/**
 * ExplorePage가 catalogStatus(ok/empty/error/unconfigured)에 따라
 * 올바른 문구/카드를 렌더하는지 검증한다. fetch 경로(useEnsureCatalog)는
 * 스토어를 idle이 아닌 상태로 시딩해서 우회한다.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
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
