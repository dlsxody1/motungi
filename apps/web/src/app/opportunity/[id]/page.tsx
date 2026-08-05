/**
 * A6 · 기회 상세 — **서버 컴포넌트 껍데기**.
 *
 * 왜 이 경로가 생겼나 (SEO):
 * 예전 정식 경로는 `/opportunity?id=X`였고 `"use client"`였다. 그래서
 *  1) generateMetadata를 쓸 수 없어 **모든 활동이 루트 메타데이터를 공유**했다 —
 *     검색결과·카카오 공유 미리보기에서 500개 활동이 전부 같은 제목·같은 이미지였다.
 *  2) 크롤러는 쿼리 파라미터 변형을 개별 문서로 잘 취급하지 않는다.
 * 즉 상세페이지는 사실상 색인 불가였다. 메타데이터만 붙여선 못 고치고 경로 자체를 바꿔야 했다.
 *
 * 여기서 서버가 1건을 미리 조회해 (a) 활동별 메타데이터 (b) JSON-LD (c) 초기 HTML을 만든다.
 * 본문 자체는 여전히 클라이언트 컴포넌트다(저장·지도·공유가 브라우저를 요구).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchOpportunityById } from "@motungi/core";
import { OpportunityDetail } from "@/components/opportunity-detail";
import { eventJsonLd, opportunityMetadata } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

/**
 * 적재는 하루 1회(pg_cron)라 상세도 그 주기에 맞춘다. 개별 활동 페이지는 수백 개라
 * 매 요청 DB를 때리면 크롤러가 훑을 때 그대로 부하가 된다.
 */
export const revalidate = 21_600;

/**
 * 사전 생성 목록을 비워둔다 — 활동은 매일 바뀌고 수백 건이라 빌드 타임에 고정할 수 없다.
 * 첫 요청 시 렌더 후 revalidate 주기로 캐시된다(ISR).
 */
export async function generateStaticParams() {
  return [];
}

/** id로 1건 조회. 메타데이터와 본문이 각각 호출하지만 Next가 요청 단위로 중복 제거한다. */
async function getOpportunity(id: string) {
  const { data } = await fetchOpportunityById(supabase, id);
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const o = await getOpportunity(id);
  // 없는 활동에 그럴듯한 메타데이터를 붙이면 검색엔진에 빈 페이지를 광고하는 셈이다.
  if (!o) {
    return { title: "활동을 찾을 수 없어요", robots: { index: false, follow: false } };
  }
  return opportunityMetadata(o, id);
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const o = await getOpportunity(id);
  // 존재하지 않는 id는 200 + "없음 화면"이 아니라 진짜 404여야 한다 —
  // 크롤러가 soft 404를 색인하지 않도록.
  if (!o) notFound();

  return (
    <>
      {/*
        JSON-LD — 구글이 날짜·장소·가격을 리치 결과로 쓸 수 있게 한다.
        dangerouslySetInnerHTML이지만 값은 우리 DB에서 온 데이터를 JSON.stringify한 것이고,
        seo.ts에서 `<` 를 이스케이프해 스크립트 조기 종료(</script>)를 막는다.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: eventJsonLd(o, id) }}
      />
      <OpportunityDetail id={id} initial={o} />
    </>
  );
}
