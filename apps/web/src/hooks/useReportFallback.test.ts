/**
 * useReportFallback — 리포트 직접진입 fallback(진단 없이 /report로 바로 들어왔을 때)의
 * 반경 사다리(5→10→20km) 및 상태 매핑을 검증한다.
 *
 * 정상 경로(results가 이미 채워진 경우)는 조회 자체를 건너뛴다는 계약,
 * 앵커 좌표 유무에 따라 near 필터가 붙거나 빠진다는 계약, 6건(REPORT_SIZE)이 차면
 * 반경을 더 넓히지 않는다는 계약이 이 훅이 존재하는 이유다(useReportFallback.ts 주석 참조).
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogResult, MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { useReportFallback } from "./useReportFallback";

vi.mock("@/data/opportunities", () => ({
  fetchOpportunities: vi.fn(),
}));

import { fetchOpportunities } from "@/data/opportunities";
const mockedFetch = vi.mocked(fetchOpportunities);

/** 훅 내부 REPORT_SIZE와 동일(리포트가 그리는 카드 수: 원픽 1 + 함께 최대 5). */
const REPORT_SIZE = 6;

const POINT = { lat: 37.5006, lng: 127.0364 };

function pick(id: string): MockOpportunity {
  return {
    id,
    source: "seoul_culture",
    category: "culture",
    title: `활동 ${id}`,
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
  } as MockOpportunity;
}

function items(n: number): MockOpportunity[] {
  return Array.from({ length: n }, (_, i) => pick(`op-${i}`));
}

function ok(n: number): CatalogResult {
  return { data: items(n), status: "ok" };
}

/** anchors.home.point / results를 직접 세팅한다(useSavedOpportunities.test.ts의 seed 패턴과 동일). */
function seed(opts: { results?: MockOpportunity[]; point?: { lat: number; lng: number } } = {}) {
  useAppStore.setState({
    anchors: opts.point ? { home: { point: opts.point } } : {},
    answers: null,
    results: opts.results ?? [],
    savedIds: [],
    user: null,
  });
}

beforeEach(() => {
  mockedFetch.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useReportFallback", () => {
  it("반경 5→10→20km 사다리를 순서대로 타며 각 반경으로 조회한다", async () => {
    seed({ point: POINT });
    mockedFetch
      .mockResolvedValueOnce(ok(2)) // 5km: 2건(<6) → 넓힌다
      .mockResolvedValueOnce(ok(4)) // 10km: 4건(<6) → 넓힌다
      .mockResolvedValueOnce(ok(6)); // 20km: 6건(충족) → 멈춘다

    const { result } = renderHook(() => useReportFallback());

    await waitFor(() => expect(result.current.status).toBe("ok"));

    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(mockedFetch).toHaveBeenNthCalledWith(1, {
      near: { point: POINT, radiusKm: 5 },
      limit: REPORT_SIZE,
    });
    expect(mockedFetch).toHaveBeenNthCalledWith(2, {
      near: { point: POINT, radiusKm: 10 },
      limit: REPORT_SIZE,
    });
    expect(mockedFetch).toHaveBeenNthCalledWith(3, {
      near: { point: POINT, radiusKm: 20 },
      limit: REPORT_SIZE,
    });
    expect(result.current.items).toHaveLength(6);
  });

  it("5km에서 이미 6건이 차면 10/20km로 넓히지 않는다(호출 1회)", async () => {
    seed({ point: POINT });
    mockedFetch.mockResolvedValueOnce(ok(8));

    const { result } = renderHook(() => useReportFallback());

    await waitFor(() => expect(result.current.status).toBe("ok"));

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith({
      near: { point: POINT, radiusKm: 5 },
      limit: REPORT_SIZE,
    });
  });

  it("조회가 실패하면(isError) status: error를 노출한다", async () => {
    seed({ point: POINT });
    mockedFetch.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useReportFallback());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.items).toEqual([]);
  });

  it("results가 이미 채워져 있으면(정상 경로) 조회하지 않고 즉시 ok를 반환한다", () => {
    seed({ results: items(6), point: POINT });

    const { result } = renderHook(() => useReportFallback());

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("ok");
    expect(result.current.items).toEqual([]);
  });

  it("응답 도착 전(pending)에는 status: idle을 노출한다", () => {
    seed({ point: POINT });
    // 절대 resolve되지 않는 프라미스 — 렌더 직후 pending 상태를 그대로 관찰한다.
    mockedFetch.mockReturnValueOnce(new Promise<CatalogResult>(() => {}));

    const { result } = renderHook(() => useReportFallback());

    expect(result.current.status).toBe("idle");
    expect(result.current.items).toEqual([]);
  });

  it("앵커 좌표가 없으면 near 없이 limit만 걸어 전 지역에서 받는다", async () => {
    seed({});
    mockedFetch.mockResolvedValueOnce(ok(6));

    const { result } = renderHook(() => useReportFallback());

    await waitFor(() => expect(result.current.status).toBe("ok"));

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith({ limit: REPORT_SIZE });
  });
});
