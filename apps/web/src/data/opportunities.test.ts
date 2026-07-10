/**
 * fetchOpportunities() — Supabase 실데이터 읽기 검증.
 * ok/empty/error 3케이스. unconfigured(supabase: null)는 별도 파일(opportunities.unconfigured.test.ts)에서 검증한다.
 * (정적 vi.mock은 파일당 한 번만 평가되므로, 서로 다른 supabase mock 형태를 한 파일에 섞을 수 없다.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpportunityRow } from "@motungi/core";

const { mockLimit } = vi.hoisted(() => ({ mockLimit: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: mockLimit,
      })),
    })),
  },
}));

import { fetchOpportunities } from "@/data/opportunities";

const row: OpportunityRow = {
  id: "opp-1",
  source: "seoul_culture",
  category: "culture",
  external_id: null,
  title: "망원동 재즈 공연",
  summary: "동네 작은 무대에서 즐기는 재즈",
  cost_krw: 0,
  difficulty: 0.2,
  dong_name: "망원동",
  lat: 37.5556,
  lng: 126.9019,
  cta_url: null,
  deadline: null,
  source_label: "서울시 문화행사",
  time_start_hour: 19,
  time_end_hour: 21,
};

describe("fetchOpportunities", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("ok: 1건 이상 정상 로드되면 status가 ok이고 화면용 필드가 채워진다", async () => {
    mockLimit.mockResolvedValueOnce({ data: [row], error: null });

    const result = await fetchOpportunities();

    expect(result.status).toBe("ok");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("opp-1");
    expect(result.data[0]?.categoryLabel).toBe("동네 문화·공연");
    expect(result.data[0]?.costLabel).toBe("무료");
  });

  it("empty: 조회는 성공했지만 0건이면 status가 empty이고 data는 빈 배열", async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });

    const result = await fetchOpportunities();

    expect(result.status).toBe("empty");
    expect(result.data).toEqual([]);
  });

  it("error: 조회 실패면 status가 error이고 data는 빈 배열(목업 폴백 없음)", async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: "network error" },
    });

    const result = await fetchOpportunities();

    expect(result.status).toBe("error");
    expect(result.data).toEqual([]);
  });
});
