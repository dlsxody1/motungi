"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { CatalogResult, CatalogStatus, MockOpportunity } from "@/data/opportunities";
import type { GeoPoint } from "@motungi/core";
import { queryKeys } from "@/lib/query";
import { useAppStore } from "@/store/useAppStore";

/**
 * 카탈로그를 /api/opportunities에서 받는다.
 *
 * 반경 사다리(5→10→20km)와 앵커 없음 상한은 **서버가 소유한다**. 예전엔 이 훅이
 * 사다리를 돌아서, 활동 밀도가 낮은 구는 순차 왕복 2회가 그대로 사용자 대기시간이 됐다
 * (도봉구 실측: 13KB 받고 버린 뒤 다시 63KB = 74.8KB, 왕복 2회).
 * 이제 브라우저는 어떤 앵커든 요청 1회다.
 *
 * 실패는 던진다 — react-query가 retry·error 상태를 소유한다. 예전처럼 에러를
 * `{status:"error"}` 데이터로 감싸면 재시도가 영영 안 돈다(성공한 조회로 보이므로).
 */
async function fetchCatalog(
  point: GeoPoint | undefined,
  signal: AbortSignal,
): Promise<CatalogResult> {
  const qs = point ? `?lat=${point.lat}&lng=${point.lng}` : "";
  const res = await fetch(`/api/opportunities${qs}`, { signal });
  // 503(미설정)은 재시도해도 안 고쳐진다 — 에러가 아니라 상태로 전달한다.
  if (res.status === 503) return { data: [], status: "unconfigured" };
  if (!res.ok) throw new Error(`카탈로그 조회 실패 (${res.status})`);
  const json = (await res.json()) as { items: MockOpportunity[]; status: CatalogResult["status"] };
  return { data: json.items ?? [], status: json.status };
}

export interface CatalogView {
  catalog: MockOpportunity[];
  status: CatalogStatus | "idle";
}

/**
 * 탐색용 카탈로그를 앵커 반경으로 좁혀 로드한다.
 *
 * 좁히기는 DB에서 한다 — 전량을 받아 클라에서 버리지 않는다.
 *
 * 좌표가 queryKey에 들어가므로 동네를 바꾸면 자동으로 다른 캐시 항목이 되고,
 * 돌아오면 이미 받아둔 것을 즉시 쓴다(예전 lastPointRef 수동 캐시키는 캐시가 아니라
 * "마지막 것 하나"만 기억해서, 동네를 왕복하면 매번 다시 받았다).
 * 진행 중 요청 취소도 react-query가 주는 signal이 처리한다.
 */
export function useEnsureCatalog(): CatalogView {
  // 집 앵커 우선, 없으면 직장. 둘 다 없으면 반경 없이 넓게 받는다.
  const point = useAppStore((s) => s.anchors.home?.point ?? s.anchors.work?.point);
  // persist 복원 전에는 anchors가 비어 있다. 그대로 조회하면 "앵커 없음"으로 오인해
  // 300건 무필터 요청이 먼저 나가고, 복원 후 반경 요청이 또 나간다(요청 2회 + 300건 낭비).
  const hydrated = useHydrated();

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.catalog(point),
    queryFn: ({ signal }) => fetchCatalog(point, signal),
    // localStorage 복원 전에는 조회하지 않는다(앵커를 못 본 채 300건을 받는 것 방지).
    enabled: hydrated,
  });

  if (isError) return { catalog: [], status: "error" };
  // 복원 대기 중·조회 중은 둘 다 "아직 모른다" — 화면은 스켈레톤을 그린다.
  if (!hydrated || isPending || !data) return { catalog: [], status: "idle" };
  return { catalog: data.data, status: data.status };
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
