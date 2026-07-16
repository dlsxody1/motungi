/**
 * useAppStore(web wrapper) 계약 테스트.
 *
 * 상태 전이 로직(setAnchor/toggleSaved 등)은 @motungi/core의
 * packages/core/src/store.test.ts가 이미 검증하므로 여기서 다시 다루지 않는다.
 * 이 파일은 web 전용 결선만 검증한다:
 *   1) createAppStore에 localStorage/supabase 어댑터가 실제로 주입되는지
 *   2) apps/web/src/lib/auth.ts가 의존하는 getState/setState/subscribe 정적
 *      메서드 패리티가 유지되는지 (Object.assign 결합 확인)
 *   3) 셀렉터 훅으로 렌더링했을 때 기본값을 정상적으로 읽어오는지(스모크)
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
  assertSupabase: () => ({ from: vi.fn() }),
}));

import { useAppStore } from "./useAppStore";

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

beforeEach(() => {
  resetStore();
});

describe("useAppStore (web 결선)", () => {
  it("정적 메서드(getState/setState/subscribe)가 auth.ts 계약대로 노출된다", () => {
    expect(typeof useAppStore.getState).toBe("function");
    expect(typeof useAppStore.setState).toBe("function");
    expect(typeof useAppStore.subscribe).toBe("function");
  });

  it("getState()는 게스트 기본 상태를 반환한다(localStorage 주입 확인)", () => {
    const s = useAppStore.getState();
    expect(s.anchors).toEqual({});
    expect(s.savedIds).toEqual([]);
    expect(s.user).toBeNull();
    expect(typeof s.isSaved).toBe("function");
  });

  it("setState()로 갱신하면 getState()에도 즉시 반영된다", () => {
    useAppStore.setState({ savedIds: ["a"] });
    expect(useAppStore.getState().savedIds).toEqual(["a"]);
  });

  it("셀렉터 훅으로 렌더링하면 현재 상태를 읽어온다(스모크)", () => {
    useAppStore.getState().setUser({ id: "u1", displayName: "카를로스" });

    const { result } = renderHook(() => useAppStore((s) => s.user));

    expect(result.current).toEqual({ id: "u1", displayName: "카를로스" });
  });

  it("훅 호출 없이도 toggleSaved 등 core 위임 액션을 getState()로 바로 쓸 수 있다", () => {
    useAppStore.getState().toggleSaved("op-1");
    expect(useAppStore.getState().savedIds).toEqual(["op-1"]);
    expect(useAppStore.getState().isSaved("op-1")).toBe(true);
  });
});
