"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogResult, MockOpportunity } from "@/data/opportunities";
import type { GeoPoint } from "@motungi/core";
import { useAppStore } from "@/store/useAppStore";

/**
 * 카탈로그를 /api/opportunities에서 받는다.
 *
 * 반경 사다리(5→10→20km)와 앵커 없음 상한은 **서버가 소유한다**. 예전엔 이 훅이
 * 사다리를 돌아서, 활동 밀도가 낮은 구는 순차 왕복 2회가 그대로 사용자 대기시간이 됐다
 * (도봉구 실측: 13KB 받고 버린 뒤 다시 63KB = 74.8KB, 왕복 2회).
 * 이제 브라우저는 어떤 앵커든 요청 1회다.
 */
async function fetchCatalog(
  point: GeoPoint | undefined,
  signal: AbortSignal,
): Promise<CatalogResult> {
  const qs = point ? `?lat=${point.lat}&lng=${point.lng}` : "";
  try {
    const res = await fetch(`/api/opportunities${qs}`, { signal });
    if (!res.ok) return { data: [], status: res.status === 503 ? "unconfigured" : "error" };
    const json = (await res.json()) as { items: MockOpportunity[]; status: CatalogResult["status"] };
    return { data: json.items ?? [], status: json.status };
  } catch (e) {
    // abort는 정상 취소다 — 에러 상태로 화면을 덮어쓰지 않는다(호출부가 signal로 걸러낸다).
    if (e instanceof DOMException && e.name === "AbortError") return { data: [], status: "empty" };
    return { data: [], status: "error" };
  }
}

/**
 * 탐색용 카탈로그를 앵커 반경으로 좁혀 로드한다.
 * (catalog는 세션 캐시라 persist되지 않으므로 새로고침·직접진입 시 비어 있을 수 있다.)
 *
 * 좁히기는 DB에서 한다 — 전량을 받아 클라에서 버리지 않는다.
 */
export function useEnsureCatalog() {
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const setCatalog = useAppStore((s) => s.setCatalog);
  // 집 앵커 우선, 없으면 직장. 둘 다 없으면 반경 없이 넓게 받는다.
  const point = useAppStore((s) => s.anchors.home?.point ?? s.anchors.work?.point);
  // persist 복원 전에는 anchors가 비어 있다. 그대로 조회하면 "앵커 없음"으로 오인해
  // 300건 무필터 요청이 먼저 나가고, 복원 후 반경 요청이 또 나간다(요청 2회 + 300건 낭비).
  const hydrated = useHydrated();

  // 좌표를 값으로 비교하기 위한 키(객체 identity는 매 렌더 바뀔 수 있다).
  const pointKey = point ? `${point.lat},${point.lng}` : null;
  // 마지막으로 조회한 좌표. 동네를 바꾸면 catalogStatus가 idle이 아니어도 다시 받아야 한다.
  const lastPointRef = useRef<string | null>(null);

  useEffect(() => {
    // localStorage 복원 전에는 조회하지 않는다(앵커를 못 본 채 300건을 받는 것 방지).
    if (!hydrated) return;
    // 이미 로드됐고 좌표도 그대로면 재조회하지 않는다.
    if (catalogStatus !== "idle" && lastPointRef.current === pointKey) return;
    lastPointRef.current = pointKey;

    const controller = new AbortController();
    void (async () => {
      // 반경 사다리는 서버(/api/opportunities)가 돈다 — 브라우저는 요청 1회로 끝난다.
      const { data, status } = await fetchCatalog(point, controller.signal);
      if (!controller.signal.aborted) setCatalog(data, status);
    })();
    return () => {
      // 좌표가 바뀌거나 언마운트되면 진행 중인 요청을 실제로 끊는다
      // (기존엔 플래그로 결과만 버려서, 늦게 온 응답이 네트워크를 계속 점유했다).
      controller.abort();
    };
    // point는 pointKey로 값 비교하므로 의존성에서 제외(객체 identity 변화로 재조회되는 것 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, catalogStatus, pointKey, setCatalog]);
}

/**
 * localStorage 복원분이 렌더에 반영됐는지.
 *
 * persist의 hasHydrated()는 스토어 생성 시점에 이미 true라 게이트로 못 쓴다.
 * 반면 SSR/첫 클라이언트 렌더는 서버 마크업과 맞추려고 초기 state(anchors={})로 그려지고,
 * 복원된 값은 그 다음 렌더에 들어온다. 그래서 "마운트 이후"가 곧 "복원 반영 이후"다.
 * 이 한 틱을 기다리지 않으면 앵커를 못 본 300건 요청이 먼저 나간다.
 */
function useHydrated(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
