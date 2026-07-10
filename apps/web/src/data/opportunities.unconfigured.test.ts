/**
 * fetchOpportunities() — Supabase 환경변수 미설정(unconfigured) 케이스.
 * ok/empty/error(opportunities.test.ts)와 supabase mock 형태가 달라(null vs 객체) 별도 파일로 분리했다.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: null,
}));

import { fetchOpportunities } from "@/data/opportunities";

describe("fetchOpportunities — unconfigured", () => {
  it("Supabase 환경변수 미설정이면 조회 없이 status가 unconfigured", async () => {
    const result = await fetchOpportunities();

    expect(result.status).toBe("unconfigured");
    expect(result.data).toEqual([]);
  });
});
