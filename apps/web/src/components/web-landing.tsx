/**
 * A1 · 데스크탑 랜딩 — 히어로(2단) + 밸류프롭 3칸 + 이렇게 찾아드려요 + 카테고리 칩.
 * 피그마 목업(Screen A) 기준. 모바일에서는 렌더되지 않는다(md: 이상).
 */
import Link from "next/link";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  LocationIcon,
  SavingsIcon,
  SparkleIcon,
} from "./icons";
import { WebContainer } from "./web-shell";

const VALUE_PROPS = [
  {
    Icon: BoltIcon,
    title: "마찰 제로",
    desc: "뭐 할지 검색하고 고민할 필요 없이, 60초 진단으로 오늘 할 것만 골라드려요.",
  },
  {
    Icon: SparkleIcon,
    title: "원픽",
    desc: "오늘 딱 하나. 내 관심사·동네·시간에 가장 잘 맞는 활동 1~3개만 추려서 보여줘요.",
  },
  {
    Icon: LocationIcon,
    title: "하이퍼로컬",
    desc: "집과 회사를 기준으로, 퇴근길·주말에 걸어서 닿는 진짜 동네 활동을 찾아요.",
  },
];

const STEPS = [
  { n: 1, title: "내 동네 설정", desc: "집·회사만 정하면 준비 끝." },
  { n: 2, title: "60초 진단", desc: "3문항으로 관심사·여건 파악." },
  { n: 3, title: "동네 리포트", desc: "오늘의 원픽과 활동 목록." },
];

const CATEGORIES = [
  { label: "문화·공연", cls: "bg-tint text-primary-deep border border-primary/30" },
  { label: "운동·산책", cls: "bg-mint-tint text-mint" },
  { label: "먹거리·마켓", cls: "bg-purple-tint text-purple" },
  { label: "클래스·배움", cls: "bg-surface text-muted border border-line" },
  { label: "퇴근후 부업", cls: "bg-surface text-muted border border-line" },
];

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
        {/* 은은한 광원 오버레이 — 그라데이션 위 깊이감(장식 blur 원 대체) */}
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
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/20 px-3.5 py-2 text-[13px] font-semibold text-white">
              <LocationIcon size={15} />
              하이퍼로컬 여가 큐레이션
            </span>
            <h1 className="mt-6 text-[56px] font-extrabold leading-[1.14] tracking-[-0.035em] text-white">
              퇴근하고
              <br />
              뭐하지?
            </h1>
            <p className="mt-5 max-w-[30rem] text-[19px] leading-[1.6] font-medium text-white/95">
              수백 개 대신 딱 1~3개. 퇴근 후·주말 내 동네에서 즐길 문화·여가·활동을 60초 만에 골라드려요.
            </p>

            {/* 위치 검색바 */}
            <div className="mt-8 flex max-w-[500px] items-center gap-3 rounded-2xl bg-surface p-[9px] pl-4 shadow-[0_18px_40px_rgba(40,20,10,0.22)]">
              <LocationIcon size={20} className="shrink-0 text-primary" />
              <span className="flex-1 text-[16px] font-semibold text-ink">
                망원동 <span className="text-[14px] font-medium text-muted">· 서울 마포구</span>
              </span>
              <Link
                href="/location"
                className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-[11px] bg-primary px-[26px] text-[16px] font-bold text-white transition-colors hover:bg-primary-deep"
              >
                내 동네에서 찾기
                <ArrowRightIcon size={18} />
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[14px] text-white/85">
              <CheckCircleIcon size={16} />
              로그인 없이 바로 시작 · 저장할 때만 가입
            </p>
          </div>

          {/* 우측 플로팅 프리뷰 카드 */}
          <div className="relative hidden w-[392px] shrink-0 pb-10 pl-8 lg:block">
            <div className="rounded-[22px] bg-surface p-[22px] shadow-[0_30px_60px_rgba(40,20,10,0.28)]">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-white">
                  오늘의 원픽 · 동네 문화
                </span>
                <span className="text-[13px] font-bold text-primary">매칭 94%</span>
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
            {/* 겹치는 미니 카드 — 카드 좌하단 모서리에 살짝 걸치되 본문은 가리지 않음 */}
            <div className="absolute bottom-0 left-0 flex items-center gap-2.5 rounded-2xl bg-surface p-3.5 shadow-[0_18px_36px_rgba(40,20,10,0.2)] ring-1 ring-black/[0.03]">
              <span className="grid size-9 place-items-center rounded-lg bg-mint-tint text-mint">
                <SavingsIcon size={20} />
              </span>
              <span>
                <span className="block text-[12px] text-muted">경의선숲길 산책</span>
                <span className="block text-[16px] font-extrabold text-mint">무료</span>
              </span>
            </div>
          </div>
        </WebContainer>
      </section>

      {/* ── 밸류프롭 ── */}
      <section className="bg-surface py-15">
        <WebContainer>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {VALUE_PROPS.map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-[18px] border border-line-alt bg-bg p-7">
                <span className="grid size-[46px] place-items-center rounded-[13px] bg-tint text-primary">
                  <Icon size={24} />
                </span>
                <h3 className="mt-4 text-[19px] font-bold leading-tight text-ink">{title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-muted">{desc}</p>
              </div>
            ))}
          </div>

          {/* 이렇게 찾아드려요 */}
          <div className="mt-14 border-t border-line-alt pt-13">
            <h2 className="text-center text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
              이렇게 찾아드려요
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-6 md:flex-row md:gap-4">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center gap-4">
                  <div className="max-w-[300px] text-center">
                    <span className="mx-auto grid size-[52px] place-items-center rounded-[15px] bg-tint text-[20px] font-extrabold text-primary">
                      {s.n}
                    </span>
                    <h3 className="mt-3 text-[17px] font-bold text-ink">{s.title}</h3>
                    <p className="mt-1 text-[14px] text-muted">{s.desc}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRightIcon size={22} className="hidden text-arrow md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 카테고리 칩 */}
          <div className="mt-13 flex flex-wrap justify-center gap-2.5">
            {CATEGORIES.map((c) => (
              <span
                key={c.label}
                className={`rounded-pill px-[17px] py-2.5 text-[14px] font-semibold ${c.cls}`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </WebContainer>
      </section>
    </>
  );
}
