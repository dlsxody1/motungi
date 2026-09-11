/**
 * A1 · 데스크탑 랜딩 — 물감(gouache) 리디자인.
 *
 * 문제였던 것: 흰 카드 + 큰 숫자 + 문단이 반복되는 구조. 벤토 보조 2칸과 3스텝 카드 3개가
 *   특히 "AI가 짠 랜딩" 신호였다(동일 크기 상자 반복 · 01/02/03 번호 라벨 · 흰 배경 위 흰 카드).
 *
 * 방향: 랜딩 전체를 하나의 물감 언어로 다시 짠다. 부분만 칠하면 덜 만든 페이지가 되므로
 *   5개 섹션 전부가 같은 프리미티브를 공유한다:
 *     - paint-paper  : 종이 결(전역 배경)
 *     - paint-wash   : 붓으로 칠한 색면(카드 대신)
 *     - PaintEdge    : 섹션 사이 붓자국 경계(직선 경계 제거)
 *     - paint-blob-a/b + paint-drift : 물감 얼룩(CSS만. 3D는 히어로 하나로 충분하다)
 *   프리미티브는 globals.css와 paint-*.tsx에 한 번만 정의된다.
 *
 * redesign-preserve: 트와일라잇 로즈 토큰·브랜드·copy voice·IA·링크 구조 전부 유지.
 *   히어로 3D 포스터링(검증된 컴포넌트)도 그대로 둔다 — 물량감은 이미 그게 맡고 있다.
 * 모바일에서는 렌더되지 않는다(md: 이상). 모션은 CSS scroll-driven only(JS 스크롤 리스너 없음).
 */
import Link from "next/link";
import type { MockOpportunity } from "@/data/opportunities";
import type { FaqItem } from "@/lib/seo";
import { FaqSection } from "./faq-section";
import { HeroPosterStage } from "./hero-poster-stage";
import { ArrowMiniIcon, CheckMiniIcon } from "./landing-icons";
import { LandingLocationLink } from "./landing-location-link";
import { LandingPhoto } from "./landing-photo";
import { PaintEdge } from "./paint-edge";
import { LandingClosing } from "./landing-closing";
import { LandingWhy } from "./landing-why";
import { ScrollRowNav } from "./scroll-row-nav";
import { PreviewDiagnosis, PreviewLocation, PreviewReport } from "./step-previews";
import { WebContainer } from "./web-shell";

/**
 * 3스텝 — 번호 라벨(01/02/03)을 뺐다. 순서는 경로와 위치가 이미 말하고,
 * 번호 자체는 정보를 더하지 않는다(스킬 금지 항목: generic step labels).
 * 대신 각 걸음이 물감 경로 위의 지점으로 놓인다.
 */
const STEPS = [
  { verb: "내 동네 설정", desc: "집·회사만 정하면 준비 끝. 걸어서 닿는 반경을 기준 삼아요." },
  { verb: "60초 진단", desc: "관심사·시간대·에너지 3문항. 오늘 컨디션에 맞춰 골라요." },
  { verb: "동네 리포트", desc: "오늘의 원픽과 활동 목록. 고민 없이 바로 나가면 돼요." },
];

/**
 * 갈래 — 실제로 opportunities에 적재된 것만. 없는 콘텐츠를 광고하면 첫 검색에서 바로 들통난다.
 * 갈래를 늘리려면 먼저 적재부터 하고 여기에 추가한다.
 *
 * label은 사람이 읽는 말, q는 실제로 목록을 좁히는 검색어다(둘이 다른 이유:
 * "공연·연주"는 라벨이지만 summary에 실제로 박히는 문자열은 "연주회"·"콘서트" 쪽이다).
 * 각 항목은 /explore?q=로 들어가는 링크 — 죽은 라벨 6개가 아니라 실제 진입점이 된다.
 */
/**
 * 제품 FAQ — 화면과 FAQPage JSON-LD가 이 배열 하나를 공유한다 (M-095).
 *
 * **여기 쓰는 모든 문장은 제품이 실제로 하는 일이어야 한다.** FAQ는 답변 엔진이 특히 잘
 * 집어가는 자리이고, 그래서 틀린 문장 하나가 그대로 인용된다. 기능을 바꾸면 이 배열도
 * 같이 고쳐라 — 위 STEPS·CATEGORIES와 달리 이건 화면 밖(검색 결과)까지 나간다.
 *
 * 답변은 "~요"체가 아니라 평서형이다. 랜딩 카피와 톤이 다른데, 인용될 때 우리 UI 문구가
 * 아니라 **사실 서술**로 읽혀야 하기 때문이다(구 페이지 summarySentence와 같은 규율).
 */
const LANDING_FAQS: FaqItem[] = [
  {
    q: "모퉁이는 어떤 서비스인가요?",
    a: "서울·수도권에서 퇴근 후나 주말에 할 만한 동네 문화·여가 활동을 골라주는 서비스다. 3문항 진단으로 관심사·시간대·에너지를 받아 오늘 갈 만한 활동 1~3개로 좁혀준다. 목록을 다 보여주고 고르게 하는 대신 하나를 정해주는 쪽을 택했다.",
  },
  {
    q: "회원가입을 해야 쓸 수 있나요?",
    a: "아니다. 동네를 정하고 진단을 받아 추천까지 보는 데는 로그인이 필요 없다. 마음에 든 활동을 보관함에 저장할 때만 가입하면 된다.",
  },
  {
    q: "어떤 활동이 올라오나요?",
    a: "전시·미술, 연극·뮤지컬, 콘서트, 클래식·국악, 교육·체험, 산책·걷기길이 들어온다. 서울시 문화행사, 공연예술통합전산망(KOPIS), 한눈에보는문화정보, 공공체육시설, 두루누비 걷기길 같은 공공 데이터에서 모은다.",
  },
  {
    q: "'동네'는 어떻게 정해지나요?",
    a: "집과 회사 두 곳을 좌표로 잡고, 활동까지의 거리를 둘 중 가까운 쪽으로 계산한다. 행정구역으로 걸러내는 필터가 아니라 거리 점수라서, 구 경계 바로 건너편에 있는 활동도 가깝다면 추천에 들어온다.",
  },
  {
    q: "추천 기준은 무엇인가요?",
    a: "관심사 적합도·거리·시간대·난이도·비용 다섯 축에 가중치를 둔 규칙 기반 점수다. 각 활동마다 왜 골랐는지 근거를 함께 보여준다.",
  },
  {
    q: "정보는 얼마나 자주 갱신되나요?",
    a: "하루 한 번 공공 데이터를 새로 받아 마감이 지난 활동을 걸러낸다. 무료 여부와 참가비는 원본 데이터를 그대로 쓰고, 확인되지 않은 값은 표시하지 않는다.",
  },
];

export function WebLanding({
  heroPicks = [],
  guNames = [],
}: {
  heroPicks?: MockOpportunity[];
  /**
   * 실제로 `/explore/[gu]` 페이지가 존재하는 구 이름 목록(M-096).
   * 활동 많은 순으로 정렬되어 있다고 가정한다(`summarizeGu`가 이미 그렇게 반환 — page.tsx 참조).
   * 하드코딩 배열이 아니라 항상 호출부가 실측해서 넘긴다 — "24개 구" 같은 수치를
   * 여기서 지어내지 않는다(docs/AEO.md, M-095 선례).
   */
  guNames?: string[];
}) {
  // 벤토 주인공 셀에 세울 실제 원픽. 없으면(로컬/빈 DB) 톤 그라데이션 폴백으로 내려간다.
  const featured = heroPicks.find((o) => o.imageUrl);
  // 가로 스크롤 열에 세울 실제 활동들. 히어로 링과 겹쳐도 무방 —
  // 링은 장식(aria-hidden)이고 여기가 실제로 클릭 가능한 목록이다.
  const realPicks = heroPicks.filter((o) => o.imageUrl);
  return (
    /* 랜딩만 색약 대응 이전의 밝은 로즈를 쓴다(globals.css의 --color-primary-landing 주석 참조).
       여기서 --color-primary를 지역 override하면 하위의 bg-primary·text-primary·
       히어로 그라데이션까지 전부 자동으로 따라오므로 아래 섹션들은 한 줄도 고치지 않는다.
       display:contents라 래퍼가 레이아웃에 관여하지 않는다 — 물감 섹션들의 경계·스크롤
       구동 모션이 그대로 유지된다. */
    <div
      style={
        {
          display: "contents",
          "--color-primary": "var(--color-primary-landing)",
          "--color-primary-deep": "var(--color-primary-deep-landing)",
        } as React.CSSProperties
      }
    >
      {/* ══ 1. 히어로 ══
          물감 언어를 여기서 연다: 그라데이션 위에 안료가 번진 얼룩을 얹는다.
          3D 포스터링은 검증된 자산이라 유지 — 새로 만들지 않는다. */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(150deg, var(--color-sun) 0%, var(--color-primary) 50%, var(--color-purple) 116%)",
        }}
      >
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 88% 8%, rgba(255,255,255,0.16), transparent 46%), radial-gradient(90% 80% at 6% 100%, rgba(46,26,16,0.14), transparent 52%)",
          }}
        />
        {/* 안료 얼룩 — 히어로가 "CSS 그라데이션"이 아니라 "칠한 면"으로 읽히게 한다.
            이 한 겹이 있고 없고가 바이브코딩 티의 절반이다. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.28] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='h'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.009 0.016' numOctaves='5' seed='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23h)'/%3E%3C/svg%3E\")",
            backgroundSize: "460px 460px",
          }}
        />

        {/* 히어로는 첫 화면 안에 들어와야 한다 — CTA가 스크롤 없이 보이도록 상하 여백을 줄였다. */}
        <WebContainer className="relative flex items-center justify-between gap-16 py-14">
          {/* 좌측 카피 */}
          <div className="max-w-[620px] flex-1">
            <h1 className="text-[58px] font-extrabold leading-[1.12] tracking-[-0.035em] text-white text-balance">
              퇴근하고
              <br />
              뭐하지?
            </h1>
            <p className="mt-5 max-w-[30rem] text-[19px] leading-[1.6] font-medium text-white/95">
              수백 개 대신 딱 1~3개. 퇴근 후·주말 내 동네에서 즐길 문화·여가·활동을 60초 만에 골라드려요.
            </p>

            {/* 위치 검색 인풋 — 클릭하면 동네 검색으로. placeholder-as-label 아님(값 표시 + 라벨 위) */}
            <div className="mt-9 max-w-[500px]">
              <label htmlFor="loc-search" className="mb-1.5 block text-[13px] font-semibold text-white/85">
                어느 동네에서 찾을까요?
              </label>
              <LandingLocationLink />

              {/* 두 번째 길. 같은 무게의 버튼 2개는 선택 마비를 부르므로 위계를 준다 —
                  추천이 기본(위 필드), 탐색은 이미 정한 사람을 위한 출구(밑줄 링크).
                  동등하다는 건 둘 다 정당하다는 뜻이지 시각적으로 같아야 한다는 뜻이 아니다. */}
              <p className="mt-3.5 text-[15px] text-white/85">
                뭘 할지 이미 정했다면{" "}
                <Link
                  href="/explore"
                  className="font-semibold text-white underline decoration-white/45 underline-offset-4 transition-colors hover:decoration-white"
                >
                  동네 활동 둘러보기
                </Link>
              </p>
            </div>
          </div>

          {/* 우측 — 실 활동 포스터가 도는 3D 링(WebGL). 포스터 부족·WebGL 실패 시
              내부에서 기존 캐러셀로 자동 폴백한다. 스크롤하면 뒤로 물러난다(hero-recede). */}
          <div className="hero-recede relative hidden w-[460px] shrink-0 lg:block">
            <HeroPosterStage items={heroPicks} />
          </div>
        </WebContainer>

        {/* 아래 섹션(surface)이 히어로를 위로 침범한다 — 직선 경계 제거 */}
        <PaintEdge color="var(--color-surface)" direction="up" grain className="absolute inset-x-0 bottom-0" />
      </section>

      <LandingWhy featured={featured} />

      {/* ══ 3. 이렇게 찾아드려요 — 세 화면의 미니어처 ══
          이전 1차: 카드 3개 + 01/02/03. 이전 2차: 손그림 경로(형태가 내용을 이김).
          지금: 각 걸음의 실제 화면 실루엣을 축소해 얹는다. 세 실루엣이 서로 달라서,
          "세 걸음이 각각 다른 일"이 카피를 읽기 전에 형태로 먼저 전달된다.
          면은 회색 유지 — 위 섹션(2)이 흰 면이라 여기까지 희게 하면 둘이 한 덩어리로 붙는다.
          (2026-08-06 베이지 폐기: bg-bg가 흰색이 되면서 이 교차가 사라졌다. 밴드 구분은
          제품 UI와 달리 랜딩의 시각 언어라 gray-50으로 남긴다 — 흰 위 1.07:1의 아주 옅은
          면이지만 PaintEdge 물결이 이 경계를 그리므로 이 정도로 충분하다.)
          "가독성이 떨어진다"의 실제 원인은 대비가 아니라(ink 17.4:1, label 9.5:1 — AA 통과)
          면 위에 아무것도 없어서 납작하게 읽힌 것. 흰 미니어처가 그 면을 깨뜨린다. */}
      <section className="paint-paper relative bg-surface-alt pt-[68px] pb-[84px]">
        <PaintEdge color="var(--color-surface)" direction="down" grain className="absolute inset-x-0 top-0" />
        <WebContainer className="relative">
          <div className="reveal max-w-[46ch]">
            <h2 className="break-keep text-[27px] font-bold leading-tight tracking-[-0.02em] text-ink">
              집만 정하면, 나머진 모퉁이가.
            </h2>
            <p className="mt-2 text-[16px] text-label">세 걸음이면 오늘 저녁이 정해져요.</p>
          </div>

          {/* ol — 순서가 의미를 갖는 목록. group/호버로 미니어처가 조립된다.
              items-stretch + flex-col: 미니어처 높이가 서로 달라도(내용 길이가 다르니 당연하다)
              액자가 행 높이까지 늘어나서 아래 01/02/03·제목이 같은 선에 놓인다. */}
          <ol className="mt-12 grid grid-cols-1 items-stretch gap-10 md:grid-cols-3 md:gap-7">
            {STEPS.map((s, i) => {
              return (
                <li key={s.verb} className="reveal group flex flex-col">
                  {/* 리포트 미니어처만 실데이터를 받는다 — 지어낸 활동명 금지(step-previews.tsx 참조). */}
                  {i === 0 ? (
                    <PreviewLocation />
                  ) : i === 1 ? (
                    <PreviewDiagnosis />
                  ) : (
                    <PreviewReport picks={heroPicks} />
                  )}
                  <div className="mt-4 border-t border-line pt-3.5">
                    <span className="text-[13px] font-semibold tabular-nums text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 text-[18px] font-bold text-ink">{s.verb}</h3>
                    <p className="mt-1.5 max-w-[26ch] text-[14px] leading-[1.6] text-label">{s.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </WebContainer>
      </section>

      {/* ══ 4. 지금 열리는 실제 활동 — 주장이 아니라 증거 ══
          레이아웃 계열이 앞 섹션들과 겹치지 않는 가로 스크롤 열.
          다크 면이라 물감 얼룩은 밝은 쪽으로 얹는다(어두운 면 위 어두운 얼룩은 안 보임). */}
      {realPicks.length >= 4 && (
        /* pb에 파도 높이(clamp 40~72px)를 더해 아래 물결이 콘텐츠를 덮지 않게 한다. */
        <section className="relative overflow-hidden bg-ink-dark pt-[80px] pb-[calc(80px+clamp(40px,5vw,72px))]">
          {/* 위 물결은 **앞 섹션(3)의 면색**이어야 이음매가 없다 — 3이 surface-alt이므로 여기도 같은 값.
              (베이지 시절엔 3도 bg여서 var(--color-bg) 하나로 위아래가 맞았다.) */}
          <PaintEdge color="var(--color-surface-alt)" direction="down" grain className="absolute inset-x-0 top-0 z-10" />
          {/* 아래 물결을 이 섹션이 직접 그린다 — 다음 섹션의 면색(bg)으로 위를 덮는 방식.
              why: 이전엔 다음 섹션이 flat var(--color-ink-dark)로 물결을 칠했다. 그런데 이 다크
              면은 flat이 아니라 노이즈가 mix-blend-screen으로 밝혀진 면이라, 물결만 순수
              #2e2a24로 남아 경계에 선이 그어지고 그라데이션도 거기서 끊겼다.
              지금은 물결이 곧 다음 섹션의 색(bg)이라 이어지는 쪽에 색 차이가 없다.
              z-10으로 노이즈 위에 둔다 — 노이즈가 이 베이지까지 밝히면 다음 섹션과 또 어긋난다. */}
          <PaintEdge
            color="var(--color-bg)"
            direction="up"
            grain
            className="absolute inset-x-0 bottom-0 z-10"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.011 0.018' numOctaves='4' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23d)'/%3E%3C/svg%3E\")",
              backgroundSize: "480px 480px",
            }}
          />
          <WebContainer className="relative">
            <div className="reveal flex flex-wrap items-end justify-between gap-4">
              <h2 className="max-w-[34rem] break-keep text-[27px] font-bold leading-tight tracking-[-0.02em] text-white text-balance">
                지금 이 순간에도, 동네에서 열리고 있어요.
              </h2>
              <Link
                href="/explore"
                className="flex items-center gap-1.5 rounded-pill border border-white/25 px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-white/10"
              >
                전체 보기
                <ArrowMiniIcon size={16} />
              </Link>
            </div>
          </WebContainer>

          {/* 컨테이너 밖으로 흘러나가는 가로 스크롤 — 목록이 끝나지 않는다는 느낌을 준다.
              네이티브 overflow 스크롤이라 스크롤 하이재킹 없음(키보드·터치 그대로).
              ScrollRowNav가 좌우 버튼만 얹는다 — 휠 마우스만 쓰면 넘길 방법이 없었다. */}
          <ScrollRowNav
            label="지금 동네에서 열리는 활동"
            className="scroll-row reveal-slide relative mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1.5rem,calc((100vw-1280px)/2))] pb-2"
          >
            {realPicks.map((o) => (
              <li key={o.id} className="w-[210px] shrink-0 snap-start">
                <Link href={`/opportunity/${o.id}`} className="group block">
                  {/* 포스터는 잘리면 안 되는 '작품'이다 — object-contain으로 전체를 보여주고,
                      남는 여백은 뒤에 깔린 어두운 톤이 받아준다(비율이 제각각이라 크롭하면 제목이 잘림). */}
                  <LandingPhoto
                    src={o.imageUrl}
                    alt={o.title}
                    tone="dusk"
                    sizes="210px"
                    fit="contain"
                    className="aspect-[3/4] rounded-[18px] bg-black/25 ring-1 ring-white/12 transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5"
                  />
                  <p className="mt-3 line-clamp-2 break-keep text-[14px] font-bold leading-[1.4] text-white">
                    {o.title}
                  </p>
                  <p className="mt-1 text-[13px] text-white/65">{o.location?.dongName ?? "서울"}</p>
                </Link>
              </li>
            ))}
          </ScrollRowNav>
        </section>
      )}

      <LandingClosing />

      {/*
        ══ 6. FAQ — 답변 엔진이 인용할 자리 (M-095) ══
        마지막 CTA **뒤**에 둔다. 전환을 막지 않으면서, 크롤러에는 제품을 설명하는
        구조화된 텍스트를 남긴다. FaqSection이 화면과 FAQPage JSON-LD를 함께 낸다 —
        구글 정책상 둘이 일치해야 하므로 배열 하나를 공유하는 구조로 강제했다.
        물감 프리미티브를 쓰지 않는 이유: 여기는 읽는 자리다. 색면을 더 얹으면 위 CTA와
        시선이 경쟁한다.
      */}
      <section className="border-t border-line bg-surface py-[72px]">
        <WebContainer>
          <FaqSection heading="자주 묻는 것" items={LANDING_FAQS} className="max-w-[720px]" />
        </WebContainer>
      </section>

      {/*
        ══ 7. 랜딩 답변 블록 + 구 페이지 링크 (M-096) ══
        docs/AEO.md 3단계. FAQ 뒤에 두는 이유: FAQ가 개별 질문에 답한다면 여기는
        "모퉁이가 무엇이고 어디서 쓰이는가"를 하나로 이어 붙인 산문이라, 질문형이 아닌
        검색("퇴근하고 뭐하지")에도 통째로 인용될 여지를 만든다. 문장은 평서형이다
        (위 LANDING_FAQS 주석과 같은 규율 — 인용될 때 UI 카피가 아니라 사실 서술로 읽혀야 한다).
        새 사실을 지어내지 않는다 — 전부 LANDING_FAQS·STEPS·CATEGORIES에 이미 있는 내용이다.

        아래 링크 목록이 구 페이지들의 발견 경로다(사이트맵만으론 약하다 — `/explore` 자체가
        클라이언트 렌더라 크롤러가 카드 링크를 못 긁는다). guNames가 비어 있으면
        (로컬/빈 DB) 섹션째로 렌더하지 않는다 — 근거 없는 "N개 지역" 문장을 내보내느니
        아예 없는 편이 낫다(FaqSection·faqJsonLd와 같은 "빈 구조를 내보내지 않는다" 규율).
      */}
      {guNames.length > 0 && (
        <section className="border-t border-line bg-bg py-[72px]">
          <WebContainer>
            <div className="max-w-[720px]">
              <h2 className="text-[22px] font-bold leading-[30px] tracking-[-0.015em] text-ink">
                퇴근하고 뭐하지? — 모퉁이의 답
              </h2>
              <div className="mt-5 max-w-[65ch] space-y-4 text-[15px] leading-[24px] text-pretty text-label">
                <p>
                  모퉁이는 서울·수도권 직장인이 퇴근 후나 주말에 갈 만한 동네 문화·여가 활동을
                  찾도록 돕는 서비스다. 관심사·시간대·에너지 3문항 진단을 거쳐 오늘 갈 만한 활동
                  1~3개로 좁혀준다. 목록을 늘어놓고 고르게 하는 대신 하나를 정해주는 쪽을 택했다.
                </p>
                <p>
                  여기서 말하는 &ldquo;동네&rdquo;는 행정구역으로 활동을 걸러내는 필터가 아니다. 집과 회사 두
                  좌표를 기준으로 거리를 계산하는 점수다. 그래서 구 경계 바로 건너편에 있는
                  활동도 걸어서 닿을 만큼 가까우면 추천에 들어온다.
                </p>
                <p>
                  다루는 갈래는 전시·미술, 연극·뮤지컬, 콘서트, 클래식·국악, 교육·체험,
                  산책·걷기길이다. 서울시 문화행사, 공연예술통합전산망(KOPIS), 한눈에보는문화정보,
                  공공체육시설, 두루누비 걷기길 같은 공공 데이터에서 하루 한 번 새로 받아 마감이
                  지난 활동은 걸러낸다.
                </p>
                <p>
                  아래는 활동이 충분히 쌓여 실제 페이지가 열린 지역 {guNames.length}곳이다. 각
                  페이지엔 그 동네에 지금 올라와 있는 활동과 그 구에 특화된 질문·답변이 함께 있다.
                </p>
              </div>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 md:grid-cols-4">
              {guNames.map((gu) => (
                <li key={gu}>
                  <Link
                    href={`/explore/${encodeURIComponent(gu)}`}
                    className="text-[14px] font-medium text-label underline decoration-line-alt underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                  >
                    {gu}
                  </Link>
                </li>
              ))}
            </ul>
          </WebContainer>
        </section>
      )}
    </div>
  );
}
