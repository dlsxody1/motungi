import { useEffect, useRef } from "react";
import { fetchOpportunities } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** 앵커가 있을 때 시도하는 반경(km) — 가까운 것부터. 밀도 편차가 커서 모자라면 넓힌다. */
const RADII = [5, 10, 20] as const;

/** 이 정도는 나와야 "탐색"이 성립한다고 보는 하한. */
const MIN_RESULTS = 20;

/** 앵커가 없을 때(첫 진입·동네 미선택) 상한. */
const NO_ANCHOR_LIMIT = 300;

/**
 * 탐색용 카탈로그를 앵커 반경으로 좁혀 로드한다.
 * (catalog는 세션 캐시라 persist되지 않으므로 앱 재시작·직접진입 시 비어 있을 수 있다.)
 *
 * 이전엔 앵커와 무관하게 300건을 무필터로 받아 클라에서 걸렀다(live 507건 중 207건이 잘림).
 * 이제 DB에서 반경으로 좁힌다. 웹과 같은 정책이지만 store/data alias가 앱별이라 훅은 각자 둔다
 * (공유되는 건 packages/core의 fetchOpportunities·boundingBox).
 */
export function useEnsureCatalog() {
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const setCatalog = useAppStore((s) => s.setCatalog);
  const point = useAppStore((s) => s.anchors.home?.point ?? s.anchors.work?.point);

  // 좌표를 값으로 비교하기 위한 키(객체 identity는 매 렌더 바뀔 수 있다).
  const pointKey = point ? `${point.lat},${point.lng}` : null;
  // 동네를 바꾸면 catalogStatus가 idle이 아니어도 다시 받아야 한다.
  const lastPointRef = useRef<string | null>(null);

  useEffect(() => {
    if (catalogStatus !== "idle" && lastPointRef.current === pointKey) return;
    lastPointRef.current = pointKey;

    let cancelled = false;
    void (async () => {
      // 앵커 없음 → 반경 없이 기존대로. 빈 화면을 만들지 않는 게 우선이다.
      if (!point) {
        const { data, status } = await fetchOpportunities({ limit: NO_ANCHOR_LIMIT });
        if (!cancelled) setCatalog(data, status);
        return;
      }
      for (const radiusKm of RADII) {
        const { data, status } = await fetchOpportunities({ near: { point, radiusKm } });
        if (cancelled) return;
        const isLast = radiusKm === RADII[RADII.length - 1];
        if (data.length >= MIN_RESULTS || isLast) {
          setCatalog(data, status);
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // point는 pointKey로 값 비교 — 객체 identity 변화로 재조회되지 않게 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogStatus, pointKey, setCatalog]);
}
