/**
 * useWhyReasons(M-055) 계약 검증.
 *
 * EXPO_PUBLIC_WEB_ORIGIN을 함수 내부에서 매 호출 시 읽으므로(geo.ts와 달리 top-level
 * 캡처가 아니다) 테스트마다 process.env를 직접 세팅해 두 경로(오리진 없음/있음)를 모두
 * 고정한다. 검증 대상: (1) 규칙기반 whyReasons()가 항상 즉시 반환됨(블로킹 없음),
 * (2) WEB_ORIGIN 미설정이면 fetch 없이 규칙기반 유지 — GEMINI_API_KEY 미등록 상태의
 * 실제 오늘 환경과 동일(M-055 notes), (3) fetch 성공(reasons)이면 LLM 산문으로 교체,
 * (4) 서버가 fallback:true를 주거나 네트워크 실패하면 규칙기반 유지(우아한 열화).
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whyReasons, type DiagnosisAnswers, type UserAnchors } from "@motungi/core";
import type { MockOpportunity } from "@/data/opportunities";
import { useWhyReasons } from "./useWhyReasons";

const opp = {
  id: "o-1",
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
  matchScore: 0,
  meta: [],
  tone: "brand",
} as MockOpportunity;

const answers: DiagnosisAnswers = {
  interests: ["culture"],
  timeSlot: "weekday_evening",
  energy: "drained",
};

const anchors: UserAnchors = {};

const originalOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  delete process.env.EXPO_PUBLIC_WEB_ORIGIN;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalOrigin === undefined) delete process.env.EXPO_PUBLIC_WEB_ORIGIN;
  else process.env.EXPO_PUBLIC_WEB_ORIGIN = originalOrigin;
});

// M-108 로딩 상태 노트: 이 훅엔 별도 로딩 플래그가 없다. 반환 타입 WhyReasonsView는
// 항상 {reasons, isLlm} 값을 갖고 있고, LLM fetch가 진행 중인 렌더와 LLM을 아예 못 받은
// (오리진 미설정·네트워크 실패·opp 없음) 최종 렌더가 **동일한 값**
// {reasons: fallbackReasons, isLlm: false}으로 수렴한다 — 바로 아래 "즉시 렌더" 테스트가
// 고정하는 그 값이다. isLlm이 true로 바뀌는 것만 관측 가능하고 "로딩 중"이라는 제3의
// 상태는 애초에 존재하지 않으므로(설계 자체가 블로킹 없는 즉시 폴백), 로딩만 독립적으로
// assert하는 4번째 상태 테스트는 추가하지 않는다(QA M-108 fix round).
describe("useWhyReasons", () => {
  it("항상 규칙기반 whyReasons()를 즉시 반환한다(블로킹 없음)", () => {
    const { result } = renderHook(() => useWhyReasons(opp, answers, anchors));
    expect(result.current.reasons).toEqual(whyReasons(opp, answers));
    expect(result.current.isLlm).toBe(false);
  });

  it("opp가 null이면 fetch 없이 빈 배열", () => {
    const { result } = renderHook(() => useWhyReasons(null, answers, anchors));
    expect(result.current.reasons).toEqual([]);
    expect(result.current.isLlm).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("WEB_ORIGIN 미설정이면 fetch 없이 규칙기반 유지", async () => {
    const { result } = renderHook(() => useWhyReasons(opp, answers, anchors));
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.reasons).toEqual(whyReasons(opp, answers));
  });

  it("fetch 성공(fallback:false)이면 LLM 산문으로 교체", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ fallback: false, reasons: ["LLM 산문 근거"] }),
    } as Response);

    const { result } = renderHook(() => useWhyReasons(opp, answers, anchors));

    await waitFor(() => expect(result.current.isLlm).toBe(true));
    expect(result.current.reasons).toEqual(["LLM 산문 근거"]);
    expect(fetch).toHaveBeenCalledWith(
      "http://test.local/api/why-reasons",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("동일 opp·answers·anchors + 동일 LLM 응답이면 {reasons,isLlm} shape이 고정된다(parity, web과 동일 계약, M-108)", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ fallback: false, reasons: ["근거 A", "근거 B"] }),
    } as Response);

    const { result } = renderHook(() => useWhyReasons(opp, answers, anchors));

    await waitFor(() => expect(result.current.isLlm).toBe(true));
    // web(useWhyReasons.test.ts)과 반환 타입(WhyReasonsView)이 완전히 동일하다 — 이 테스트는
    // 그 shape 자체({reasons, isLlm} 두 키뿐)를 고정한다.
    expect(Object.keys(result.current).sort()).toEqual(["isLlm", "reasons"]);
    expect(result.current).toEqual({ reasons: ["근거 A", "근거 B"], isLlm: true });
  });

  it("서버가 fallback:true를 주면 규칙기반을 유지한다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ fallback: true }),
    } as Response);

    const { result } = renderHook(() => useWhyReasons(opp, answers, anchors));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.isLlm).toBe(false);
    expect(result.current.reasons).toEqual(whyReasons(opp, answers));
  });

  it("네트워크 실패(예: 오프라인·타임아웃)면 규칙기반을 유지하고 던지지 않는다", async () => {
    process.env.EXPO_PUBLIC_WEB_ORIGIN = "http://test.local";
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useWhyReasons(opp, answers, anchors));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.isLlm).toBe(false);
    expect(result.current.reasons).toEqual(whyReasons(opp, answers));
  });
});
