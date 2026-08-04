/**
 * A1 · 데스크탑 랜딩 — 사진 주도 리디자인(impeccable).
 *
 * 방향: "동네·장소"가 주인공인 제품이므로, 아이콘 타일·컬러 블록 대신
 *   실제 활동 사진(한강 재즈·망원시장·경의선숲길·원데이 도예·플리마켓)을 전면에 세운다.
 *   사진은 LandingPhoto 슬롯으로 최적화·아트디렉션을 캡슐화 — public/landing/에 실사진을
 *   넣으면 그대로 교체된다(모바일도 동일 자산·규칙 재사용 대비).
 *
 * redesign-preserve: 트와일라잇 로즈 토큰·브랜드·copy voice 유지.
 * 슬롭 제거: 반복되는 아이콘-타일, 중첩 카드, 컬러 점(dot) 리스트를 걷어냄.
 * 모바일에서는 렌더되지 않는다(md: 이상). 모션은 CSS scroll-driven only(JS 의존성 없음).
 */
import Link from "next/link";
import type { MockOpportunity } from "@/data/opportunities";
import { HeroPosterStage } from "./hero-poster-stage";
import { ArrowMiniIcon, CheckMiniIcon, SparkIcon } from "./landing-icons";
import { LandingLocationLink } from "./landing-location-link";
import { LandingPhoto } from "./landing-photo";
import { WebContainer } from "./web-shell";

/** 3스텝 — 번호 스캐폴딩 없이 동사형 라벨 + 실제 흐름 */
const STEPS = [
  { n: "01", verb: "내 동네 설정", desc: "집·회사만 정하면 준비 끝. 걸어서 닿는 반경을 기준 삼아요." },
  { n: "02", verb: "60초 진단", desc: "관심사·시간대·에너지 3문항. 오늘 컨디션에 맞춰 골라요." },
  { n: "03", verb: "동네 리포트", desc: "오늘의 원픽과 활동 목록. 고민 없이 바로 나가면 돼요." },
];

export function WebLanding({ heroPicks = [] }: { heroPicks?: MockOpportunity[] }) {
  // 벤토 주인공 셀에 세울 실제 원픽. 없으면(로컬/빈 DB) 톤 그라데이션 폴백으로 내려간다.
  const featured = heroPicks.find((o) => o.imageUrl);
  // 가로 스크롤 열에 세울 실제 활동들. 히어로 링과 겹쳐도 무방 —
  // 링은 장식(aria-hidden)이고 여기가 실제로 클릭 가능한 목록이다.
  const realPicks = heroPicks.filter((o) => o.imageUrl);
  return (
    <>
      {/* ── 히어로 ── */}
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
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[14px] text-white/85">
              <CheckMiniIcon size={16} />
              로그인 없이 바로 시작 · 저장할 때만 가입
            </p>
          </div>

          {/* 우측 — 실 활동 포스터가 도는 3D 링(WebGL). 포스터 부족·WebGL 실패 시
              내부에서 기존 캐러셀로 자동 폴백한다. 스크롤하면 뒤로 물러난다(hero-recede). */}
          <div className="hero-recede relative hidden w-[460px] shrink-0 lg:block">
            <HeroPosterStage items={heroPicks} />
          </div>
        </WebContainer>
      </section>

      {/* ── 왜 모퉁이 · 사진 주도 벤토 ── */}
      <section className="bg-surface py-[76px]">
        <WebContainer>
          <div className="reveal max-w-[640px]">
            <h2 className="text-[30px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink text-balance">
              검색하지 마세요.
              <br />
              오늘 할 것만 정해드릴게요.
            </h2>
            <p className="mt-3 text-[16px] leading-[1.65] text-label">
              흩어진 동네 정보를 뒤지는 대신, 내게 맞는 하나를 받는 방식.
            </p>
          </div>

          {/* 벤토: 큰 사진 셀(주인공, 2행) + 보조 두 셀. 아이콘 타일 제거.
              stage-3d: 자식 카드들이 공유하는 원근 무대 — 호버하면 앞으로 일어선다. */}
          <div className="stage-3d reveal-depth mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
            {/* 큰 셀 — 실제 활동 포스터 위에 원픽 정보. 카드 안 카드 제거.
                featured가 있으면 진짜 데이터, 없으면 톤 그라데이션 폴백. */}
            <LandingPhoto
              src={featured?.imageUrl}
              alt={featured ? `오늘의 원픽 — ${featured.title}` : "오늘의 원픽 활동"}
              tone="dusk"
              sizes="(min-width: 1024px) 58vw, 100vw"
              // 이 셀이 LCP 후보다(첫 화면 바로 아래 큰 이미지) → priority로 미리 받는다.
              priority
              // 포스터 위에 카피를 얹으므로 살짝만 눌러 대비를 확보한다. 블러는 걸지 않는다 —
              // 포스터는 작품이라 흐리면 고장난 것처럼 보인다(가독성은 scrim이 담당).
              imgClassName="opacity-80"
              className="wcard-hover flex min-h-[420px] flex-col justify-end rounded-[24px] p-8 lg:row-span-2"
              scrim
            >
              <div className="relative max-w-[30rem]">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm">
                  <SparkIcon size={14} />
                  오늘의 원픽
                </span>
                <h3 className="mt-4 text-[28px] font-extrabold leading-[1.22] tracking-[-0.015em] text-white text-balance">
                  오늘 딱 하나.
                  <br />
                  원픽으로 끝냅니다.
                </h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-white/90">
                  관심사·동네·시간에 규칙 기반으로 맞춘 활동 1~3개. 왜 이걸 골랐는지 근거까지 함께 보여드려요.
                </p>
              </div>
            </LandingPhoto>

            {/* 보조 셀 1 — 마찰 제로. 아이콘 타일 대신 큰 숫자 + 텍스트. */}
            <article className="tilt-3d wcard-hover flex flex-col justify-between rounded-[22px] border border-line-alt bg-bg p-7">
              <p className="text-[15px] font-bold text-primary">마찰 제로</p>
              <div className="mt-6">
                <p className="text-[40px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                  60<span className="text-[22px] font-bold text-muted">초</span>
                </p>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-label">
                  뭐 할지 검색하고 고민할 필요 없이, 3문항 진단으로 오늘 할 것만 골라드려요.
                </p>
              </div>
            </article>

            {/* 보조 셀 2 — 하이퍼로컬. 손으로 그린 SVG 대신 숫자로 규모를 말한다.
                실적재된 활동 수는 heroPicks로 증명되지 않으므로 숫자를 지어내지 않는다. */}
            <article className="tilt-3d wcard-hover flex flex-col justify-between rounded-[22px] border border-line-alt bg-mint-tint/50 p-7">
              <p className="text-[15px] font-bold text-mint">하이퍼로컬</p>
              <div className="mt-6">
                <p className="text-[40px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                  걸어서<span className="ml-1 text-[22px] font-bold text-muted">닿는 거리</span>
                </p>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-label">
                  집과 회사 두 곳을 기준으로 거리를 재요. 퇴근길에 들를 수 있는 것만 남겨드려요.
                </p>
              </div>
            </article>
          </div>
        </WebContainer>
      </section>

      {/* ── 이렇게 찾아드려요 · 3스텝 흐름 ── */}
      <section className="bg-bg py-[76px]">
        <WebContainer>
          <div className="reveal">
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              집만 정하면, 나머진 모퉁이가.
            </h2>
            <p className="mt-2 text-[16px] text-label">세 걸음이면 오늘 저녁이 정해져요.</p>
          </div>

          {/* 화살표로 순서를 잇는다. 아이콘 타일 대신 절제된 번호 — 실제 순차 흐름이라 번호가 정보. */}
          <div className="reveal mt-9 flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            {STEPS.map((s, i) => (
              <div key={s.verb} className="contents">
                <div className="wcard-hover rounded-[18px] bg-surface p-6 shadow-web md:flex-1">
                  <p className="text-[14px] font-extrabold tracking-wide text-primary/70">{s.n}</p>
                  <h3 className="mt-3 text-[17px] font-bold text-ink">{s.verb}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-label">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden shrink-0 items-center px-3 md:flex" aria-hidden>
                    <ArrowMiniIcon size={22} className="text-arrow" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </WebContainer>
      </section>

      {/* ── 지금 열리는 실제 활동 — 주장이 아니라 증거. 랜딩의 마지막 섹션이다.
             다른 섹션과 레이아웃 계열이 겹치지 않게 가로 스크롤 포스터 열로 짠다.
             (앞: 사진 벤토 / 3스텝 행 / 여기: 가로 스크롤) ── */}
      {realPicks.length >= 4 && (
        <section className="overflow-hidden bg-ink-dark py-[76px]">
          <WebContainer>
            <div className="reveal flex flex-wrap items-end justify-between gap-4">
              <h2 className="max-w-[34rem] text-[26px] font-bold leading-tight tracking-[-0.02em] text-white text-balance">
                지금 이 순간에도, 동네에서 열리고 있어요.
              </h2>
              <Link
                href="/explore"
                className="flex items-center gap-1.5 rounded-[13px] border border-white/25 px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-white/10"
              >
                전체 보기
                <ArrowMiniIcon size={16} />
              </Link>
            </div>
          </WebContainer>

          {/* 컨테이너 밖으로 흘러나가는 가로 스크롤 — 목록이 끝나지 않는다는 느낌을 준다.
              네이티브 overflow 스크롤이라 스크롤 하이재킹 없음(키보드·터치 그대로). */}
          <ul className="scroll-row reveal-slide mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1.5rem,calc((100vw-1280px)/2))] pb-2">
            {realPicks.map((o) => (
              <li key={o.id} className="w-[210px] shrink-0 snap-start">
                <Link href={`/opportunity?id=${o.id}`} className="group block">
                  {/* 포스터는 잘리면 안 되는 '작품'이다 — object-contain으로 전체를 보여주고,
                      남는 여백은 뒤에 깔린 어두운 톤이 받아준다(비율이 제각각이라 크롭하면 제목이 잘림). */}
                  <LandingPhoto
                    src={o.imageUrl}
                    alt={o.title}
                    tone="dusk"
                    sizes="210px"
                    fit="contain"
                    className="aspect-[3/4] rounded-[16px] bg-black/25 ring-1 ring-white/12 transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5"
                  />
                  <p className="mt-3 line-clamp-2 break-keep text-[14px] font-bold leading-[1.4] text-white">
                    {o.title}
                  </p>
                  <p className="mt-1 text-[13px] text-white/65">
                    {o.location?.dongName ?? "서울"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
