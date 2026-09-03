/**
 * sitemap.xml — 크롤러에게 "이런 페이지들이 있다"고 알린다.
 *
 * 상세페이지는 링크 그래프상 깊다(랜딩 → 탐색 → 카드 클릭). 게다가 탐색 목록은
 * 클라이언트 렌더 + 가상화라 크롤러가 카드 링크를 다 못 본다. 사이트맵이 없으면
 * 대부분의 활동 상세는 발견 자체가 안 된다.
 *
 * 개인화 경로(/saved, /my, /report, /diagnosis, /loading, /auth)는 넣지 않는다 —
 * 로그인·진단 상태에 따라 내용이 달라져 공개 색인 대상이 아니다(robots.ts와 동일 목록).
 */
import type { MetadataRoute } from "next";
import { fetchOpportunities, summarizeGu } from "@motungi/core";
import { isExpired, opportunityPath, SITE_URL } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

/** 사이트맵도 적재 주기(하루 1회)에 맞춰 캐시한다. */
export const revalidate = 21_600;

/**
 * 사이트맵에 담는 상세 URL 상한.
 *
 * 사이트맵 규격 상한은 50,000개지만 우리 활동은 현재 500건대라 여유가 크다.
 * 그럼에도 상한을 두는 건 적재가 늘었을 때 이 함수가 조용히 거대해지는 것을 막기 위함이다.
 * 넘어가면 인덱스 사이트맵으로 쪼개야 한다.
 */
const MAX_URLS = 5_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/onboarding`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Supabase 미설정(로컬·프리뷰)이면 정적 경로만 내보낸다 — 빌드가 깨지면 안 된다.
  if (!supabase) return staticEntries;

  const today = new Date().toISOString().slice(0, 10);
  const { data, status } = await fetchOpportunities(supabase, { today, limit: MAX_URLS });
  // 조회 실패 시 빈 사이트맵을 내보내면 "페이지가 사라졌다"는 신호가 된다 — 정적 경로는 남긴다.
  if (status === "error") return staticEntries;

  const detailEntries: MetadataRoute.Sitemap = data
    // 마감된 활동은 상세 메타데이터에서 noindex다 — 사이트맵에 넣으면 서로 모순된 신호를 준다.
    .filter((o) => !isExpired(o.deadline))
    .map((o) => ({
      url: `${SITE_URL}${opportunityPath(o.id)}`,
      // 활동 내용은 적재 후 거의 안 바뀐다. 바뀌는 건 마감 임박도뿐이라 weekly면 충분하다.
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  /**
   * 구 페이지(`/explore/[gu]`) — 답변 엔진이 인용할 집합 서술 페이지(M-073).
   *
   * `summarizeGu`가 임계 미달 구를 이미 걸러주므로, 여기 실리는 건 **실제로 생성되는
   * 페이지뿐**이다. 페이지가 없는 구를 사이트맵에 넣으면 404를 광고하는 꼴이고,
   * 반대로 임계를 넘는데 안 넣으면 크롤러가 발견할 경로가 없다 —
   * `/explore`가 클라이언트 렌더라 거기서 링크를 못 긁기 때문이다.
   * 같은 함수를 페이지와 사이트맵이 공유하므로 두 목록이 갈라지지 않는다.
   */
  const guEntries: MetadataRoute.Sitemap = summarizeGu(data).map((s) => ({
    url: `${SITE_URL}/explore/${encodeURIComponent(s.gu)}`,
    // 활동이 매일 들고나므로 목록 요약도 그만큼 바뀐다. 상세(weekly)보다 잦다.
    changeFrequency: "daily" as const,
    // 개별 활동(0.6)보다 높고 /explore(0.8)와 같은 급 — 지역 진입점이다.
    priority: 0.8,
  }));

  return [...staticEntries, ...guEntries, ...detailEntries];
}
