/**
 * useWhyReasons(M-044) — 규칙기반(whyReasons) 폴백이 즉시 렌더되고, LLM이 성공할 때만
 * 산문으로 교체되는지 검증한다.
 *
 * 핵심 계약(done_when): "LLM을 429/500으로 강제 목킹했을 때 whyReasons로 떨어지고
 * UI가 정상 렌더되는 테스트가 있다" — 아래 "폴백 유지" describe가 그 계약이다.
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiagnosisAnswers } from "@motungi/core";
import type { MockOpportunity } from "@/data/opportunities";
import { useWhyReasons } from "./useWhyReasons";

vi.mock("@/lib/api-error", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-error")>("@/lib/api-error");
  return { ...actual, reportError: vi.fn() };
});

const OPP: MockOpportunity = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  title: "동네 소극장 연극",
  summary: "요약",
  costKrw: 0,
  difficulty: 0.2,
  categoryLabel: "동네 문화·공연",
  costLabel: "무료",
  costUnit: "1인",
  costHeading: "참가비",
  matchScore: 80,
  meta: [],
  tone: "brand",
} as MockOpportunity;

const ANSWERS: DiagnosisAnswers = {
  interests: ["culture"],
  timeSlot: "weekday_evening",
  energy: "drained",
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useWhyReasons — 즉시 렌더(블로킹 없음)", () => {
  it("응답이 오기 전에도 규칙기반 근거를 즉시 반환한다", () => {
    // fetch가 영원히 pending이어도 첫 렌더는 규칙기반이어야 한다(페이지 블로킹 금지).
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const { result } = renderHook(() => useWhyReasons(OPP, ANSWERS, {}));

    expect(result.current.isLlm).toBe(false);
    expect(result.current.reasons.length).toBeGreaterThan(0);
  });

  it("opp가 null(로딩 중)이면 fetch하지 않고 빈 근거를 반환한다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useWhyReasons(null, ANSWERS, {}));

    expect(result.current.reasons).toEqual([]);
    expect(result.current.isLlm).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("answers가 없으면(미진단) fetch하지 않고 규칙기반 근거만 반환한다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useWhyReasons(OPP, null, {}));

    expect(result.current.reasons.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("useWhyReasons — LLM 성공 시 산문으로 교체", () => {
  it("API가 fallback:false + reasons를 주면 그걸로 교체된다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ fallback: false, reasons: ["LLM이 만든 근거 1", "LLM이 만든 근거 2"] }),
          { status: 200 },
        ),
      ),
    );

    const { result } = renderHook(() => useWhyReasons(OPP, ANSWERS, {}));

    await waitFor(() => expect(result.current.isLlm).toBe(true));
    expect(result.current.reasons).toEqual(["LLM이 만든 근거 1", "LLM이 만든 근거 2"]);
  });
});

describe("useWhyReasons — 429/500/네트워크 실패 시 폴백 유지 (done_when 핵심 계약)", () => {
  it("API가 429(fallback:true)를 주면 규칙기반 근거를 계속 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ fallback: true, reason: "upstream_429" }), { status: 200 }),
      ),
    );

    const { result } = renderHook(() => useWhyReasons(OPP, ANSWERS, {}));
    const ruleBasedReasons = result.current.reasons;

    // API 응답이 도착한 뒤에도(비동기 완료 대기) 여전히 규칙기반이어야 한다.
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(result.current.isLlm).toBe(false);
    expect(result.current.reasons).toEqual(ruleBasedReasons);
  });

  it("API 라우트가 500을 반환해도(HTTP 자체 실패) 규칙기반 근거를 유지하고 죽지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));

    const { result } = renderHook(() => useWhyReasons(OPP, ANSWERS, {}));
    const ruleBasedReasons = result.current.reasons;

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(result.current.isLlm).toBe(false);
    expect(result.current.reasons).toEqual(ruleBasedReasons);
    expect(result.current.reasons.length).toBeGreaterThan(0);
  });

  it("네트워크 자체가 죽어도(fetch reject) 규칙기반 근거를 유지한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => useWhyReasons(OPP, ANSWERS, {}));
    const ruleBasedReasons = result.current.reasons;

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(result.current.isLlm).toBe(false);
    expect(result.current.reasons).toEqual(ruleBasedReasons);
  });
});
