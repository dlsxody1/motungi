/**
 * SEO 헬퍼 단위 테스트.
 *
 * 여기서 고정하려는 건 "메타 태그가 나온다"가 아니라 **판단이 들어간 부분**이다:
 * 마감된 활동을 색인시키지 않는지, og:image가 절대 URL인지, JSON-LD가 스크립트를
 * 탈출시키지 않는지. 전부 조용히 틀려도 화면상으론 멀쩡해 보이는 것들이다.
 */
import { describe, expect, it } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import {
  absoluteUrl,
  eventJsonLd,
  faqJsonLd,
  isExpired,
  opportunityMetadata,
  SITE_URL,
  truncate,
} from "./seo";

const BASE: MockOpportunity = {
  id: "op-1",
  source: "seoul_culture",
  category: "culture",
  title: "망원동 동네 전시",
  summary: "망원동 갤러리에서 열리는 소규모 전시",
  costKrw: 0,
  difficulty: 0.2,
  categoryLabel: "동네 문화·공연",
  costLabel: "무료",
  costUnit: "1인",
  costHeading: "참가비",
  matchScore: 92,
  meta: [],
  tone: "brand",
  location: { dongName: "망원동", point: { lat: 37.55, lng: 126.9 } },
};

describe("truncate", () => {
  it("상한 이하면 그대로 둔다", () => {
    expect(truncate("짧은 설명", 50)).toBe("짧은 설명");
  });

  it("상한을 넘으면 말줄임표를 붙인다", () => {
    const out = truncate("가".repeat(200));
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith("…")).toBe(true);
  });

  it("연속 공백·줄바꿈을 한 칸으로 접는다", () => {
    // 공공데이터 원문엔 줄바꿈이 섞여 온다 — 그대로 두면 미리보기에서 깨져 보인다.
    expect(truncate("가  나\n\n다")).toBe("가 나 다");
  });
});

describe("absoluteUrl", () => {
  it("이미 절대 URL이면 그대로", () => {
    expect(absoluteUrl("https://culture.seoul.go.kr/a.jpg")).toBe(
      "https://culture.seoul.go.kr/a.jpg",
    );
  });

  it("상대 경로는 사이트 URL을 붙인다 — og:image는 절대 URL이어야 한다", () => {
    expect(absoluteUrl("/brand/x.png")).toMatch(/^https?:\/\/.+\/brand\/x\.png$/);
  });

  it("없으면 undefined(루트 기본 이미지로 폴백)", () => {
    expect(absoluteUrl(undefined)).toBeUndefined();
  });
});

describe("isExpired", () => {
  const today = new Date("2026-08-05T00:00:00Z");

  it("마감일이 없으면(상시) 만료가 아니다", () => {
    expect(isExpired(undefined, today)).toBe(false);
  });

  it("마감일 당일은 아직 만료가 아니다", () => {
    expect(isExpired("2026-08-05", today)).toBe(false);
  });

  it("마감일이 지났으면 만료", () => {
    expect(isExpired("2026-08-04", today)).toBe(true);
  });
});

describe("opportunityMetadata", () => {
  it("제목에 동네를 넣는다 — 지역명 검색이 실제 유입 경로다", () => {
    const m = opportunityMetadata(BASE, "op-1");
    expect(m.title).toBe("망원동 동네 전시 · 망원동");
  });

  it("canonical은 쿼리 URL이 아니라 path 형태다", () => {
    const m = opportunityMetadata(BASE, "op-1");
    expect(m.alternates?.canonical).toBe("/opportunity/op-1");
  });

  it("id를 URL 인코딩한다(경로 조작 방지)", () => {
    const m = opportunityMetadata(BASE, "a/b?c");
    expect(m.alternates?.canonical).toBe("/opportunity/a%2Fb%3Fc");
  });

  /**
   * 마감된 활동이 검색결과에 남으면, 들어온 사람은 이미 끝난 걸 보게 된다.
   * 페이지는 정상 동작하되 색인만 막는 게 맞다.
   */
  it("마감된 활동은 noindex", () => {
    const m = opportunityMetadata({ ...BASE, deadline: "2020-01-01" }, "op-1");
    expect(m.robots).toMatchObject({ index: false });
  });

  it("진행 중인 활동은 색인 허용", () => {
    const m = opportunityMetadata({ ...BASE, deadline: "2999-01-01" }, "op-1");
    expect(m.robots).toMatchObject({ index: true });
  });

  it("이미지가 없으면 og:image를 비워 루트 기본값이 쓰이게 둔다", () => {
    const m = opportunityMetadata(BASE, "op-1");
    expect(m.openGraph?.images).toBeUndefined();
    // Metadata의 Twitter는 카드 종류별 유니온이라 card가 공통 필드로 안 보인다 — 좁혀서 읽는다.
    expect((m.twitter as { card?: string } | undefined)?.card).toBe("summary");
  });

  it("이미지가 있으면 large_image 카드로 올린다", () => {
    const m = opportunityMetadata({ ...BASE, imageUrl: "https://x.test/a.jpg" }, "op-1");
    // Metadata의 Twitter는 카드 종류별 유니온이라 card가 공통 필드로 안 보인다 — 좁혀서 읽는다.
    expect((m.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
  });

  it("description·summary가 없어도 빈 설명을 내보내지 않는다", () => {
    const { summary: _s, ...rest } = BASE;
    const m = opportunityMetadata({ ...rest, summary: "" } as MockOpportunity, "op-1");
    expect(m.description).toBeTruthy();
    expect(m.description).toContain("망원동");
  });
});

describe("eventJsonLd", () => {
  it("마감일이 있으면 Event로, 시작·종료일을 채운다", () => {
    const json = JSON.parse(eventJsonLd({ ...BASE, deadline: "2026-09-01" }, "op-1"));
    expect(json["@type"]).toBe("Event");
    expect(json.startDate).toBe("2026-09-01");
    expect(json.offers).toMatchObject({ price: 0, priceCurrency: "KRW" });
  });

  it("마감일이 없으면 Place로 낮춘다 — 없는 날짜를 지어내지 않는다", () => {
    const json = JSON.parse(eventJsonLd(BASE, "op-1"));
    expect(json["@type"]).toBe("Place");
    expect(json.startDate).toBeUndefined();
  });

  it("Place로 낮춰도 name은 활동 제목을 유지한다(동네명으로 덮이지 않음)", () => {
    const json = JSON.parse(eventJsonLd(BASE, "op-1"));
    expect(json.name).toBe("망원동 동네 전시");
    expect(json.geo).toMatchObject({ latitude: 37.55, longitude: 126.9 });
  });

  /**
   * 제목에 `</script>`가 들어오면 스크립트 블록이 거기서 끝나 XSS가 된다.
   * 데이터는 공공 API에서 오므로 우리가 통제하지 못한다.
   */
  it("`<`를 이스케이프해 스크립트를 탈출시키지 않는다", () => {
    const raw = eventJsonLd({ ...BASE, title: "</script><img src=x onerror=alert(1)>" }, "op-1");
    expect(raw).not.toContain("</script>");
    expect(raw).toContain("\\u003c");
    // 이스케이프해도 JSON으로는 여전히 유효해야 한다.
    expect(JSON.parse(raw).name).toContain("</script>");
  });
});

/**
 * SITE_URL 회귀 방지.
 *
 * 2026-09-03 실측: 프로덕션이 fallback `https://motungi.app`을 그대로 내보내고 있었는데
 * 그 도메인은 DNS가 없다(curl exit 6). 그래서 sitemap의 모든 `<loc>`·canonical·og:image·
 * JSON-LD url이 존재하지 않는 호스트를 가리켰다 — 색인은 물론 카카오·슬랙 공유 미리보기까지
 * 깨졌는데, **코드만 봐선 멀쩡해 보여** 리뷰로 못 잡았다. 그래서 테스트로 고정한다.
 *
 * 여기서 도메인 문자열을 하드코딩해 단언하지 않는 이유: 실제 도메인을 붙이면 값이 바뀌는데
 * 그때 이 테스트가 "틀린 이유로" 깨지면 안 된다. 대신 **어떤 값이 와도 지켜야 할 성질**만 본다.
 */
describe("SITE_URL", () => {
  it("절대 URL이고 https다 — canonical·og:image는 상대경로일 수 없다", () => {
    expect(() => new URL(SITE_URL)).not.toThrow();
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });

  it("끝에 슬래시가 없다 — 붙으면 `${SITE_URL}/path`가 //path가 된다", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("DNS 없는 옛 fallback 도메인으로 되돌아가지 않는다", () => {
    // motungi.app을 실제로 확보해 연결했다면 이 단언을 지우고 값을 바꿔라.
    expect(new URL(SITE_URL).hostname).not.toBe("motungi.app");
  });
});

/**
 * faqJsonLd (M-095).
 *
 * 빈 목록에서 `null`을 주는 게 이 함수의 핵심 판단이다 — 항목 0개짜리 FAQPage는
 * 구조화 데이터 오류인데, 문자열을 반환하면 호출부가 그걸 그대로 `<script>`에 박는다.
 */
describe("faqJsonLd", () => {
  it("빈 목록이면 null — 항목 없는 FAQPage를 내보내지 않는다", () => {
    expect(faqJsonLd([])).toBeNull();
  });

  it("FAQPage 형태로 질문·답변을 싣는다", () => {
    const json = JSON.parse(faqJsonLd([{ q: "무료인가요?", a: "네, 무료입니다." }])!);

    expect(json["@type"]).toBe("FAQPage");
    expect(json.mainEntity).toHaveLength(1);
    expect(json.mainEntity[0].name).toBe("무료인가요?");
    expect(json.mainEntity[0].acceptedAnswer.text).toBe("네, 무료입니다.");
  });

  it("`</script>`가 섞여도 스크립트 블록을 조기 종료시키지 않는다", () => {
    // eventJsonLd와 같은 방어. 활동 제목은 외부 공공데이터라 무엇이든 들어올 수 있다.
    const out = faqJsonLd([{ q: "q", a: "</script><img src=x onerror=alert(1)>" }])!;

    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
    // 이스케이프해도 JSON 의미는 보존된다 — 파싱하면 원문이 그대로 나와야 한다.
    expect(JSON.parse(out).mainEntity[0].acceptedAnswer.text).toContain("</script>");
  });

  it("특수문자·따옴표가 답변에 있어도 유효한 JSON이다", () => {
    const a = '따옴표 "안녕" · 역슬래시 \\ · 줄바꿈\n포함';
    expect(JSON.parse(faqJsonLd([{ q: "q", a }])!).mainEntity[0].acceptedAnswer.text).toBe(a);
  });
});
