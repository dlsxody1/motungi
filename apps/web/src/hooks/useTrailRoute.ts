"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { reportError } from "@/lib/api-error";

/**
 * 걷기길 코스 경로 좌표 — /api/trail-route 경유.
 *
 * 두루누비 GPX는 CORS가 없어 브라우저가 직접 못 받고, 원본이 코스당 약 460KB라
 * 프록시가 200점(약 4.5KB)으로 줄여 준다. 실패하면 null — 지도는 마커만 그린다
 * (경로 하나 때문에 지도가 통째로 사라지면 안 된다).
 *
 * enabled=false면 요청하지 않는다 — 걷기길이 아닌 활동에서 불필요한 호출을 막는다.
 */
export function useTrailRoute(id: string | null, enabled: boolean): [number, number][] | null {
  const { data } = useQuery({
    queryKey: queryKeys.trailRoute(id ?? ""),
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch(`/api/trail-route?id=${encodeURIComponent(id ?? "")}`, { signal });
        if (!res.ok) return null;
        const json = (await res.json()) as { points?: [number, number][] };
        return Array.isArray(json.points) && json.points.length > 0 ? json.points : null;
      } catch (err) {
        // UI는 그대로 — 경로 없이 마커만 그린다(의도된 우아한 열화).
        // 다만 왜 경로가 안 나오는지는 남겨야 진단이 된다.
        reportError("useTrailRoute", err);
        return null;
      }
    },
    enabled: enabled && id != null,
  });

  return data ?? null;
}
