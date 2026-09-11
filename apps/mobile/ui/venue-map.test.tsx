/**
 * VenueMap(M-052) — 웹 venue-map.tsx의 딥링크 폴백 계약을 모바일에서 재검증한다.
 * 좌표 없음 → null 렌더, 좌표 있음 → 장소명 + 딥링크 버튼, routePoints ≥ 2점이면
 * SVG 폴리라인 미리보기(Path)가 추가로 렌더된다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { Linking } from "react-native";
import { describe, expect, it, vi } from "vitest";
import { VenueMap } from "./venue-map";

describe("VenueMap", () => {
  it("좌표가 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<VenueMap lat={null} lng={null} title="북한산 둘레길" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("좌표 중 하나만 없어도(NaN 포함) 아무것도 렌더하지 않는다", () => {
    const { container } = render(<VenueMap lat={37.5} lng={undefined} title="북한산 둘레길" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("좌표가 있으면 장소명과 딥링크 버튼을 렌더한다", () => {
    render(<VenueMap lat={37.5} lng={127.0} title="북한산 둘레길" placeName="북한산" />);

    expect(screen.getByText("북한산")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "네이버 지도에서 열기" })).toBeInTheDocument();
  });

  it("placeName이 없으면 title로 딥링크 검색어를 만든다", () => {
    const spy = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    render(<VenueMap lat={37.5} lng={127.0} title="북한산 둘레길" />);

    fireEvent.click(screen.getByRole("button", { name: "네이버 지도에서 열기" }));

    expect(spy).toHaveBeenCalledWith(
      `https://map.naver.com/p/search/${encodeURIComponent("북한산 둘레길")}`,
    );
  });

  it("routePoints가 2점 이상이면 SVG 폴리라인 미리보기를 렌더한다", () => {
    render(
      <VenueMap
        lat={37.5}
        lng={127.0}
        title="북한산 둘레길"
        routePoints={[
          [37.5, 127.0],
          [37.51, 127.01],
          [37.52, 127.02],
        ]}
      />,
    );

    const preview = screen.getByTestId("route-preview");
    expect(preview.querySelector("path")).not.toBeNull();
  });

  it("routePoints가 없거나 1점 이하면 폴리라인 없이 카드만 렌더한다(크래시 없음)", () => {
    render(<VenueMap lat={37.5} lng={127.0} title="북한산 둘레길" />);
    expect(screen.queryByTestId("route-preview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "네이버 지도에서 열기" })).toBeInTheDocument();

    render(<VenueMap lat={37.5} lng={127.0} title="북한산 둘레길" routePoints={[[37.5, 127.0]]} />);
    expect(screen.queryByTestId("route-preview")).not.toBeInTheDocument();
  });
});
