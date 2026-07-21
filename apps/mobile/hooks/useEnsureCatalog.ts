import { useEffect } from "react";
import { fetchOpportunities } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/**
 * 카탈로그(서버 실데이터)가 아직 없으면 한 번 로드한다.
 * /loading을 거치지 않고 탐색/보관함/상세로 직접 진입해도 데이터가 채워지도록 보장.
 * (catalog는 세션 캐시라 persist되지 않으므로 앱 재시작·직접진입 시 비어 있을 수 있다.)
 */
export function useEnsureCatalog() {
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const setCatalog = useAppStore((s) => s.setCatalog);

  useEffect(() => {
    if (catalogStatus !== "idle") return;
    let cancelled = false;
    void (async () => {
      // 탐색용 넓은 로드(전 카테고리). today는 래퍼가 자동 주입 → 마감 지난 활동은 제외된다.
      const { data, status } = await fetchOpportunities({ limit: 300 });
      if (!cancelled) setCatalog(data, status);
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogStatus, setCatalog]);
}
