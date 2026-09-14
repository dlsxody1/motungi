/**
 * `/explore` 목록 페이지 전용 레이아웃 — ItemList JSON-LD (M-096).
 *
 * ## 왜 여기(라우트 그룹 `(list)`)인가, `explore/layout.tsx`가 아니라
 * `apps/web/src/app/explore/layout.tsx`는 `/explore/*` 전부(이 목록 + `[gu]` 지역 페이지)를
 * 감싼다. `[gu]` 페이지는 이미 자기 몫의 `ItemList` JSON-LD를 산문·활동 목록과 함께 서버에서
 * 직접 낸다(`[gu]/page.tsx`의 `itemListJsonLd`) — 거기에 이 레이아웃까지 겹치면 같은 종류의
 * 스크립트가 두 번 실려 오히려 신호가 흐려진다. Next.js 라우트 그룹(`(list)`)은 그 그룹
 * 디렉토리 아래 라우트에만 적용되므로, 여기 두면 `/explore`(목록)에만 붙고 `/explore/[gu]`에는
 * 전혀 영향을 주지 않는다 — 별도 조건 분기 없이 구조로 보장된다.
 *
 * ## 왜 필요한가
 * `/explore` 목록은 `"use client"` + 가상화라 크롤러가 받는 HTML 본문이 거의 없다
 * (`[gu]/page.tsx` 상단 주석의 실측과 같은 문제). 이 레이아웃은 서버 컴포넌트라 본문과 무관하게
 * 실행되므로, 카드 텍스트는 못 긁혀도 이 스크립트로 최소한 "이런 활동들이 있다"는 구조는
 * 전달된다 — `docs/AEO.md`가 명시하는 임시방편(근본 해결은 `[gu]` 페이지들이다).
 */
import type { ReactNode } from "react";
import { fetchOpportunities } from "@/data/opportunities";
import { itemListJsonLd } from "@/lib/seo";

/** 적재가 하루 1회라 다른 AEO 표면(sitemap·[gu])과 같은 주기로 캐시한다. */
export const revalidate = 21_600;

/** ItemList에 실을 상한. `[gu]/page.tsx`의 LIST_MAX(40) 관례를 그대로 따른다. */
const LIST_MAX = 40;

/** 실패·빈 결과면 null — 빈/깨진 구조화 데이터를 내보내지 않는다(faqJsonLd와 같은 규율). */
async function getItemListJson(): Promise<string | null> {
  const { data, status } = await fetchOpportunities({ limit: LIST_MAX });
  if (status !== "ok" || data.length === 0) return null;
  return itemListJsonLd(data, "동네 활동 탐색");
}

export default async function ExploreListLayout({ children }: { children: ReactNode }) {
  const json = await getItemListJson();
  return (
    <>
      {json != null && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      )}
      {children}
    </>
  );
}
