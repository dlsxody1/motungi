/**
 * VenueMap 자원 회귀 테스트.
 *
 * 막으려는 것: `md:hidden`은 CSS라 모바일·데스크톱 트리가 **둘 다 마운트**된다.
 * 상세 페이지는 VenueMap을 두 번 놓으므로, 방어가 없으면 조회 1회에 NAVER
 * `maps.Map` 인스턴스가 2개 생긴다 — 폴링 루프 2개, Polyline 2개까지 딸려온다.
 * 화면에 보이는 지도는 하나뿐이므로 나머지 하나는 순수한 낭비다.
 *
 * 여기서 세는 건 "지도 생성자가 몇 번 불렸나"다. 구현(모듈 카운터든 컨텍스트든)이
 * 아니라 결과를 검증하므로 나중에 방식을 바꿔도 이 테스트는 유효하다.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { VenueMap } from "./venue-map";

/** NAVER Maps SDK 최소 스텁 — 생성 횟수만 센다. */
const calls = { map: 0, marker: 0, polyline: 0 };

function installSdk() {
  class LatLng {
    constructor(
      public lat: number,
      public lng: number,
    ) {}
  }
  (window as unknown as { naver: unknown }).naver = {
    maps: {
      LatLng,
      LatLngBounds: class {},
      Map: class {
        constructor() {
          calls.map++;
        }
        fitBounds() {}
      },
      Marker: class {
        constructor() {
          calls.marker++;
        }
      },
      Polyline: class {
        constructor() {
          calls.polyline++;
        }
      },
    },
  };
}

beforeEach(() => {
  calls.map = 0;
  calls.marker = 0;
  calls.polyline = 0;
  installSdk();
});

afterEach(() => {
  cleanup();
  delete (window as unknown as { naver?: unknown }).naver;
});

const COORDS = { lat: 37.5556, lng: 126.9019 };

describe("VenueMap 자원 격리", () => {
  it("같은 좌표를 두 번 마운트해도 지도는 한 번만 만들어진다", async () => {
    // 상세 페이지가 실제로 하는 일: 모바일 트리 + 데스크톱 트리에 각각 하나씩.
    render(
      <>
        <VenueMap {...COORDS} title="망원동 전시" />
        <VenueMap {...COORDS} title="망원동 전시" />
      </>,
    );

    await waitFor(() => expect(calls.map).toBe(1));
    expect(calls.marker).toBe(1);
  });

  it("좌표가 다르면 각자 그린다 — 서로 다른 장소를 한 화면에 놓는 경우", async () => {
    render(
      <>
        <VenueMap lat={37.5556} lng={126.9019} title="망원동" />
        <VenueMap lat={37.5006} lng={127.0364} title="역삼동" />
      </>,
    );

    await waitFor(() => expect(calls.map).toBe(2));
  });

  /**
   * 반납이 안 되면 다른 활동을 보고 돌아왔을 때 "이미 누가 그리는 중"으로 오판해
   * 지도가 영영 안 뜬다 — 격리가 기능을 죽이는 전형적인 방식이다.
   */
  it("언마운트 후 다시 마운트하면 지도를 다시 그린다(점유 반납)", async () => {
    const first = render(<VenueMap {...COORDS} title="망원동 전시" />);
    await waitFor(() => expect(calls.map).toBe(1));
    first.unmount();

    render(<VenueMap {...COORDS} title="망원동 전시" />);
    await waitFor(() => expect(calls.map).toBe(2));
  });

  /**
   * 실제 상황: 부모(OpportunityDetail)가 저장 토글 등으로 리렌더되면 useTrailRoute가
   * 내용은 같지만 **새 배열**을 넘긴다. 예전엔 그 배열이 그대로 effect deps에 있어
   * 부모가 리렌더될 때마다 NAVER 지도를 통째로 다시 만들었다.
   *
   * 부모 상태만 바꿔 리렌더를 유발한다(VenueMap 자체는 계속 같은 위치에 마운트된 채).
   */
  it("부모가 리렌더돼 경로 배열이 새로 와도 지도를 다시 만들지 않는다", async () => {
    function Parent() {
      const [, force] = useState(0);
      return (
        <>
          <button onClick={() => force((n) => n + 1)}>리렌더</button>
          {/* 매 렌더 새 배열 — useTrailRoute가 하는 그대로. 내용은 항상 같다. */}
          <VenueMap
            {...COORDS}
            title="걷기길"
            routePoints={[
              [37.55, 126.9],
              [37.56, 126.91],
            ]}
          />
        </>
      );
    }

    render(<Parent />);
    await waitFor(() => expect(calls.map).toBe(1));

    fireEvent.click(screen.getByText("리렌더"));
    fireEvent.click(screen.getByText("리렌더"));

    await Promise.resolve();
    expect(calls.map).toBe(1);
    expect(calls.polyline).toBe(1);
  });
});
