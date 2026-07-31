/**
 * NeighborhoodMenu — 동네 전환 드롭다운의 두 갈래 분기 계약.
 *
 * 핵심: 목록에 없는 동네를 찾을 때 **무조건 /location으로 튕기지 않는다.**
 *  - "동네 검색하기"      → 다이얼로그 안에서 검색(화면 이동 없음)
 *  - "리포트 다시 만들기" → 그때만 /location으로 이동
 * 이 구분이 사라지면(둘 중 하나가 다시 합쳐지면) 이 테스트가 깨진다.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, searchMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/geo", () => ({ searchNeighborhoods: searchMock }));

import { NeighborhoodMenu } from "./neighborhood-menu";

// globals:false 설정이라 RTL 자동 cleanup 이 등록되지 않는다.
afterEach(() => cleanup());

beforeEach(() => {
  pushMock.mockReset();
  searchMock.mockReset();
  searchMock.mockResolvedValue([]);
  // jsdom은 <dialog>.showModal을 구현하지 않는 경우가 있어 open 속성 토글로 대체한다.
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

function open() {
  render(<NeighborhoodMenu dongLabel="망원동" triggerClassName="" />);
  fireEvent.click(screen.getByRole("button", { name: "동네 변경" }));
}

describe("NeighborhoodMenu", () => {
  it("두 갈래(검색 / 리포트 재생성)를 모두 제시한다", () => {
    open();
    expect(screen.getByText("동네 검색하기")).toBeInTheDocument();
    expect(screen.getByText("리포트 다시 만들기")).toBeInTheDocument();
  });

  it("'동네 검색하기'는 화면을 이동하지 않고 다이얼로그 안에 검색창을 연다", () => {
    open();
    fireEvent.click(screen.getByText("동네 검색하기"));

    expect(screen.getByLabelText("동네 검색")).toBeInTheDocument();
    // 예전 동작(무조건 /location 이동)으로 돌아가면 여기서 깨진다.
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("'리포트 다시 만들기'만 /location 으로 보낸다", () => {
    open();
    fireEvent.click(screen.getByText("리포트 다시 만들기"));
    expect(pushMock).toHaveBeenCalledWith("/location");
  });

  it("2글자 미만은 조회하지 않고, 2글자 이상이면 디바운스 후 결과를 렌더한다", async () => {
    searchMock.mockResolvedValue([
      { admCode: "1168051000", dongName: "역삼1동", sigungu: "강남구", lat: 37.5, lng: 127.03 },
    ]);
    open();
    fireEvent.click(screen.getByText("동네 검색하기"));
    const input = screen.getByLabelText("동네 검색");

    fireEvent.change(input, { target: { value: "역" } });
    expect(screen.getByText("두 글자 이상 입력해 주세요.")).toBeInTheDocument();
    expect(searchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "역삼" } });
    await waitFor(() => expect(screen.getByText("역삼1동")).toBeInTheDocument());
    expect(searchMock).toHaveBeenCalledWith("역삼", expect.anything());
  });
});
