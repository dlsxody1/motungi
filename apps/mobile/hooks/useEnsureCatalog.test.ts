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
const { fetchOpportunitiesMock, setCatalogMock, state } = vi.hoisted(() => ({
  fetchOpportunitiesMock: vi.fn(),
  setCatalogMock: vi.fn(),
  state: { catalogStatus: "idle" as string },
}));

vi.mock("@/data/opportunities", () => ({
  fetchOpportunities: fetchOpportunitiesMock,
}));

vi.mock("@/store/useAppStore", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ catalogStatus: state.catalogStatus, setCatalog: setCatalogMock }),
}));

import { useEnsureCatalog } from "./useEnsureCatalog";

beforeEach(() => {
  fetchOpportunitiesMock.mockReset();
  setCatalogMock.mockReset();
  state.catalogStatus = "idle";
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
