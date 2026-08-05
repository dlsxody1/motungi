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
 *     - PaintPath    : 3스텝을 잇는 손그림 경로(카드 3개를 대체)
 *   프리미티브는 globals.css와 paint-*.tsx에 한 번만 정의된다.
 *
 * redesign-preserve: 트와일라잇 로즈 토큰·브랜드·copy voice·IA·링크 구조 전부 유지.
 *   히어로 3D 포스터링(검증된 컴포넌트)도 그대로 둔다 — 물량감은 이미 그게 맡고 있다.
 * 모바일에서는 렌더되지 않는다(md: 이상). 모션은 CSS scroll-driven only(JS 스크롤 리스너 없음).
 */
import Link from "next/link";
import type { MockOpportunity } from "@/data/opportunities";
import { HeroPosterStage } from "./hero-poster-stage";
import { ArrowMiniIcon, CheckMiniIcon } from "./landing-icons";
import { LandingLocationLink } from "./landing-location-link";
import { LandingPhoto } from "./landing-photo";
import { PaintEdge } from "./paint-edge";
import { PaintPath } from "./paint-path";
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
const CATEGORIES: { label: string; q: string }[] = [
  { label: "교육·체험", q: "교육/체험" },
  { label: "전시·미술", q: "전시" },
  { label: "연극·뮤지컬", q: "연극" },
  { label: "콘서트", q: "콘서트" },
  { label: "클래식·국악", q: "클래식" },
  { label: "산책·걷기길", q: "코스" },
];

export function WebLanding({ heroPicks = [] }: { heroPicks?: MockOpportunity[] }) {
  // 벤토 주인공 셀에 세울 실제 원픽. 없으면(로컬/빈 DB) 톤 그라데이션 폴백으로 내려간다.
  const featured = heroPicks.find((o) => o.imageUrl);
  // 가로 스크롤 열에 세울 실제 활동들. 히어로 링과 겹쳐도 무방 —
  // 링은 장식(aria-hidden)이고 여기가 실제로 클릭 가능한 목록이다.
  const realPicks = heroPicks.filter((o) => o.imageUrl);
  return (
    <>
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
        <PaintEdge color="var(--color-surface)" direction="up" className="absolute inset-x-0 bottom-0" />
      </section>

      {/* ══ 2. 왜 모퉁이 — 물감 벤토 ══
          이전: 큰 사진 1 + 흰 카드 2(큰 숫자 + 문단). 흰 배경 위 흰 카드라 죽어 있었다.
          지금: 각 칸이 서로 다른 물감 면을 갖는다(사진 / 3D 덩어리 / 로즈 워시).
          칸 수 = 콘텐츠 수 = 3. 빈 칸 없음. */}
      <section className="paint-paper bg-surface pt-[52px] pb-[76px]">
        <WebContainer>
          <div className="reveal max-w-[640px]">
            <h2 className="break-keep text-[30px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink text-balance">
              찾아보지 않아도 되고,{" "}
              <span className="paint-underline">찾고 싶으면</span> 찾을 수 있어요.
            </h2>
            <p className="mt-3 text-[16px] leading-[1.65] text-label">
              흩어진 동네 정보를 모아 하나로 좁혀드려요. 오늘은 정해주는 대로, 다음엔 직접 골라도 되게.
            </p>
          </div>

          <div className="reveal-depth mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
            {/* 주인공 — 실제 활동 포스터. 물감 카드 형태로 잘라 다른 칸과 형태를 맞춘다.
                featured가 있으면 진짜 데이터, 없으면 톤 그라데이션 폴백. */}
            <LandingPhoto
              src={featured?.imageUrl}
              alt={featured ? `오늘의 원픽 — ${featured.title}` : "오늘의 원픽 활동"}
              tone="dusk"
              sizes="(min-width: 1024px) 56vw, 100vw"
              // 이 셀이 LCP 후보다(첫 화면 바로 아래 큰 이미지) → priority로 미리 받는다.
              priority
              // 포스터 위에 카피를 얹으므로 살짝만 눌러 대비를 확보한다. 블러는 걸지 않는다 —
              // 포스터는 작품이라 흐리면 고장난 것처럼 보인다(가독성은 scrim이 담당).
              imgClassName="opacity-80"
              className="paint-card wcard-hover flex min-h-[430px] flex-col justify-end p-9 lg:row-span-2"
              scrim
            >
              <div className="relative max-w-[30rem]">
                <h3 className="text-[30px] font-extrabold leading-[1.2] tracking-[-0.015em] text-white text-balance">
                  오늘 딱 하나.
                  <br />
                  원픽으로 끝냅니다.
                </h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-white/90">
                  관심사·동네·시간에 규칙 기반으로 맞춘 활동 1~3개. 왜 이걸 골랐는지 근거까지 함께 보여드려요.
                </p>
              </div>
            </LandingPhoto>

            {/* 아래 민트 칸과 형태를 맞춘다 — 물감 얼룩은 모서리에, 텍스트는 왼쪽 정렬.
                3D를 걷어낸 자리: 덩어리 하나 보여주자고 WebGL 청크를 받을 이유가 없었다. */}
            <article className="paint-card paint-wash wcard-hover relative flex min-h-[205px] flex-col justify-center overflow-hidden p-7">
              <span
                aria-hidden
                className="paint-blob-a paint-drift pointer-events-none absolute -top-8 -right-10 h-[150px] w-[150px] opacity-30"
                style={{ background: "radial-gradient(circle at 38% 34%, var(--color-sun), var(--color-primary))" }}
              />
              <div className="relative">
                <p className="text-[15px] font-bold text-primary-deep">고민하는 시간</p>
                <p className="mt-1.5 text-[38px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                  60<span className="text-[21px] font-bold text-muted">초</span>
                </p>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-label">
                  검색하고 고민할 필요 없이, 3문항 진단으로 오늘 할 것만 골라드려요.
                </p>
              </div>
            </article>

            {/* 하이퍼로컬 — 민트 워시. 위 칸과 다른 색면이라 "같은 카드 반복"이 아니다.
                실적재된 활동 수는 heroPicks로 증명되지 않으므로 숫자를 지어내지 않는다. */}
            <article
              className="paint-card paint-wash wcard-hover relative flex min-h-[205px] flex-col justify-center overflow-hidden p-7"
              style={{ ["--wash" as string]: "var(--color-mint-tint)", ["--wash-2" as string]: "#cfe8e0" }}
            >
              {/* 걸어서 닿는 거리 = 반경. 물감 원 두 개가 겹친 자국으로 집·회사 2축을 암시한다. */}
              <span
                aria-hidden
                className="paint-blob-b pointer-events-none absolute -top-8 -right-10 h-[150px] w-[150px] opacity-30"
                style={{ background: "radial-gradient(circle at 38% 34%, #7fc9b8, #1e6e64)" }}
              />
              <p className="relative text-[15px] font-bold text-mint">하이퍼로컬</p>
              <p className="relative mt-1.5 text-[34px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                걸어서<span className="ml-1.5 text-[21px] font-bold text-muted">닿는 거리</span>
              </p>
              <p className="relative mt-2.5 max-w-[22rem] text-[14px] leading-[1.6] text-label">
                집과 회사 두 곳을 기준으로 거리를 재요. 퇴근길에 들를 수 있는 것만 남겨드려요.
              </p>
            </article>
          </div>
        </WebContainer>
      </section>

      {/* ══ 3. 이렇게 찾아드려요 — 물감 경로 ══
          이전: 동일한 카드 3개 + 01/02/03 + 회색 화살표. 템플릿 티가 가장 심했던 자리.
          지금: 손으로 그린 경로 하나가 세 지점을 잇는다. 카드도 번호도 없다. */}
      <section className="paint-paper relative bg-bg pt-[68px] pb-[84px]">
        <PaintEdge color="var(--color-surface)" direction="down" className="absolute inset-x-0 top-0" />
        <WebContainer className="relative">
          <div className="reveal max-w-[46ch]">
            <h2 className="break-keep text-[27px] font-bold leading-tight tracking-[-0.02em] text-ink">
              집만 정하면, 나머진 모퉁이가.
            </h2>
            <p className="mt-2 text-[16px] text-label">세 걸음이면 오늘 저녁이 정해져요.</p>
          </div>

          <div className="relative mt-14">
            {/* 경로는 스텝 뒤에 깔린다. 데스크탑에서만 — 모바일은 세로라 경로가 의미 없다.
                높이 44px = 지점(h-11)과 같게, top-0으로 맞춰 선이 지점 한가운데를 지난다.
                (이전엔 120px 띠를 -top-6에 둬서 선이 지점 한참 아래로 지나갔다.) */}
            <PaintPath className="pointer-events-none absolute inset-x-0 top-0 hidden h-11 w-full md:block" />

            {/* ol — 순서가 의미를 갖는 목록이다. 번호 라벨은 지웠지만 시맨틱은 유지. */}
            <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((s, i) => (
                <li key={s.verb} className="reveal relative">
                  {/* 경로 위의 지점 — 물감이 뭉친 자국. 번호를 대신해 위치를 표시한다. */}
                  <span
                    aria-hidden
                    className="paint-blob-a block h-11 w-11"
                    style={{
                      background:
                        i === 0
                          ? "linear-gradient(140deg, var(--color-sun), var(--color-primary))"
                          : i === 1
                            ? "linear-gradient(140deg, var(--color-primary), var(--color-purple))"
                            : "linear-gradient(140deg, #7fc9b8, var(--color-mint))",
                    }}
                  />
                  <h3 className="mt-4 text-[18px] font-bold text-ink">{s.verb}</h3>
                  <p className="mt-1.5 max-w-[26ch] text-[14px] leading-[1.6] text-label">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </WebContainer>
      </section>

      {/* ══ 4. 지금 열리는 실제 활동 — 주장이 아니라 증거 ══
          레이아웃 계열이 앞 섹션들과 겹치지 않는 가로 스크롤 열.
          다크 면이라 물감 얼룩은 밝은 쪽으로 얹는다(어두운 면 위 어두운 얼룩은 안 보임). */}
      {realPicks.length >= 4 && (
        <section className="relative overflow-hidden bg-ink-dark py-[80px]">
          <PaintEdge color="var(--color-bg)" direction="down" className="absolute inset-x-0 top-0 z-10" />
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
              네이티브 overflow 스크롤이라 스크롤 하이재킹 없음(키보드·터치 그대로). */}
          <ul className="scroll-row reveal-slide relative mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1.5rem,calc((100vw-1280px)/2))] pb-2">
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
          </ul>
        </section>
      )}

      {/* ══ 5. 마무리 — 밝게 내려놓는 클로징 ══
          앞 섹션이 다크라 여기까지 어두우면 어두운 블록이 두 번 연달아 오고,
          히어로 그라데이션을 그대로 되받으면 페이지가 "닫히는" 게 아니라 "되풀이"된다.
          그래서 웜 아이보리로 내려놓아 해소한다 — 톤을 낮추는 게 마무리다.
          물감 워시를 CTA 쪽에만 옅게 깔아 마지막 시선을 고정한다.

          갈래는 죽은 라벨 6개가 아니라 /explore?q=로 들어가는 실제 진입점이다.
          (검색어는 DB 실측으로 골랐다: 교육/체험 131 · 전시 105 · 연극 65 · 콘서트 53 ·
           클래식 42 · 코스 30. "걷기길"은 0건이라 "코스"로 바꿨다 — 죽은 링크 방지.) */}
      <section className="paint-paper relative bg-bg pt-[74px] pb-[96px]">
        {realPicks.length >= 4 && (
          <PaintEdge color="var(--color-ink-dark)" direction="down" className="absolute inset-x-0 top-0" />
        )}
        <WebContainer className="relative grid grid-cols-1 items-start gap-14 lg:grid-cols-[1fr_0.85fr] lg:gap-24">
          {/* 좌 — 결론과 행동 */}
          <div className="reveal relative">
            {/* 물감 자국이 헤드라인 뒤에 깔린다 — 마지막 CTA로 시선을 모으는 색면. */}
            <span
              aria-hidden
              className="paint-blob-b paint-drift pointer-events-none absolute -top-12 -left-14 -z-10 h-[220px] w-[260px] opacity-[0.5]"
              style={{ background: "radial-gradient(circle at 40% 36%, var(--color-tint), transparent 68%)" }}
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
    </>
  );
}
