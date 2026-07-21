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
import { HeroCarousel } from "./hero-carousel";
import { ArrowMiniIcon, CheckMiniIcon, SearchMiniIcon, SparkIcon } from "./landing-icons";
import { LandingPhoto } from "./landing-photo";
import { WebContainer } from "./web-shell";

/** 3스텝 — 번호 스캐폴딩 없이 동사형 라벨 + 실제 흐름 */
const STEPS = [
  { n: "01", verb: "내 동네 설정", desc: "집·회사만 정하면 준비 끝. 걸어서 닿는 반경을 기준 삼아요." },
  { n: "02", verb: "60초 진단", desc: "관심사·시간대·에너지 3문항. 오늘 컨디션에 맞춰 골라요." },
  { n: "03", verb: "동네 리포트", desc: "오늘의 원픽과 활동 목록. 고민 없이 바로 나가면 돼요." },
];

/** 카테고리 미리보기 — 사진 썸네일 + 예시. "이 안에 뭐가 있는지"를 장면으로 보인다. */
const CATEGORIES = [
  { label: "문화·공연", ex: "한강 야간 재즈, 동네 소극장", src: "/landing/hangang-jazz.svg", tone: "rose" as const },
  { label: "운동·산책", ex: "경의선숲길, 새벽 러닝 크루", src: "/landing/gyeongui-forest.svg", tone: "mint" as const },
  { label: "먹거리·마켓", ex: "망원시장 야시장, 플리마켓", src: "/landing/mangwon-market.svg", tone: "warm" as const },
  { label: "클래스·배움", ex: "원데이 도예, 동네 북클럽", src: "/landing/oneday-pottery.svg", tone: "purple" as const },
  { label: "퇴근후 부업", ex: "주말 플리마켓 셀러", src: "/landing/flea-market.svg", tone: "warm" as const },
];

export function WebLanding({ heroPicks = [] }: { heroPicks?: MockOpportunity[] }) {
  // 캐러셀은 이미지 있는 실데이터가 충분할 때만(로컬/빈 DB에서는 기존 목업 폴백).
  const showCarousel = heroPicks.length >= 4;
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

        <WebContainer className="relative flex items-center gap-14 py-[76px] pb-[88px]">
          {/* 좌측 카피 */}
          <div className="max-w-[560px] flex-1">
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
              <Link
                href="/location"
                id="loc-search"
                className="group flex items-center gap-3 rounded-2xl bg-surface p-[9px] pl-4 shadow-[0_18px_40px_rgba(40,20,10,0.22)] transition-shadow hover:shadow-[0_22px_48px_rgba(40,20,10,0.28)]"
              >
                <SearchMiniIcon size={20} className="shrink-0 text-primary" />
                <span className="flex-1 text-[16px] font-semibold text-ink">
                  망원동 <span className="text-[14px] font-medium text-muted">· 서울 마포구</span>
                </span>
                <span className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-[11px] bg-primary px-[26px] text-[16px] font-bold text-white transition-[background-color,transform] group-hover:bg-primary-deep group-active:scale-[0.98]">
                  찾기
                  <ArrowMiniIcon size={18} />
                </span>
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[14px] text-white/85">
              <CheckMiniIcon size={16} />
              로그인 없이 바로 시작 · 저장할 때만 가입
            </p>
          </div>

          {/* 우측 — 실 활동 자동 전환 캐러셀(썸네일 있는 실데이터). 없으면 기존 사진 목업 폴백 */}
          <div className="relative hidden w-[380px] shrink-0 lg:block">
            {showCarousel ? (
              <HeroCarousel items={heroPicks} />
            ) : (
              <LandingPhoto
                src="/landing/hangang-jazz.svg"
                alt="한강 야간 재즈 공연이 열리는 저녁 강변 풍경"
                tone="dusk"
                priority
                sizes="380px"
                className="aspect-[3/4] rounded-[26px] shadow-[0_34px_70px_rgba(30,12,20,0.4)] ring-1 ring-white/10"
                scrim
              >
                <span className="absolute left-5 top-5 inline-flex items-center rounded-pill bg-black/35 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm">
                  오늘의 원픽 · 동네 문화
                </span>
                <div className="absolute inset-x-5 bottom-5">
                  <h3 className="break-keep text-[22px] font-extrabold leading-[1.3] tracking-[-0.01em] text-white drop-shadow-sm">
                    퇴근길 20분, 망원 한강 야간 재즈 소품 공연
                  </h3>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-white/85">
                    <span>저녁 7시 · 회사에서 도보 15분</span>
                    <span className="text-white/40">·</span>
                    <span className="font-bold text-white">무료</span>
                  </p>
                </div>
              </LandingPhoto>
            )}
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

          {/* 벤토: 큰 사진 셀(주인공, 2행) + 보조 두 셀. 아이콘 타일 제거. */}
          <div className="reveal mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
            {/* 큰 셀 — 실제 장소 사진 위에 원픽 정보. 카드 안 카드 제거. */}
            <LandingPhoto
              src="/landing/hangang-jazz.svg"
              alt="망원 한강 야간 재즈 공연 현장"
              tone="dusk"
              sizes="(min-width: 1024px) 58vw, 100vw"
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
                {/* 결과물 힌트 — 사진 위 인라인 메타(카드 아님) */}
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold text-white/90">
                  <span>퇴근길 20분 · 망원 한강 재즈</span>
                  <span className="text-white/40">|</span>
                  <span>도보 15분</span>
                  <span className="text-white/40">|</span>
                  <span className="text-white">무료</span>
                </div>
              </div>
            </LandingPhoto>

            {/* 보조 셀 1 — 마찰 제로. 아이콘 타일 대신 큰 숫자 + 텍스트. */}
            <article className="wcard-hover flex flex-col justify-between rounded-[22px] border border-line-alt bg-bg p-7">
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

            {/* 보조 셀 2 — 하이퍼로컬. 사진 썸네일 + 텍스트. */}
            <article className="wcard-hover flex items-center gap-4 rounded-[22px] border border-line-alt bg-mint-tint/50 p-5">
              <LandingPhoto
                src="/landing/gyeongui-forest.svg"
                alt="경의선숲길 산책로"
                tone="mint"
                sizes="112px"
                className="size-[112px] shrink-0 rounded-[16px]"
              />
              <div>
                <p className="text-[17px] font-bold leading-tight text-ink">하이퍼로컬</p>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-label">
                  집과 회사를 기준으로, 퇴근길·주말에 걸어서 닿는 진짜 동네 활동만.
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

      {/* ── 카테고리 미리보기(사진 썸네일) + 마무리 CTA ── */}
      <section className="bg-surface py-[76px]">
        <WebContainer>
          <div className="reveal">
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              동네엔 생각보다 많은 게 있어요.
            </h2>
            <p className="mt-2 text-[16px] text-label">
              다섯 갈래에서 오늘의 컨디션에 맞는 걸 골라드려요.
            </p>
          </div>

          {/* 사진 썸네일 리스트 — 컬러 점 대신 실제 장면. 맥락 있는 콘텐츠. */}
          <ul className="reveal mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li
                key={c.label}
                className="wcard-hover flex items-center gap-4 overflow-hidden rounded-[16px] border border-line-alt bg-bg p-2.5 pr-4"
              >
                <LandingPhoto
                  src={c.src}
                  alt={`${c.label} 예시 — ${c.ex}`}
                  tone={c.tone}
                  sizes="84px"
                  className="size-[84px] shrink-0 rounded-[12px]"
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-ink">{c.label}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-label">{c.ex}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* 마무리 CTA — 히어로와 동일 intent 유지 */}
          <div className="reveal mt-12 flex flex-col items-center gap-5 rounded-[24px] bg-tint px-8 py-11 text-center">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-primary-deep text-balance">
              오늘 저녁, 뭐 할지 아직 안 정했다면.
            </h2>
            <Link
              href="/location"
              className="flex h-[54px] items-center gap-2 rounded-[13px] bg-primary px-8 text-[16px] font-bold text-white transition-[background-color,transform] hover:bg-primary-deep active:scale-[0.98]"
            >
              내 동네에서 찾기
              <ArrowMiniIcon size={18} />
            </Link>
            <p className="flex items-center gap-1.5 text-[13px] text-muted">
              <CheckMiniIcon size={15} className="text-mint" />
              로그인 없이 바로 시작 · 저장할 때만 가입
            </p>
          </div>
        </WebContainer>
      </section>
    </>
  );
}
