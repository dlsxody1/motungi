/**
 * SEO 헬퍼 — 활동 1건 → 메타데이터 / JSON-LD.
 *
 * 페이지 컴포넌트에서 분리한 이유는 테스트다. 메타데이터 생성은 "제목이 잘리는가",
 * "이미지가 절대 URL인가", "마감된 활동을 색인시키는가" 같은 판단이 들어가는 로직이라
 * 렌더 없이 단위 테스트로 고정하는 편이 낫다.
 */
import type { Metadata } from "next";
import type { MockOpportunity } from "@/data/opportunities";

/**
 * 사이트 정식 오리진 — **웹 전역 단일 출처**. canonical·og:url·sitemap·JSON-LD가 전부 이 값을 쓴다.
 *
 * fallback이 `motungi.app`이던 시절 프로덕션 env가 비어 있어 이 값이 그대로 새어나갔고,
 * 그 도메인은 DNS가 없다(2026-09-03 실측 `curl` exit 6). 결과로 sitemap의 모든 `<loc>`,
 * canonical, og:image가 존재하지 않는 호스트를 가리켰다 — 색인은 물론 카카오·슬랙 공유
 * 미리보기까지 깨졌다. **fallback은 "설정을 깜빡했을 때의 방어선"이지 정상 경로가 아니므로,
 * 반드시 실제로 접근 가능한 호스트여야 한다.** 도메인을 붙이면 env와 이 값을 함께 바꾼다.
 *
 * 예전엔 layout.tsx·report/page.tsx·opportunity-detail.tsx가 같은 fallback을 각자 복붙했다.
 * 한 곳만 고치고 나머지를 놓치는 사고를 막으려 여기로 모았다 — 새로 쓸 곳도 여기서 import 한다.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://motungi-web.vercel.app";
const SITE_NAME = "모퉁이 Corner";

/**
 * og:description 상한. 구글은 검색결과에서 대략 155~160자에서 자르고,
 * 카카오/슬랙 미리보기도 비슷한 지점에서 말줄임한다. 우리가 먼저 자르면
 * 문장 중간에서 끊기는 대신 "…"로 끝나 읽히기라도 한다.
 */
const DESC_MAX = 155;

/** 지정 길이를 넘으면 단어 경계에서 자르고 말줄임표를 붙인다. */
export function truncate(s: string, max = DESC_MAX): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  // 단어 중간에서 끊지 않는다 — 뒤쪽에 공백이 있으면 거기까지만.
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** 상대 경로·프로토콜 없는 이미지 URL을 절대 URL로. og:image는 절대 URL이어야 한다. */
export function absoluteUrl(u: string | undefined): string | undefined {
  if (!u) return undefined;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** 활동 상세의 정식(canonical) 경로. 쿼리 파라미터 구형 URL이 아니라 이쪽이 정식이다. */
export function opportunityPath(id: string): string {
  return `/opportunity/${encodeURIComponent(id)}`;
}

/**
 * 활동 설명문 조립 — description 원문 > summary 순.
 * 둘 다 없으면 카테고리·동네로 최소한의 문장을 만든다(빈 description보다 낫다).
 */
function describe(o: MockOpportunity): string {
  const raw = o.description?.trim() || o.summary?.trim();
  if (raw) return truncate(raw);
  const where = o.location?.dongName;
  return truncate(
    `${where ? `${where} ` : ""}${o.categoryLabel} · ${o.costLabel}. 퇴근 후·주말에 즐길 우리 동네 활동.`,
  );
}

/**
 * 활동 1건 → 페이지 메타데이터.
 *
 * 마감된 활동은 `noindex`로 둔다: 검색에서 들어온 사람이 이미 끝난 활동을 보는 건
 * 나쁜 경험이고, 그런 페이지가 쌓이면 사이트 전체 품질 평가에도 불리하다.
 * (직접 링크로 들어오면 여전히 정상적으로 보인다 — 색인만 막는 것이다.)
 */
export function opportunityMetadata(o: MockOpportunity, id: string): Metadata {
  const description = describe(o);
  const image = absoluteUrl(o.imageUrl);
  const url = opportunityPath(id);
  const where = o.location?.dongName;
  // 제목에 동네를 넣는다 — "망원동"처럼 지역명으로 검색하는 게 이 서비스의 실제 유입 경로다.
  const title = where ? `${o.title} · ${where}` : o.title;
  const expired = isExpired(o.deadline);

  return {
    title,
    description,
    // 쿼리 URL·중복 경로가 있어도 이 주소 하나로 평가를 모은다.
    alternates: { canonical: url },
    keywords: [o.categoryLabel, where, "동네 문화", "퇴근 후", "주말 활동"].filter(
      (k): k is string => !!k,
    ),
    robots: expired ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      siteName: SITE_NAME,
      url,
      title,
      description,
      // 활동 이미지가 없으면 필드를 비워 루트의 기본 og 이미지가 쓰이게 둔다.
      ...(image ? { images: [{ url: image, alt: o.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/** 마감일이 오늘보다 이전인가. deadline 없으면(상시) 만료 아님. */
export function isExpired(deadline: string | undefined, today = new Date()): boolean {
  if (!deadline) return false;
  const end = Date.parse(`${deadline}T23:59:59Z`);
  if (Number.isNaN(end)) return false;
  return end < today.getTime();
}

/**
 * JSON-LD 문자열을 <script>에 넣기 안전하게 만든다.
 *
 * 데이터에 `</script>`가 들어 있으면 스크립트 블록이 거기서 끝나버린다(XSS 벡터).
 * `<`를 유니코드 이스케이프하면 JSON 의미는 그대로면서 파서가 태그로 오인하지 않는다.
 */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * 활동 → schema.org Event JSON-LD.
 *
 * Event를 고른 이유: 우리 데이터는 대부분 기간·장소가 있는 문화/공연/체험이고,
 * 구글이 날짜·장소·가격을 리치 결과로 보여주는 타입이 Event다.
 * 상시 운영(걷기길·체육시설 등 deadline 없음)은 startDate를 만들 수 없어 Place로 낮춘다 —
 * 없는 날짜를 지어내면 구조화 데이터 오류가 된다.
 */
export function eventJsonLd(o: MockOpportunity, id: string): string {
  const url = `${SITE_URL}${opportunityPath(id)}`;
  const image = absoluteUrl(o.imageUrl);
  const where = o.location?.dongName;
  const point = o.location?.point;

  const location = {
    "@type": "Place",
    name: where ?? "서울·수도권",
    ...(where ? { address: { "@type": "PostalAddress", addressLocality: where, addressCountry: "KR" } } : {}),
    ...(point ? { geo: { "@type": "GeoCoordinates", latitude: point.lat, longitude: point.lng } } : {}),
  };

  const base = {
    "@context": "https://schema.org",
    name: o.title,
    description: describe(o),
    url,
    ...(image ? { image: [image] } : {}),
  };

  // 마감일이 없으면 기간을 특정할 수 없다 → Event 대신 Place로.
  // location을 통째로 펼치지 않는다 — 그러면 name이 활동명에서 동네명으로 덮인다.
  // 주소·좌표만 옮겨오고 이름은 활동 제목을 유지한다.
  if (!o.deadline) {
    const { address, geo } = location as { address?: unknown; geo?: unknown };
    return safeJson({
      ...base,
      "@type": "Place",
      ...(address ? { address } : {}),
      ...(geo ? { geo } : {}),
    });
  }

  return safeJson({
    ...base,
    "@type": "Event",
    // 우리 DB는 종료일(deadline)만 갖는다. 시작일을 모르면 구글이 Event를 거부하므로
    // 종료일을 시작일로도 쓴다 — "이 날까지"라는 사실만 정확히 표현한다.
    startDate: o.deadline,
    endDate: o.deadline,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location,
    offers: {
      "@type": "Offer",
      price: o.costKrw ?? 0,
      priceCurrency: "KRW",
      availability: "https://schema.org/InStock",
      url: o.ctaUrl && o.ctaUrl !== "#" ? o.ctaUrl : url,
    },
    ...(o.sourceLabel
      ? { organizer: { "@type": "Organization", name: o.sourceLabel } }
      : {}),
  });
}

/** FAQ 한 쌍. 화면과 JSON-LD가 **같은 객체**를 쓰게 해서 둘이 갈라지지 않게 한다. */
export interface FaqItem {
  q: string;
  a: string;
}

/**
 * FAQ 목록 → schema.org FAQPage JSON-LD. 빈 목록이면 `null`.
 *
 * `null`을 반환하는 게 핵심이다. 항목 0개짜리 FAQPage는 구조화 데이터 오류이고,
 * 호출부가 `{... && <script>}`로 통째로 빼게 만든다 — 빈 스크립트 태그를 내보내지 않는다.
 *
 * **화면에 없는 답변을 여기 넣지 마라.** 구글 정책상 FAQPage는 사용자가 실제로 볼 수 있는
 * 내용이어야 한다. 그래서 이 함수는 마크업을 만들지 않는다 — 같은 `FaqItem[]`을 화면도
 * 받아 렌더하는 구조를 강제하려는 것이다(호출부 참조).
 *
 * 이스케이프는 `safeJson`이 한다(`</script>` 조기 종료 방어) — eventJsonLd와 같은 이유.
 */
export function faqJsonLd(items: readonly FaqItem[]): string | null {
  if (items.length === 0) return null;
  return safeJson({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  });
}
