import { useEffect } from "react";
import {
  loadCatalogByRadiusLadder,
  NO_ANCHOR_LIMIT,
  type NoAnchorFetch,
  type RadiusFetch,
} from "@motungi/core";
import { fetchOpportunities } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/**
 * "이 pointKey로 이미 fetch를 트리거했는가"를 모듈 스코프에 둔다(useRef 아님).
 * useRef는 컴포넌트 인스턴스 하나에 묶여, Explore/상세 탭을 오가며 이 훅을 쓰는 화면이
 * 언마운트·재마운트될 때마다 새 ref(null)로 초기화된다 — 그 순간 전역 store엔 이미
 * catalogStatus가 "idle"이 아닌 성공 상태로 남아 있어도 가드가 어긋나 반경 사다리
 * 전체를 매번 재조회했다(M-063). 모듈 스코프 변수는 같은 JS 세션 동안 살아남아
 * catalog와 동일한 세션 캐시 수명을 갖는다.
 */
let lastFetchedKey: string | null = null;

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

  useEffect(() => {
    // 동네를 바꾸면 catalogStatus가 idle이 아니어도 다시 받아야 한다.
    if (catalogStatus !== "idle" && lastFetchedKey === pointKey) return;
    lastFetchedKey = pointKey;

    let cancelled = false;
    // 사다리 정책 자체는 core로 승격됐다(M-072) — 여기선 fetchOpportunities를 감싸면서
    // "이미 언마운트됐으면 다음 반경을 실제로 부르지 않는다"만 챙긴다. loadCatalogByRadiusLadder는
    // React/취소 개념을 모르는 순수 오케스트레이션이라, 취소는 콜백 안에서만 처리한다.
    // 진행 중이던 fetch 1건은 기존과 동일하게 끝까지 완료된다 — 아래 최종 cancelled 게이트가
    // setCatalog 반영 여부를 막는다.
    const fetchAtRadius: RadiusFetch = ({ point: p, radiusKm }) => {
      if (cancelled) return Promise.resolve({ data: [], status: "empty" });
      return fetchOpportunities({ near: { point: p, radiusKm } });
    };
    const noAnchorFetch: NoAnchorFetch = () => {
      if (cancelled) return Promise.resolve({ data: [], status: "empty" });
      return fetchOpportunities({ limit: NO_ANCHOR_LIMIT });
    };
    void (async () => {
      const { result } = await loadCatalogByRadiusLadder(point ?? null, fetchAtRadius, noAnchorFetch);
      if (!cancelled) setCatalog(result.data, result.status);
    })();
    return () => {
      cancelled = true;
    };
    // point는 pointKey로 값 비교 — 객체 identity 변화로 재조회되지 않게 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogStatus, pointKey, setCatalog]);
}
