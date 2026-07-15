import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";

/**
 * useAppStore(zustand + persist) 계약 테스트.
 * RN/expo 의존(AsyncStorage, supabase)은 vi.mock으로 우회하고,
 * 렌더 없이 getState()/setState()로 액션의 상태 전이를 검증한다.
 */

// persist 미들웨어가 참조하는 스토리지. 리하이드레이션은 항상 빈 값으로.
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

// supabase 체이너블 스텁. from() 호출마다 인자/체인 메서드 호출을 기록.
const eq = vi.fn(() => chain);
const del = vi.fn(() => chain);
const upsert = vi.fn(() => chain);
const chain = { eq, delete: del, upsert } as const;
const from = vi.fn((..._args: unknown[]) => chain);

// 화살표로 지연 참조 — vi.mock 팩토리는 호이스팅되므로 top-level `from`을
// 즉시 참조하면 TDZ 에러. 호출 시점엔 초기화 완료라 안전하다.
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => from(...args) },
}));

import { useAppStore } from "./useAppStore";

/** 최소 MockOpportunity 팩토리 (타입 계약만 만족하는 스텁). */
function opp(id: string): MockOpportunity {
  return { id, title: `활동-${id}` } as unknown as MockOpportunity;
}

/** 각 테스트 전에 스토어를 초기 상태로 되돌린다(싱글턴이므로). */
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

afterEach(() => {
  vi.clearAllMocks();
});

describe("초기 상태", () => {
  it("게스트 기본값을 노출한다", () => {
    const s = useAppStore.getState();
    expect(s.anchors).toEqual({});
    expect(s.answers).toBeNull();
    expect(s.results).toEqual([]);
    expect(s.catalog).toEqual([]);
    expect(s.catalogStatus).toBe("idle");
    expect(s.savedIds).toEqual([]);
    expect(s.user).toBeNull();
  });
});

describe("setAnchor", () => {
  it("home/work 슬롯을 독립적으로 병합한다", () => {
    const home = { lat: 37.5, lng: 127.0 } as never;
    const work = { lat: 37.4, lng: 127.1 } as never;

    useAppStore.getState().setAnchor("home", home);
    expect(useAppStore.getState().anchors).toEqual({ home });

    useAppStore.getState().setAnchor("work", work);
    // work 추가 시 home이 사라지지 않아야 한다.
    expect(useAppStore.getState().anchors).toEqual({ home, work });
  });

  it("같은 슬롯 재설정 시 덮어쓴다", () => {
    const first = { lat: 1, lng: 1 } as never;
    const second = { lat: 2, lng: 2 } as never;
    useAppStore.getState().setAnchor("home", first);
    useAppStore.getState().setAnchor("home", second);
    expect(useAppStore.getState().anchors).toEqual({ home: second });
  });
});

describe("setAnswers", () => {
  it("진단 답변을 저장한다", () => {
    const answers = { budget: "low" } as never;
    useAppStore.getState().setAnswers(answers);
    expect(useAppStore.getState().answers).toBe(answers);
  });
});

describe("setResults / setCatalog", () => {
  it("setResults는 결과 배열을 교체한다", () => {
    const results = [opp("a"), opp("b")];
    useAppStore.getState().setResults(results);
    expect(useAppStore.getState().results).toBe(results);
  });

  it("setCatalog은 카탈로그와 상태를 함께 전이시킨다", () => {
    const catalog = [opp("x")];
    useAppStore.getState().setCatalog(catalog, "ok");
    expect(useAppStore.getState().catalog).toBe(catalog);
    expect(useAppStore.getState().catalogStatus).toBe("ok");
  });

  it("빈 결과/에러 상태도 그대로 반영한다", () => {
    useAppStore.getState().setCatalog([], "error");
    expect(useAppStore.getState().catalog).toEqual([]);
    expect(useAppStore.getState().catalogStatus).toBe("error");
  });
});

describe("savedIds / toggleSaved / isSaved (게스트)", () => {
  it("setSavedIds로 목록을 통째로 세팅한다", () => {
    useAppStore.getState().setSavedIds(["1", "2"]);
    expect(useAppStore.getState().savedIds).toEqual(["1", "2"]);
  });

  it("toggleSaved는 없으면 추가, 있으면 제거한다", () => {
    const { toggleSaved, isSaved } = useAppStore.getState();

    expect(isSaved("p1")).toBe(false);
    toggleSaved("p1");
    expect(useAppStore.getState().savedIds).toEqual(["p1"]);
    expect(useAppStore.getState().isSaved("p1")).toBe(true);

    toggleSaved("p1");
    expect(useAppStore.getState().savedIds).toEqual([]);
    expect(useAppStore.getState().isSaved("p1")).toBe(false);
  });

  it("여러 항목 토글 시 다른 항목은 보존한다", () => {
    const { toggleSaved } = useAppStore.getState();
    toggleSaved("a");
    toggleSaved("b");
    toggleSaved("a"); // a만 제거
    expect(useAppStore.getState().savedIds).toEqual(["b"]);
  });

  it("게스트는 supabase를 호출하지 않는다", () => {
    useAppStore.getState().toggleSaved("p1");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("toggleSaved (로그인 상태 서버 동기화)", () => {
  beforeEach(() => {
    useAppStore.getState().setUser({ id: "user-1", displayName: "카를로스" });
  });

  it("새로 저장하면 upsert로 서버 반영한다", () => {
    useAppStore.getState().toggleSaved("opp-9");

    expect(from).toHaveBeenCalledWith("saved_opportunities");
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", opportunity_id: "opp-9" },
      { onConflict: "user_id,opportunity_id" },
    );
    expect(del).not.toHaveBeenCalled();
    expect(useAppStore.getState().savedIds).toEqual(["opp-9"]);
  });

  it("이미 저장된 걸 다시 토글하면 delete로 서버 반영한다", () => {
    useAppStore.getState().setSavedIds(["opp-9"]);
    useAppStore.getState().toggleSaved("opp-9");

    expect(del).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(eq).toHaveBeenNthCalledWith(2, "opportunity_id", "opp-9");
    expect(upsert).not.toHaveBeenCalled();
    expect(useAppStore.getState().savedIds).toEqual([]);
  });
});

describe("setUser (로그인/로그아웃)", () => {
  it("로그인 사용자를 설정하고 null로 로그아웃한다", () => {
    const user = { id: "u", displayName: "홍길동" };
    useAppStore.getState().setUser(user);
    expect(useAppStore.getState().user).toEqual(user);

    useAppStore.getState().setUser(null);
    expect(useAppStore.getState().user).toBeNull();
  });

  it("로그아웃 후 toggleSaved는 다시 로컬 전용이 된다", () => {
    useAppStore.getState().setUser({ id: "u" });
    useAppStore.getState().setUser(null);
    from.mockClear();

    useAppStore.getState().toggleSaved("x");
    expect(from).not.toHaveBeenCalled();
    expect(useAppStore.getState().savedIds).toEqual(["x"]);
  });
});
