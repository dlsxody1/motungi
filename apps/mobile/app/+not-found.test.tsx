/** 모바일 404 화면(M-125) — 웹 not-found.tsx와 같은 카피, 홈/탐색 이동. */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock("expo-router", () => ({ useRouter: () => ({ replace: replaceMock }) }));

import NotFound from "./+not-found";

describe("NotFound (+not-found)", () => {
  beforeEach(() => replaceMock.mockClear());

  it("웹 404와 같은 카피를 렌더하고 경보 role은 달지 않는다", () => {
    render(<NotFound />);
    expect(screen.getByText("페이지를 찾을 수 없어요")).toBeTruthy();
    expect(screen.getByText(/주소가 바뀌었거나 사라진 페이지예요/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("'홈으로'는 /로, '탐색 둘러보기'는 /explore로 이동한다", () => {
    render(<NotFound />);
    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));
    expect(replaceMock).toHaveBeenLastCalledWith("/");
    fireEvent.click(screen.getByRole("button", { name: "탐색 둘러보기" }));
    expect(replaceMock).toHaveBeenLastCalledWith("/explore");
  });
});
