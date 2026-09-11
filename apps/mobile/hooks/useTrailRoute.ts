import { useEffect, useState } from "react";

/**
 * 산책로(걷기길) 코스 경로 — 모바일판(M-052). 웹 useTrailRoute.ts(apps/web/src/hooks)와
 * 같은 계약: 이미 공개 배포돼 있는 `/api/trail-route?id=`를 그대로 호출해
 * `[[lat, lng], ...]`를 받는다. 신규 백엔드도 신규 시크릿도 없다.
 *
 * M-052는 08-13~09-09까지 28일 연속 기각됐다 — 세 경로 전부 무인 야간 실행에 부적합했다:
 * (1) react-native-maps: 신규 네이티브 의존성 → Expo prebuild/EAS + 사람 승인 필요.
 * (2) NAVER 정적지도 백엔드 프록시 신설: 존재하지 않는 신규 NCP 자격증명 필요.
 * (3) 키리스 서드파티 정적지도: security-policy.md의 NAVER-only 프록시 원칙 위반.
 * 이 훅은 네 번째 경로 — 이미 배포된 웹 API를 재사용하는 것뿐이라 위 세 차단을 모두 피한다.
 *
 * 모바일엔 react-query가 없으므로(useWhyReasons.ts와 동일한 제약) plain
 * useState/useEffect로 구현한다. WEB_ORIGIN은 함수 내부에서 매 호출 시 읽는다 —
 * Expo 번들러가 EXPO_PUBLIC_*을 빌드타임에 정적 치환하므로 런타임 동작은 동일하다.
 *
 * ⚠️ EXPO_PUBLIC_SITE_URL(opportunity.tsx의 onShare가 쓰는 상수)과 다르다 — 그건
 * 외부에 공유할 딥링크를 만드는 용도고, 이건 앱이 자기 자신의 웹 API를 호출하는
 * 용도다. 혼동 금지(geo.ts·useWhyReasons.ts와 같은 EXPO_PUBLIC_WEB_ORIGIN을 쓴다).
 *
 * 실패(오리진 미설정·네트워크 오류·404 등)는 전부 null — 지도 카드는 딥링크만
 * 유지하고 폴리라인만 생략한다(우아한 열화, 에러 노출 없음).
 */
export function useTrailRoute(id: string | null, enabled: boolean): [number, number][] | null {
  const [points, setPoints] = useState<[number, number][] | null>(null);

  useEffect(() => {
    setPoints(null);

    const webOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN;
    if (!enabled || !id || !webOrigin) return;

    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`${webOrigin}/api/trail-route?id=${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        if (cancelled || !res.ok) return;
        const json = (await res.json()) as { points?: [number, number][] };
        if (!cancelled && Array.isArray(json.points) && json.points.length > 0) {
          setPoints(json.points);
        }
      } catch {
        // 경로 없이 딥링크만 유지한다 — 우아한 열화, 에러 노출 없음.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, enabled]);

  return points;
}
