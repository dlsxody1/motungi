/**
 * A1 · 데스크탑 랜딩 — 히어로 + "왜 모퉁이" 비대칭 벤토 + 3스텝 흐름 + 카테고리 미리보기.
 * redesign-preserve: 트와일라잇 로즈 토큰·브랜드·copy voice 유지, 시각 언어만 강화.
 * 아이콘은 랜딩 전용 미니멀 세트(landing-icons.tsx) — 제너릭 라인 아이콘 티 제거.
 * 모바일에서는 렌더되지 않는다(md: 이상). 모션은 CSS scroll-driven only(JS 의존성 없음).
 */
import Link from "next/link";
import {
  ArrowMiniIcon,
  CheckMiniIcon,
  CompassMiniIcon,
  FlashIcon,
  PinIcon,
  SearchMiniIcon,
  SparkIcon,
  TargetIcon,
} from "./landing-icons";
import { WebContainer } from "./web-shell";

/** 3스텝 — 번호 스캐폴딩 대신 동사형 라벨 + 실제 흐름 */
const STEPS = [
  {
    Icon: PinIcon,
    verb: "내 동네 설정",
    desc: "집·회사만 정하면 준비 끝. 걸어서 닿는 반경을 기준 삼아요.",
  },
  {
    Icon: SparkIcon,
    verb: "60초 진단",
    desc: "관심사·시간대·에너지 3문항. 오늘 컨디션에 맞춰 골라요.",
  },
  {
    Icon: CompassMiniIcon,
    verb: "동네 리포트",
    desc: "오늘의 원픽과 활동 목록. 고민 없이 바로 나가면 돼요.",
  },
];

/** 카테고리 미리보기 — 떠 있는 칩 대신 "이 안에 뭐가 있는지"를 보인다 */
const CATEGORIES = [
  { label: "문화·공연", ex: "한강 야간 재즈, 동네 소극장", tone: "brand" },
  { label: "운동·산책", ex: "경의선숲길, 새벽 러닝 크루", tone: "mint" },
  { label: "먹거리·마켓", ex: "망원시장 야시장, 플리마켓", tone: "purple" },
  { label: "클래스·배움", ex: "원데이 도예, 동네 북클럽", tone: "muted" },
  { label: "퇴근후 부업", ex: "주말 플리마켓 셀러", tone: "muted" },
] as const;

const TONE_DOT: Record<string, string> = {
  brand: "bg-primary",
  mint: "bg-mint",
  purple: "bg-purple",
  muted: "bg-faint",
};

export function WebLanding() {
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
        {/* 은은한 광원 오버레이 — 그라데이션 위 깊이감 */}
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 88% 8%, rgba(255,255,255,0.16), transparent 46%), radial-gradient(90% 80% at 6% 100%, rgba(46,26,16,0.14), transparent 52%)",
          }}
        />

        <WebContainer className="relative flex items-center gap-14 py-[72px] pb-[84px]">
          {/* 좌측 카피 */}
          <div className="max-w-[560px] flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/20 px-3.5 py-2 text-[13px] font-semibold text-white backdrop-blur-sm">
              <PinIcon size={15} />
              하이퍼로컬 여가 큐레이션
            </span>
            <h1 className="mt-6 text-[56px] font-extrabold leading-[1.14] tracking-[-0.035em] text-white text-balance">
              퇴근하고
              <br />
              뭐하지?
            </h1>
            <p className="mt-5 max-w-[30rem] text-[19px] leading-[1.6] font-medium text-white/95">
              수백 개 대신 딱 1~3개. 퇴근 후·주말 내 동네에서 즐길 문화·여가·활동을 60초 만에 골라드려요.
            </p>

            {/* 위치 검색 인풋 — 클릭하면 동네 검색으로. placeholder-as-label 아님(값 표시 + 라벨 위) */}
            <div className="mt-8 max-w-[500px]">
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

          {/* 우측 플로팅 프리뷰 카드 */}
          <div className="relative hidden w-[392px] shrink-0 pb-10 pl-8 lg:block">
            <div className="wcard-hover rounded-[22px] bg-surface p-[22px] shadow-[0_30px_60px_rgba(40,20,10,0.28)]">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-white">
                  오늘의 원픽 · 동네 문화
                </span>
                <span className="text-[13px] font-bold text-primary">도보 15분</span>
              </div>
              <h3 className="mt-3 break-keep text-[21px] font-extrabold leading-[1.35] tracking-[-0.01em] text-ink">
                퇴근길 20분, 망원 한강 야간 재즈 소품 공연
              </h3>
              <div className="mt-4 rounded-xl bg-tint px-4 py-3.5">
                <p className="text-[12px] font-semibold text-primary-deep">참가비</p>
                <p className="text-[28px] font-extrabold leading-tight text-primary-deep">무료</p>
                <p className="mt-0.5 text-[12px] text-muted">저녁 7시 · 회사에서 도보 15분</p>
              </div>
            </div>
            {/* 겹치는 미니 카드 */}
            <div className="wcard-hover absolute bottom-0 left-0 flex items-center gap-2.5 rounded-2xl bg-surface p-3.5 shadow-[0_18px_36px_rgba(40,20,10,0.2)] ring-1 ring-black/[0.03]">
              <span className="grid size-9 place-items-center rounded-lg bg-mint-tint text-mint">
                <PinIcon size={18} />
              </span>
              <span>
                <span className="block text-[12px] text-muted">경의선숲길 산책</span>
                <span className="block text-[16px] font-extrabold text-mint">무료</span>
              </span>
            </div>
          </div>
        </WebContainer>
      </section>

      {/* ── 왜 모퉁이 · 비대칭 벤토 ── */}
      <section className="bg-surface py-[72px]">
        <WebContainer>
          <div className="reveal max-w-[640px]">
            <h2 className="text-[30px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink text-balance">
              검색하지 마세요.
              <br />
              오늘 할 것만 정해드릴게요.
            </h2>
            <p className="mt-3 text-[16px] leading-[1.65] text-muted">
              흩어진 동네 정보를 뒤지는 대신, 내게 맞는 하나를 받는 방식.
            </p>
          </div>

          {/* 벤토: 큰 원픽 셀(2행, 실제 카드 프리뷰 포함) + 보조 두 셀. 3-equal 회피. */}
          <div className="reveal mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
            {/* 큰 셀 — 원픽(주인공): 카피 + 실제 원픽 카드 미리보기 */}
            <article
              className="wcard-hover relative flex flex-col overflow-hidden rounded-[22px] p-8 text-white lg:row-span-2"
              style={{
                background:
                  "linear-gradient(158deg, var(--color-primary) 0%, var(--color-primary-deep) 78%, var(--color-purple) 148%)",
              }}
            >
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(90% 70% at 92% 4%, rgba(255,255,255,0.2), transparent 52%)",
                }}
              />
              <div className="relative">
                <span className="grid size-11 place-items-center rounded-[13px] bg-white/18 backdrop-blur-sm">
                  <TargetIcon size={24} />
                </span>
                <h3 className="mt-5 text-[26px] font-extrabold leading-[1.25] tracking-[-0.01em] text-balance">
                  오늘 딱 하나.
                  <br />
                  원픽으로 끝냅니다.
                </h3>
                <p className="mt-3 max-w-[24rem] text-[15px] leading-[1.65] text-white/90">
                  관심사·동네·시간에 규칙 기반으로 맞춘 활동 1~3개. 왜 이걸 골랐는지 근거까지 함께 보여드려요.
                </p>
              </div>

              {/* 실제 원픽 카드 미리보기 — 제품의 결과물을 그대로 보여준다 */}
              <div className="relative mt-7 rounded-[18px] bg-white p-5 text-ink shadow-[0_18px_40px_rgba(40,15,25,0.28)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary">
                    <SparkIcon size={15} />
                    오늘의 원픽
                  </span>
                  <span className="text-[12px] font-bold text-primary">도보 15분</span>
                </div>
                <p className="mt-2.5 text-[17px] font-bold leading-[1.4] tracking-[-0.01em] text-ink">
                  퇴근길 20분, 망원 한강 야간 재즈 소품 공연
                </p>
                <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12px] font-medium text-label">
                  <span className="inline-flex items-center gap-1">
                    <PinIcon size={13} className="text-faint" />
                    망원동 · 도보 15분
                  </span>
                  <span className="text-line">|</span>
                  <span>저녁 7시</span>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-line-alt pt-3.5">
                  <span className="text-[19px] font-extrabold text-primary">무료</span>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted">
                    자세히 보기 <ArrowMiniIcon size={15} className="text-primary" />
                  </span>
                </div>
              </div>
            </article>

            {/* 보조 셀 1 — 마찰 제로 */}
            <article className="wcard-hover rounded-[22px] border border-line-alt bg-bg p-7">
              <span className="grid size-[46px] place-items-center rounded-[13px] bg-tint text-primary">
                <FlashIcon size={24} />
              </span>
              <h3 className="mt-4 text-[19px] font-bold leading-tight text-ink">마찰 제로</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-muted">
                뭐 할지 검색하고 고민할 필요 없이, 60초 진단으로 오늘 할 것만 골라드려요.
              </p>
            </article>

            {/* 보조 셀 2 — 하이퍼로컬 */}
            <article className="wcard-hover rounded-[22px] border border-line-alt bg-mint-tint/60 p-7">
              <span className="grid size-[46px] place-items-center rounded-[13px] bg-mint text-white">
                <PinIcon size={24} />
              </span>
              <h3 className="mt-4 text-[19px] font-bold leading-tight text-ink">하이퍼로컬</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-muted">
                집과 회사를 기준으로, 퇴근길·주말에 걸어서 닿는 진짜 동네 활동만 찾아요.
              </p>
            </article>
          </div>
        </WebContainer>
      </section>

      {/* ── 이렇게 찾아드려요 · 3스텝 흐름 ── */}
      <section className="bg-bg py-[72px]">
        <WebContainer>
          <div className="reveal">
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              집만 정하면, 나머진 모퉁이가.
            </h2>
            <p className="mt-2 text-[16px] text-muted">세 걸음이면 오늘 저녁이 정해져요.</p>
          </div>

          {/* 카드 사이 화살표로 순서를 시각화 — 번호 배지 제거. 카드는 균등 폭. */}
          <div className="reveal mt-9 flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            {STEPS.map((s, i) => (
              <div key={s.verb} className="contents">
                <div className="wcard-hover rounded-[18px] bg-surface p-6 shadow-web md:flex-1">
                  <span className="grid size-[46px] place-items-center rounded-[13px] bg-tint text-primary">
                    <s.Icon size={24} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-bold text-ink">{s.verb}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.55] text-muted">{s.desc}</p>
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

      {/* ── 카테고리 미리보기 + 마무리 CTA ── */}
      <section className="bg-surface py-[72px]">
        <WebContainer>
          <div className="reveal">
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              동네엔 생각보다 많은 게 있어요.
            </h2>
            <p className="mt-2 text-[16px] text-muted">
              다섯 갈래에서 오늘의 컨디션에 맞는 걸 골라드려요.
            </p>
          </div>

          {/* 칩 대신 예시가 붙은 리스트 — 맥락 있는 콘텐츠 */}
          <ul className="reveal mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li
                key={c.label}
                className="wcard-hover flex items-center gap-3 rounded-[14px] border border-line-alt bg-bg px-4 py-3.5"
              >
                <span className={`size-2 shrink-0 rounded-full ${TONE_DOT[c.tone]}`} aria-hidden />
                <span>
                  <span className="block text-[15px] font-bold text-ink">{c.label}</span>
                  <span className="block text-[13px] text-muted">{c.ex}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* 마무리 CTA — 히어로와 동일 intent("찾기") 유지, 라벨 통일 */}
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
