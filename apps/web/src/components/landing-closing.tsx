import Link from "next/link";
import { ArrowMiniIcon, CheckMiniIcon } from "@/components/landing-icons";
import { WebContainer } from "@/components/web-shell";

/**
 * 갈래 목록. 죽은 라벨 6개가 아니라 `/explore?q=`로 들어가는 **실제 진입점**이다.
 * 검색어는 DB 실측으로 골랐다: 교육/체험 131 · 전시 105 · 연극 65 · 콘서트 53 ·
 * 클래식 42 · 코스 30. "걷기길"은 0건이라 "코스"로 바꿨다 — 죽은 링크 방지.
 */
const CATEGORIES: { label: string; q: string }[] = [
  { label: "교육·체험", q: "교육/체험" },
  { label: "전시·미술", q: "전시" },
  { label: "연극·뮤지컬", q: "연극" },
  { label: "콘서트", q: "콘서트" },
  { label: "클래식·국악", q: "클래식" },
  { label: "산책·걷기길", q: "코스" },
];

/**
 * 랜딩 마무리 — 밝게 내려놓는 클로징.
 *
 * 앞 섹션이 다크라 여기까지 어두우면 어두운 블록이 두 번 연달아 오고, 히어로 그라데이션을
 * 그대로 되받으면 페이지가 "닫히는" 게 아니라 "되풀이"된다. 그래서 웜 아이보리로
 * 내려놓아 해소한다 — 톤을 낮추는 게 마무리다. 물감 워시를 CTA 쪽에만 옅게 깔아
 * 마지막 시선을 고정한다.
 *
 * 위 다크 섹션과의 경계는 그 섹션이 직접 그린다(노이즈가 물결까지 덮어야 이음매가 없다).
 * 여기서 다시 칠하면 flat 색이 겹쳐 선이 생긴다 — 그래서 PaintEdge 없음.
 */
export function LandingClosing() {
  return (
    <section className="paint-paper relative bg-bg pt-[74px] pb-[96px]">
      <WebContainer className="relative grid grid-cols-1 items-start gap-14 lg:grid-cols-[1fr_0.85fr] lg:gap-24">
        {/* 좌 — 결론과 행동 */}
        <div className="reveal relative">
          {/* 물감 자국이 헤드라인 뒤에 깔린다 — 마지막 CTA로 시선을 모으는 색면. */}
          <span
            aria-hidden
            className="paint-blob-b paint-drift pointer-events-none absolute -top-12 -left-14 -z-10 h-[220px] w-[260px] opacity-[0.5]"
            style={{
              background: "radial-gradient(circle at 40% 36%, var(--color-tint), transparent 68%)",
            }}
          />
          {/* break-keep 필수 — 한국어는 어절 안에 공백이 없어서 없으면
              "뭐 할 / 지"처럼 낱말 가운데가 잘린다(실제로 밟았다). */}
          <h2 className="max-w-[18ch] break-keep text-[34px] font-extrabold leading-[1.18] tracking-[-0.025em] text-ink text-balance">
            오늘 저녁, 뭐 할지 아직 안 정했다면.
          </h2>
          <p className="mt-4 max-w-[32rem] break-keep text-[16px] leading-[1.65] text-label">
            동네만 정해주면 오늘 갈 만한 곳으로 좁혀드려요.
          </p>
          <Link
            href="/location"
            className="mt-8 inline-flex h-[54px] items-center gap-2 rounded-pill bg-primary px-8 text-[16px] font-bold whitespace-nowrap text-white transition-[background-color,transform] hover:bg-primary-deep active:scale-[0.98]"
          >
            내 동네에서 찾기
            <ArrowMiniIcon size={18} />
          </Link>
          <p className="mt-4 flex items-center gap-1.5 text-[14px] text-muted">
            <CheckMiniIcon size={16} className="text-mint" />
            로그인 없이 바로 시작 · 저장할 때만 가입
          </p>
        </div>

        {/* 우 — 갈래. 각 줄이 실제 링크라 hover에서 화살표가 나오고 라벨이 브랜드색으로 간다.
            카드 6칸(= 같은 크기 상자 반복)은 피한다 — hairline 목록이 더 조용하고 스캔이 빠르다. */}
        <div className="reveal">
          <p className="text-[13px] font-semibold text-muted">이런 것들이 들어와요</p>
          <ul className="mt-3 border-t border-line-alt">
            {CATEGORIES.map(({ label, q }) => (
              <li key={label}>
                <Link
                  href={`/explore?q=${encodeURIComponent(q)}`}
                  className="group flex items-center justify-between gap-3 border-b border-line-alt py-3.5 text-[15px] font-semibold text-ink transition-colors hover:text-primary"
                >
                  {label}
                  <ArrowMiniIcon
                    size={16}
                    className="shrink-0 text-faint transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </WebContainer>
    </section>
  );
}
