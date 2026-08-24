import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * useEnsureCatalog 계약 검증.
 *
 * store(`@/store/useAppStore`)와 데이터 레이어(`@/data/opportunities`)를 vi.mock으로
 * 우회한다. store는 selector 기반이므로, 가변 state 객체에 selector를 적용해 흉내낸다.
 * 검증 대상: (1) catalogStatus === "idle"일 때만 fetch를 트리거하고 결과를 setCatalog로
 * 반영, (2) 이미 로드된(idle 아님) 상태면 fetch/set 재호출 안 함, (3) fetch 완료 전
 * 언마운트되면 cancelled 가드로 setCatalog를 호출하지 않음(레이스 방지), (4) fetch가
 * error/empty 등 비정상 status를 반환해도 그 값을 그대로 setCatalog에 전달.
 */
type Anchors = { home?: { point: { lat: number; lng: number } }; work?: { point: { lat: number; lng: number } } };

const { fetchOpportunitiesMock, setCatalogMock, state } = vi.hoisted(() => ({
  fetchOpportunitiesMock: vi.fn(),
  setCatalogMock: vi.fn(),
  // anchors는 반경 조회의 입력이다. 기본은 앵커 없음(반경 없이 넓게 받는 경로).
  state: { catalogStatus: "idle" as string, anchors: {} as Anchors },
}));

vi.mock("@/data/opportunities", () => ({
  fetchOpportunities: fetchOpportunitiesMock,
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({
      catalogStatus: state.catalogStatus,
      setCatalog: setCatalogMock,
      anchors: state.anchors,
    }),
}));

import { useEnsureCatalog } from "./useEnsureCatalog";

beforeEach(() => {
  fetchOpportunitiesMock.mockReset();
  setCatalogMock.mockReset();
  state.catalogStatus = "idle";
  state.anchors = {};
});

describe("useEnsureCatalog", () => {
  it('idle이면 fetch를 트리거하고 결과를 setCatalog로 반영한다', async () => {
    const data = [{ id: "a" }, { id: "b" }];
    fetchOpportunitiesMock.mockResolvedValue({ data, status: "ok" });

    renderHook(() => useEnsureCatalog());

    expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(setCatalogMock).toHaveBeenCalledTimes(1));
    expect(setCatalogMock).toHaveBeenCalledWith(data, "ok");
  });

  it('이미 로드된 상태(idle 아님)면 fetch도 setCatalog도 호출하지 않는다', () => {
    state.catalogStatus = "ok";

    renderHook(() => useEnsureCatalog());

    expect(fetchOpportunitiesMock).not.toHaveBeenCalled();
    expect(setCatalogMock).not.toHaveBeenCalled();
  });

  it('error 상태에서도(=이미 시도됨) 재fetch하지 않는다', () => {
    state.catalogStatus = "error";

    renderHook(() => useEnsureCatalog());

    expect(fetchOpportunitiesMock).not.toHaveBeenCalled();
    expect(setCatalogMock).not.toHaveBeenCalled();
  });

  it('fetch 완료 전 언마운트되면 setCatalog를 호출하지 않는다(레이스 가드)', async () => {
    let resolveFetch!: (v: { data: unknown[]; status: string }) => void;
    fetchOpportunitiesMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { unmount } = renderHook(() => useEnsureCatalog());
    expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1);

    // fetch가 아직 pending인 상태에서 언마운트 → cancelled = true
    unmount();
    resolveFetch({ data: [{ id: "x" }], status: "ok" });

    // 마이크로태스크 flush 후에도 반영되지 않아야 한다.
    await Promise.resolve();
    await Promise.resolve();
    expect(setCatalogMock).not.toHaveBeenCalled();
  });

  it('fetch가 비정상 status를 반환해도 그 값을 그대로 setCatalog에 전달한다', async () => {
    fetchOpportunitiesMock.mockResolvedValue({ data: [], status: "error" });

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(setCatalogMock).toHaveBeenCalledTimes(1));
    expect(setCatalogMock).toHaveBeenCalledWith([], "error");
  });
});

/** n건짜리 ok 응답 — 개수만 쓰는 테스트용. */
const okResult = (n: number) => ({
  data: Array.from({ length: n }, (_, i) => ({ id: `op-${i}` })),
  status: "ok",
});

const HOME_POINT = { lat: 37.5006, lng: 127.0364 };

describe("useEnsureCatalog — 앵커 반경 조회(확대 루프)", () => {
  it("앵커가 없으면 반경 없이 한 번만 조회한다", async () => {
    fetchOpportunitiesMock.mockResolvedValue(okResult(50));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1));
    expect(fetchOpportunitiesMock.mock.calls[0]![0]!.near).toBeUndefined();
  });

  it("5km에서 충분히 나오면 더 넓히지 않는다", async () => {
    state.anchors = { home: { point: HOME_POINT } };
    fetchOpportunitiesMock.mockResolvedValue(okResult(44));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1));
    expect(fetchOpportunitiesMock.mock.calls[0]![0]!.near).toEqual({
      point: HOME_POINT,
      radiusKm: 5,
    });
  });

  it("5km가 모자라면 10km·20km로 넓힌다", async () => {
    state.anchors = { home: { point: HOME_POINT } };
    fetchOpportunitiesMock
      .mockResolvedValueOnce(okResult(3))
      .mockResolvedValueOnce(okResult(11))
      .mockResolvedValueOnce(okResult(60));

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(3));
    expect(fetchOpportunitiesMock.mock.calls.map((c) => c[0]!.near!.radiusKm)).toEqual([5, 10, 20]);
    expect(setCatalogMock).toHaveBeenCalledTimes(1);
  });

  it("첫 반경(5km) 조회가 error면 즉시 멈춘다 — 넓혀봐야 같은 실패다(M-072)", async () => {
    state.anchors = { home: { point: HOME_POINT } };
    fetchOpportunitiesMock.mockResolvedValue({ data: [], status: "error" });

    renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(setCatalogMock).toHaveBeenCalledTimes(1));
    expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1);
    expect(fetchOpportunitiesMock.mock.calls[0]![0]!.near).toEqual({
      point: HOME_POINT,
      radiusKm: 5,
    });
    expect(setCatalogMock).toHaveBeenCalledWith([], "error");
  });
});

describe("useEnsureCatalog — 세션 캐시가 화면 재마운트를 견딘다(M-063)", () => {
  it("같은 지점으로 이미 fetch에 성공한 뒤 화면이 재마운트되면 재조회하지 않는다", async () => {
    // 1) 최초 마운트 — idle이므로 5km 조회 1회, 44건(≥MIN_RESULTS)이라 더 넓히지 않는다.
    state.anchors = { home: { point: HOME_POINT } };
    fetchOpportunitiesMock.mockResolvedValue(okResult(44));

    const { unmount } = renderHook(() => useEnsureCatalog());

    await waitFor(() => expect(fetchOpportunitiesMock).toHaveBeenCalledTimes(1));

    // 2) 화면을 벗어난다(언마운트) — 기존 버그: 컴포넌트 인스턴스 소유의 useRef가 사라진다.
    unmount();

    // 3) store엔 이미 이 지점의 성공한 카탈로그가 남아 있다(같은 pointKey, catalogStatus="ok").
    state.catalogStatus = "ok";

    // 4) 같은 화면으로 돌아온다(재마운트) — 훅의 내부 상태(과거엔 useRef)는 완전히 새로 생성된다.
    fetchOpportunitiesMock.mockClear();
    renderHook(() => useEnsureCatalog());

    // 5) 모듈 스코프 캐시가 세션 동안 살아남아 같은 pointKey를 기억하므로 재조회하지 않는다.
    //    (구 코드처럼 컴포넌트 인스턴스별 useRef였다면 새 인스턴스의 ref는 null로 시작해
    //    pointKey와 불일치 → 반경 사다리 전체를 다시 돌았을 것이다.)
    expect(fetchOpportunitiesMock).not.toHaveBeenCalled();
  });
});
