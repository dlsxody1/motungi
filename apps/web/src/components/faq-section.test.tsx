/**
 * FaqSection 렌더 테스트 (M-095).
 *
 * 여기서 고정하는 계약은 하나다: **화면 텍스트와 JSON-LD가 일치한다.**
 * 구글 구조화 데이터 정책은 FAQPage 답변이 사용자에게 실제로 보여야 한다고 요구하고,
 * 위반하면 리치 결과가 통째로 빠진다. 조용히 어긋나도 화면상으론 멀쩡해 보이는 종류의
 * 버그라 사람 눈으로는 못 잡는다 — 그래서 테스트로 묶는다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FaqSection } from "./faq-section";

const ITEMS = [
  { q: "회원가입이 필요한가요?", a: "아니다. 저장할 때만 가입하면 된다." },
  { q: "얼마나 자주 갱신되나요?", a: "하루 한 번 공공 데이터를 새로 받는다." },
];

/** 렌더된 트리에서 JSON-LD 스크립트를 파싱한다. */
function parseJsonLd(container: HTMLElement): {
  mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  "@type": string;
} {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script!.innerHTML);
}

afterEach(cleanup);

describe("FaqSection", () => {
  it("질문과 답변이 화면에 실제로 렌더된다", () => {
    render(<FaqSection heading="자주 묻는 것" items={ITEMS} />);

    for (const { q, a } of ITEMS) {
      expect(screen.getByText(q)).toBeInTheDocument();
      expect(screen.getByText(a)).toBeInTheDocument();
    }
  });

  it("JSON-LD의 모든 답변이 화면에도 있다 — 정책 위반(숨김 요소 전용) 방지", () => {
    const { container } = render(<FaqSection heading="자주 묻는 것" items={ITEMS} />);
    const json = parseJsonLd(container);

    expect(json["@type"]).toBe("FAQPage");
    for (const entry of json.mainEntity) {
      expect(screen.getByText(entry.name)).toBeInTheDocument();
      expect(screen.getByText(entry.acceptedAnswer.text)).toBeInTheDocument();
    }
  });

  it("닫혀 있어도 답변 텍스트가 DOM에 있다 — 크롤러가 읽어야 한다", () => {
    const { container } = render(<FaqSection heading="자주 묻는 것" items={ITEMS} />);

    // details가 기본 닫힘인데도 본문이 마크업에 남는 것이 <details>를 고른 이유다.
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(false);
    expect(container.textContent).toContain(ITEMS[0]!.a);
  });

  it("항목이 없으면 아무것도 렌더하지 않는다 — 빈 FAQPage는 구조화 데이터 오류다", () => {
    const { container } = render(<FaqSection heading="자주 묻는 것" items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("제목이 섹션의 접근 가능한 이름이 된다", () => {
    render(<FaqSection heading="종로구 활동, 자주 묻는 것" items={ITEMS} />);

    expect(screen.getByRole("region", { name: "종로구 활동, 자주 묻는 것" })).toBeInTheDocument();
  });

  it("한 페이지에 둘을 놓아도 heading id가 겹치지 않는다", () => {
    const { container } = render(
      <>
        <FaqSection heading="첫째" items={ITEMS} />
        <FaqSection heading="둘째" items={ITEMS} headingId="faq-two" />
      </>,
    );

    const ids = [...container.querySelectorAll("h2")].map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
