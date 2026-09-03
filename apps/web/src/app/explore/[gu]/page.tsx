/**
 * `/explore/[gu]` — 구(區) 단위 지역 페이지. **서버 컴포넌트**다 (M-073).
 *
 * ## 왜 이 경로가 필요한가
 * `/explore`는 `"use client"` + 가상화라 크롤러가 받는 HTML 본문이 **21자**다(2026-09-03
 * 실측: `<title>` 하나가 전부). 답변 엔진("퇴근하고 뭐하지", "성수동 퇴근 후 갈 만한 곳")이
 * 인용할 텍스트가 물리적으로 없다. 상세 페이지는 SSR이지만 단건이라 "뭐하지?"의 답이 못 된다 —
 * 답변 엔진이 원하는 건 "이 동네엔 이런 선택지들이 있다"는 **집합적 서술**이다. 근거: `docs/AEO.md`.
 *
 * ## 그래서 이 페이지의 설계 원칙은 "인용 가능함"이다
 * - `"use client"`를 쓰지 않는다. 필터·정렬이 필요하면 기존 `/explore`로 보낸다.
 * - 본문 첫 블록이 **산문**이다. 카드 그리드가 아니라. 카드는 이미 `/explore`가 하는 일이고,
 *   답변 엔진은 카드 UI가 아니라 문장을 집어간다.
 * - 모든 숫자는 `summarizeGu` 집계에서 나온다. 하드코딩·추정 금지 — 지어낸 수치 하나가
 *   인용 신뢰를 통째로 깎는다.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchOpportunities,
  GU_MIN_ACTIVITIES,
  isSeoulGu,
  summarizeGu,
  summarySentence,
  type GuSummary,
  type MockOpportunity,
} from "@motungi/core";
import { SiteFooter, TopNav, WebContainer } from "@/components/web-shell";
import { opportunityPath, SITE_URL } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

/** 적재가 하루 1회라 sitemap·상세와 같은 주기로 캐시한다. */
export const revalidate = 21_600;

/** 목록에 싣는 활동 상한. 페이지가 무한정 길어지지 않게. */
const LIST_MAX = 40;

/**
 * 이 구의 활동 + 집계. 메타데이터와 본문이 각각 부르지만 Next가 요청 단위로 중복 제거한다.
 *
 * 마감 필터를 여기서 한 번만 건다 — 집계와 목록이 서로 다른 모수를 쓰면
 * "74개"라고 써놓고 73개를 보여주는 사고가 난다.
 */
async function getGuData(
  gu: string,
): Promise<{ summary: GuSummary; items: MockOpportunity[] } | null> {
  if (!supabase) return null;
  const today = new Date().toISOString().slice(0, 10);
  // 구 필터는 DB에서 못 건다 — dong_name이 "종로구"/"서울 종로구"로 분열돼 있어
  // 정규화가 필요하고, 그 규칙(normalizeGu)은 core에 있다. 전량 받아 여기서 좁힌다.
  const { data, status } = await fetchOpportunities(supabase, { today, limit: 1_000 });
  if (status !== "ok") return null;

  const summary = summarizeGu(data).find((s) => s.gu === gu);
  // 임계 미달이면 페이지를 만들지 않는다 — summarizeGu가 이미 걸러서 여기로 안 온다.
  if (!summary) return null;

  const items = data
    .filter((o) => o.location?.dongName?.includes(gu))
    .slice(0, LIST_MAX);
  return { summary, items };
}

/**
 * 빌드타임에 생성할 구 목록.
 *
 * 여기서 DB를 읽어 **실제로 임계를 넘는 구만** 만든다. 25구를 통째로 넣으면 활동 2개짜리
 * 구도 페이지가 생겨 얇은 콘텐츠가 된다. 빌드 시점에 DB를 못 읽으면(로컬·프리뷰) 빈 배열을
 * 반환해 요청 시 생성으로 넘긴다 — 빌드가 깨지면 안 된다.
 */
export async function generateStaticParams() {
  if (!supabase) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, status } = await fetchOpportunities(supabase, { today, limit: 1_000 });
  if (status !== "ok") return [];
  return summarizeGu(data).map((s) => ({ gu: s.gu }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gu: string }>;
}): Promise<Metadata> {
  const { gu: raw } = await params;
  const gu = decodeURIComponent(raw);
  if (!isSeoulGu(gu)) {
    return { title: "동네를 찾을 수 없어요", robots: { index: false, follow: false } };
  }
  const found = await getGuData(gu);
  // 활동이 임계 미달이면 색인시키지 않는다 — 곧 /explore로 리다이렉트될 페이지다.
  if (!found) {
    return { title: `${gu} 활동`, robots: { index: false, follow: true } };
  }

  const title = `${gu} 퇴근 후·주말 활동`;
  // description도 집계에서 만든다. 검색결과 스니펫이 곧 답변 엔진이 읽는 첫 문장이다.
  const description = summarySentence(found.summary);
  const url = `/explore/${encodeURIComponent(gu)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [gu, `${gu} 가볼만한곳`, "퇴근 후", "주말 활동", "동네 문화"],
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * ItemList JSON-LD — 이 페이지가 "활동 목록"임을 명시한다.
 *
 * 값은 우리 DB에서 왔고 `<`를 이스케이프해 스크립트 조기 종료를 막는다(seo.ts와 같은 이유).
 */
function itemListJsonLd(gu: string, items: readonly MockOpportunity[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${gu} 퇴근 후·주말 활동`,
    numberOfItems: items.length,
    itemListElement: items.map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: o.title,
      url: `${SITE_URL}${opportunityPath(o.id)}`,
    })),
  }).replace(/</g, "\\u003c");
}

export default async function GuPage({ params }: { params: Promise<{ gu: string }> }) {
  const { gu: raw } = await params;
  const gu = decodeURIComponent(raw);
  // 서울 구가 아니면 진짜 404다 — soft 404를 색인시키지 않는다.
  if (!isSeoulGu(gu)) notFound();

  const found = await getGuData(gu);
  // 활동이 너무 적으면 빈약한 페이지를 보여주느니 탐색으로 보낸다.
  if (!found) {
    return (
      <GuFrame gu={gu}>
        <h1 className="text-[22px] font-bold leading-[30px] tracking-[-0.01em] text-ink">
          {gu}는 아직 준비 중이에요
        </h1>
        <p className="mt-3 max-w-[65ch] text-[15px] leading-[23px] text-label">
          지금 {gu}에 소개할 만한 활동이 {GU_MIN_ACTIVITIES}개가 안 돼요. 활동이 모이면 이
          페이지를 열어둘게요. 그동안은 전체 탐색에서 가까운 동네를 둘러보세요.
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[15px] font-bold text-white transition-colors hover:bg-primary-deep"
        >
          전체 활동 둘러보기
        </Link>
      </GuFrame>
    );
  }

  const { summary, items } = found;

  return (
    <GuFrame gu={gu}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: itemListJsonLd(gu, items) }}
      />
      {/* 한 줄로 붙여 쓴다 — 줄바꿈하면 JSX가 공백을 넣어 "종로구 에서"가 된다. */}
      <h1 className="text-[26px] font-extrabold leading-[34px] tracking-[-0.02em] text-balance text-ink md:text-[30px] md:leading-[39px]">{`${gu}에서 퇴근하고 뭐하지?`}</h1>

      {/*
        답변 엔진이 통째로 집어갈 자족적 산문. 이 페이지의 존재 이유이므로 목록보다 앞에 둔다.
        줄길이는 65ch로 제한 — 프로즈 가독성 기준(DESIGN.md).
      */}
      <p className="mt-4 max-w-[65ch] text-[17px] leading-[28px] text-pretty text-label">
        {summarySentence(summary)}
      </p>
      <p className="mt-3 max-w-[65ch] text-[15px] leading-[24px] text-pretty text-muted">
        아래 목록은 마감이 지나지 않은 활동만 모은 것이고, 매일 한 번 새로 확인해요. 집이나 회사
        위치를 알려주면 그중에서 가장 가까운 걸 골라줄 수 있어요.
      </p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {items.map((o) => (
          <li key={o.id}>
            {/*
              카드지만 그리드 장식이 아니라 목록 항목이다. 배경-카드 대비가 1.04:1뿐이라
              border-line-alt + shadow-card를 함께 쓴다(DESIGN.md 박스 규칙).
            */}
            <Link
              href={opportunityPath(o.id)}
              className="flex h-full flex-col rounded-xl border border-line-alt bg-surface p-4 shadow-card transition-shadow hover:shadow-hero"
            >
              <span className="text-[13px] font-medium text-muted">{o.categoryLabel}</span>
              <span className="mt-1.5 text-[17px] font-semibold leading-[24px] text-balance text-ink">
                {o.title}
              </span>
              <span className="mt-auto pt-3 text-[15px] font-bold text-primary">{o.costLabel}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-[15px] leading-[23px] text-label">
        찾는 게 없나요?{" "}
        <Link href="/explore" className="font-semibold text-primary underline underline-offset-4">
          전체 활동에서 카테고리와 동네로 좁혀
        </Link>{" "}
        볼 수 있어요.
      </p>
    </GuFrame>
  );
}

/**
 * 페이지 껍데기 — 본문을 **한 번만** 렌더한다.
 *
 * `DesktopShell`로 감싸지 않은 이유가 이 컴포넌트의 존재 이유다. 그건 `hidden md:flex`라
 * 데스크톱 전용이어서, 그것만 쓰면 모바일에서 페이지가 통째로 빈 화면이 된다 —
 * 사용 맥락이 "대부분 모바일"인 제품에서 치명적이고 모바일 우선 색인에도 최악이다.
 *
 * 그렇다고 모바일·데스크톱 트리를 각각 두면 **같은 본문이 HTML에 두 번** 들어간다.
 * 렌더 비용 문제이자(`react-web.md` 렌더 격리) 크롤러가 중복 텍스트를 받는 문제다 —
 * 상세 페이지가 지금 정확히 그 상태이고 이번 감사에서 P1으로 잡혔다. 되풀이하지 않는다.
 *
 * `TopNav`·`SiteFooter`는 그 자체가 이미 `hidden md:*`이므로(web-shell.tsx:93,161)
 * 직접 조립하면 모바일에선 알아서 빠진다. 본문은 한 벌로 두고 껍데기만 반응한다.
 */
function GuFrame({ gu, children }: { gu: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-[14px] focus:font-bold focus:text-white"
      >
        본문 바로가기
      </a>
      {/* 이 화면은 동네가 URL로 정해져 있다 — 헤더 동네 pill은 중복이라 숨긴다. */}
      <TopNav active="explore" variant="marketing" hideNeighborhood />
      <main id="main" className="flex-1">
        <WebContainer className="py-10 md:py-14">
          <nav aria-label="위치" className="mb-6 text-[13px] text-muted">
            <Link href="/explore" className="underline underline-offset-4 hover:text-label">
              동네 활동 탐색
            </Link>
            <span className="mx-1.5" aria-hidden="true">
              ›
            </span>
            <span className="text-label">{gu}</span>
          </nav>
          {children}
        </WebContainer>
      </main>
      <SiteFooter />
    </div>
  );
}
