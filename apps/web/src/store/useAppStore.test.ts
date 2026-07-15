/**
 * useAppStore(zustand) 액션의 상태 전이를 검증한다.
 * 사이드이펙트 모듈 "@/lib/supabase"는 vi.mock으로 체이너블 스텁을 주입해
 * toggleSaved의 로그인/게스트 분기와 서버 반영(upsert/delete)을 관찰한다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

// supabase 클라이언트 체인(from().upsert() / from().delete().eq().eq())을 흉내내는 스텁.
const { supabaseMock, fromMock, deleteMock, upsertMock, eqMock } = vi.hoisted(() => {
  const eqMock = vi.fn();
  const deleteMock = vi.fn();
  const upsertMock = vi.fn();
  const chain = { delete: deleteMock, upsert: upsertMock, eq: eqMock };
  eqMock.mockReturnValue(chain);
  deleteMock.mockReturnValue(chain);
  upsertMock.mockReturnValue(chain);
  const fromMock = vi.fn(() => chain);
  return {
    supabaseMock: { from: fromMock },
    fromMock,
    deleteMock,
    upsertMock,
    eqMock,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: supabaseMock,
  assertSupabase: () => supabaseMock,
}));

import { useAppStore } from "./useAppStore";

const OPP: MockOpportunity = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  title: "망원동 동네 전시",
  summary: "소규모 전시",
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

/** 데이터 슬라이스를 초기값으로 되돌린다(액션 함수는 유지). */
function resetStore() {
  useAppStore.setState({
    anchors: {},
    answers: null,
    results: [],
    catalog: [],
    catalogStatus: "idle",
    savedIds: [],
    user: null,
  });
}

describe("useAppStore", () => {
  beforeEach(() => {
    resetStore();
    fromMock.mockClear();
    deleteMock.mockClear();
    upsertMock.mockClear();
    eqMock.mockClear();
  });

  it("초기 상태는 게스트 기본값이다", () => {
    const s = useAppStore.getState();
    expect(s.anchors).toEqual({});
    expect(s.answers).toBeNull();
    expect(s.results).toEqual([]);
    expect(s.catalog).toEqual([]);
    expect(s.catalogStatus).toBe("idle");
    expect(s.savedIds).toEqual([]);
    expect(s.user).toBeNull();
  });

  it("setAnchor는 슬롯별로 병합하며 다른 슬롯을 덮지 않는다", () => {
    const home = { dongName: "망원동" };
    const work = { dongName: "역삼동" };

    useAppStore.getState().setAnchor("home", home);
    expect(useAppStore.getState().anchors).toEqual({ home });

    useAppStore.getState().setAnchor("work", work);
    expect(useAppStore.getState().anchors).toEqual({ home, work });

    // 같은 슬롯 재설정은 해당 슬롯만 교체.
    const home2 = { dongName: "합정동" };
    useAppStore.getState().setAnchor("home", home2);
    expect(useAppStore.getState().anchors).toEqual({ home: home2, work });
  });

  it("setAnswers / setResults / setUser / setSavedIds가 각 슬라이스를 교체한다", () => {
    const answers = { interests: ["culture"], timeSlot: "evening", energy: "low" } as never;
    useAppStore.getState().setAnswers(answers);
    expect(useAppStore.getState().answers).toBe(answers);

    useAppStore.getState().setResults([OPP]);
    expect(useAppStore.getState().results).toEqual([OPP]);

    const user = { id: "u1", displayName: "카를로스" };
    useAppStore.getState().setUser(user);
    expect(useAppStore.getState().user).toEqual(user);

    useAppStore.getState().setUser(null);
    expect(useAppStore.getState().user).toBeNull();

    useAppStore.getState().setSavedIds(["a", "b"]);
    expect(useAppStore.getState().savedIds).toEqual(["a", "b"]);
  });

  it("setCatalog는 catalog와 status를 함께 설정한다", () => {
    useAppStore.getState().setCatalog([OPP], "ok");
    expect(useAppStore.getState().catalog).toEqual([OPP]);
    expect(useAppStore.getState().catalogStatus).toBe("ok");

    useAppStore.getState().setCatalog([], "empty");
    expect(useAppStore.getState().catalog).toEqual([]);
    expect(useAppStore.getState().catalogStatus).toBe("empty");
  });

  it("toggleSaved는 없으면 추가하고 있으면 제거한다(토글)", () => {
    useAppStore.getState().toggleSaved("op-1");
    expect(useAppStore.getState().savedIds).toEqual(["op-1"]);

    useAppStore.getState().toggleSaved("op-1");
    expect(useAppStore.getState().savedIds).toEqual([]);
  });

  it("toggleSaved는 기존 목록을 유지한 채 대상만 토글한다", () => {
    useAppStore.getState().setSavedIds(["x", "op-1", "y"]);

    useAppStore.getState().toggleSaved("op-1"); // 제거
    expect(useAppStore.getState().savedIds).toEqual(["x", "y"]);

    useAppStore.getState().toggleSaved("z"); // 추가는 뒤에 append
    expect(useAppStore.getState().savedIds).toEqual(["x", "y", "z"]);
  });

  it("게스트(user=null)면 toggleSaved가 supabase를 호출하지 않는다", () => {
    useAppStore.getState().toggleSaved("op-1");
    expect(fromMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("로그인 상태에서 추가하면 saved_opportunities에 upsert한다", () => {
    useAppStore.getState().setUser({ id: "u1" });

    useAppStore.getState().toggleSaved("op-1");

    expect(fromMock).toHaveBeenCalledWith("saved_opportunities");
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "u1", opportunity_id: "op-1" },
      { onConflict: "user_id,opportunity_id" },
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("로그인 상태에서 제거하면 user_id/opportunity_id로 delete한다", () => {
    useAppStore.getState().setUser({ id: "u1" });
    useAppStore.getState().setSavedIds(["op-1"]);

    useAppStore.getState().toggleSaved("op-1");

    expect(fromMock).toHaveBeenCalledWith("saved_opportunities");
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(eqMock).toHaveBeenCalledWith("user_id", "u1");
    expect(eqMock).toHaveBeenCalledWith("opportunity_id", "op-1");
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
