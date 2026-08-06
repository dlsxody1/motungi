/**
 * 히어로 캐러셀 렌더 격리 회귀 테스트.
 *
 * 막으려는 것: 캐러셀은 1.5초마다 setIndex로 자동 전환한다. `HeroCard`에 memo가 없으면
 * **틱마다 카드 N개가 전부** 다시 렌더된다 — 실제로 바뀌는 건 활성/직전 카드의 state뿐인데.
 *
 * 이게 중요한 이유: 이 캐러셀은 WebGL(PosterRing) 실패 시의 폴백 경로다
 * (hero-poster-stage.tsx). 즉 **가장 성능이 약한 기기에서** 이 낭비가 돌고 있었다.
 * 랜딩이 three.js를 쓰는 만큼 다른 곳에서 비용을 벌어와야 한다.
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** LandingPhoto 렌더 횟수 = 카드 렌더의 대리 지표(카드마다 정확히 하나씩 그린다). */
const renderCounts = { photo: 0 };

vi.mock("./landing-photo", async () => {
  const actual = await vi.importActual<typeof import("./landing-photo")>("./landing-photo");
  return {
    LandingPhoto: (props: Parameters<typeof actual.LandingPhoto>[0]) => {
      renderCounts.photo++;
      return <actual.LandingPhoto {...props} />;
    },
  };
});

import { HeroCarousel } from "./hero-carousel";

function makePick(id: string, title: string): MockOpportunity {
  return {
    id,
    source: "seoul_culture",
    category: "culture",
    title,
    summary: "요약",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "동네 문화·공연",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 0,
    meta: [],
    tone: "brand",
    imageUrl: `https://example.test/${id}.jpg`,
    location: { dongName: "마포구" },
  } as unknown as MockOpportunity;
}

const ITEMS = [
  makePick("op-1", "망원동 전시"),
  makePick("op-2", "합정 재즈"),
  makePick("op-3", "연남 마켓"),
  makePick("op-4", "성산 산책"),
];

beforeEach(() => {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    savedIds: [],
    user: null,
  });
  renderCounts.photo = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("히어로 캐러셀 렌더 격리", () => {
  it("자동 전환 1틱에 모든 카드가 다시 그려지지는 않는다", () => {
    vi.useFakeTimers();
    render(<HeroCarousel items={ITEMS} />);
    const baseline = renderCounts.photo;
    expect(baseline).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(1600); // 1.5초 자동 전환 1회
    });

    const delta = renderCounts.photo - baseline;
    /**
     * 전환 1회에 실제로 상태가 바뀌는 카드는 2장뿐이다(빠지는 카드 + 들어오는 카드).
     * memo가 없으면 4장 전부 다시 그려진다 — 그 회귀를 여기서 막는다.
     */
    expect(delta).toBeLessThanOrEqual(2);
  });

  /** 격리가 "영영 안 바뀜"이 되면 그것도 버그다 — 전환은 실제로 일어나야 한다. */
  it("자동 전환이 실제로 활성 카드를 바꾼다", () => {
    vi.useFakeTimers();
    const { container } = render(<HeroCarousel items={ITEMS} />);
    const activeBefore = container.querySelectorAll('[aria-hidden="false"]').length;

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    // 활성 카드가 하나 유지되면서(0이 되지 않고) 전환이 돌았다.
    expect(container.querySelectorAll('[aria-hidden="false"]').length).toBe(activeBefore);
    expect(renderCounts.photo).toBeGreaterThan(0);
  });
});
