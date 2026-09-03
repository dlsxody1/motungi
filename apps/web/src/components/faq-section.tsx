/**
 * FAQ 섹션 — 화면과 FAQPage JSON-LD를 **한 배열에서** 함께 낸다 (M-095).
 *
 * ## 왜 컴포넌트 하나가 스크립트까지 같이 내는가
 * 구글 구조화 데이터 정책은 FAQPage 답변이 **사용자에게 실제로 보여야** 한다고 요구한다.
 * 이 규칙을 깨는 가장 흔한 방식은 "JSON-LD는 페이지에서, 마크업은 다른 곳에서" 각각
 * 관리하다 한쪽만 고치는 것이다. 그래서 여기서 `items` 하나를 받아 `<script>`와 `<dl>`을
 * 같은 렌더에서 만든다 — 갈라질 수가 없는 구조로 두는 게 규율보다 싸다.
 *
 * ## `<details>`인 이유
 * 접기/펴기를 JS로 만들면 이 페이지가 `"use client"`가 되고, 그러면 답변 텍스트가
 * 크롤러 HTML에서 사라질 위험이 생긴다(구 페이지의 존재 이유가 그것이다).
 * `<details>`는 네이티브라 서버 렌더로 끝나고, 닫혀 있어도 본문이 HTML에 남으며,
 * 키보드·스크린리더 동작도 브라우저가 준다.
 */
import { faqJsonLd, type FaqItem } from "@/lib/seo";

export function FaqSection({
  items,
  heading,
  className = "",
  // 한 페이지에 두 번 놓일 때만 넘기면 된다. `useId`를 쓰지 않는 이유: 이 컴포넌트는
  // 서버 컴포넌트로 쓰이고(구 페이지·랜딩 둘 다), 훅을 넣는 순간 "use client"가 되어
  // FAQ 본문이 크롤러 HTML에서 빠질 위험이 생긴다 — 그게 이 기능의 존재 이유와 정반대다.
  headingId = "faq-heading",
}: {
  items: readonly FaqItem[];
  heading: string;
  className?: string;
  headingId?: string;
}) {
  const json = faqJsonLd(items);
  // 항목이 없으면 제목만 남은 빈 섹션이 되므로 통째로 렌더하지 않는다.
  if (!json) return null;

  return (
    <section className={className} aria-labelledby={headingId}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      <h2
        id={headingId}
        className="text-[22px] font-bold leading-[30px] tracking-[-0.015em] text-ink"
      >
        {heading}
      </h2>
      {/* dl — 질문/답변은 의미상 정의 목록이다. details를 dt/dd로 감싸면 마크업이
          유효하지 않으므로 각 항목을 div로 묶는다(HTML 스펙이 허용하는 형태). */}
      <dl className="mt-5 border-t border-line-alt">
        {items.map(({ q, a }) => (
          <div key={q} className="border-b border-line-alt">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-ink transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                <dt className="inline">{q}</dt>
                {/* 아이콘 대신 회전하는 홑화살괄호 — 장식 아이콘을 늘리지 않으면서
                    열림/닫힘 상태를 시각적으로 준다. aria는 details가 이미 처리한다. */}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-[15px] text-faint transition-transform group-open:rotate-90"
                >
                  ›
                </span>
              </summary>
              <dd className="max-w-[65ch] pb-4 text-[15px] leading-[24px] text-pretty text-label">
                {a}
              </dd>
            </details>
          </div>
        ))}
      </dl>
    </section>
  );
}
