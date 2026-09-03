import { describe, expect, it } from "vitest";
import {
  applyGuCoordFallback,
  buildGuCentroids,
  type CoordFallbackRow,
  type GuCentroidRow,
} from "./gu-fallback";

/** neighborhoods 테이블 형태의 최소 픽스처(같은 구에 여러 동 = 중심 평균 대상). */
const NEIGHBORHOODS: GuCentroidRow[] = [
  { sigungu: "종로구", lat: 37.57, lng: 126.98 },
  { sigungu: "종로구", lat: 37.59, lng: 127.0 },
  { sigungu: "마포구", lat: 37.55, lng: 126.9 },
];

describe("buildGuCentroids", () => {
  it("같은 구의 동 좌표를 평균해 구 중심을 만든다", () => {
    const c = buildGuCentroids(NEIGHBORHOODS);
    // 평균은 부동소수점이라 근사 비교(126.99가 126.99000000000001로 나온다).
    expect(c.get("종로구")?.lat).toBeCloseTo(37.58, 6);
    expect(c.get("종로구")?.lng).toBeCloseTo(126.99, 6);
    expect(c.get("마포구")?.lat).toBeCloseTo(37.55, 6);
    expect(c.get("마포구")?.lng).toBeCloseTo(126.9, 6);
  });

  it("좌표가 없는 행은 평균에서 제외한다", () => {
    const c = buildGuCentroids([
      { sigungu: "중구", lat: 37.5, lng: 127.0 },
      { sigungu: "중구", lat: null, lng: null },
    ]);
    expect(c.get("중구")).toEqual({ lat: 37.5, lng: 127.0 });
  });

  it("빈 입력이면 빈 맵", () => {
    expect(buildGuCentroids([]).size).toBe(0);
  });
});

describe("applyGuCoordFallback", () => {
  const centroids = buildGuCentroids(NEIGHBORHOODS);

  it("좌표 없는 행에 구 중심을 채운다", () => {
    const row: CoordFallbackRow = { dong_name:"종로구", lat: null, lng: null };
    const out = applyGuCoordFallback(row, centroids);
    expect(out.lat).toBeCloseTo(37.58, 6);
    expect(out.lng).toBeCloseTo(126.99, 6);
    expect(out.coord_level).toBe("sigungu");
    expect(out.dong_name).toBe("종로구");
  });

  it("시도 접두사가 붙어 있어도 매칭한다 — '서울 종로구' == '종로구'", () => {
    const row: CoordFallbackRow = { dong_name:"서울 종로구", lat: null, lng: null };
    const out = applyGuCoordFallback(row, centroids);
    expect(out.lat).toBeCloseTo(37.58, 6);
    // 저장 표기는 건드리지 않는다 — inMetro()가 접두사로 수도권을 판정하기 때문.
    expect(out.dong_name).toBe("서울 종로구");
  });

  it("원본 좌표가 있으면 절대 덮어쓰지 않는다", () => {
    const row: CoordFallbackRow = { dong_name:"종로구", lat: 37.1, lng: 127.1 };
    const out = applyGuCoordFallback(row, centroids);
    expect(out.lat).toBe(37.1);
    expect(out.lng).toBe(127.1);
    // 실좌표는 폴백이 아니므로 표식을 남기지 않는다.
    expect(out.coord_level).toBeUndefined();
  });

  it("한쪽 좌표만 있는 행도 손대지 않는다(부분 덮어쓰기 방지)", () => {
    const row: CoordFallbackRow = { dong_name:"종로구", lat: 37.1, lng: null };
    const out = applyGuCoordFallback(row, centroids);
    expect(out.lat).toBe(37.1);
    expect(out.lng).toBeNull();
    expect(out.coord_level).toBeUndefined();
  });

  it("서울 밖(매칭 실패)이면 그대로 둔다 — 좌표를 지어내지 않는다", () => {
    const row: CoordFallbackRow = { dong_name:"경기 안산시", lat: null, lng: null };
    const out = applyGuCoordFallback(row, centroids);
    expect(out.lat).toBeNull();
    expect(out.coord_level).toBeUndefined();
  });

  it("dong_name이 null이면 그대로 둔다", () => {
    const row: CoordFallbackRow = { dong_name:null, lat: null, lng: null };
    expect(applyGuCoordFallback(row, centroids).lat).toBeNull();
  });

  it("멱등 — 두 번 적용해도 결과가 같다", () => {
    const row: CoordFallbackRow = { dong_name:"마포구", lat: null, lng: null };
    const once = applyGuCoordFallback(row, centroids);
    expect(applyGuCoordFallback(once, centroids)).toEqual(once);
  });
});
