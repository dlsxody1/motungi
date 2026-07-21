"use client";

/**
 * 히어로 캐러셀 — 실제 활동(image_url 있는 것)을 카드로 넘겨 본다.
 *
 * 넘기기: (1) 좌·우 화살표 버튼 (2) 터치/포인터 스와이프 (3) 하단 도트. 그리고 1.5초 자동 전환.
 *  - hover/focus/스와이프 중: 자동 전환 일시정지.
 *  - click: 우리 사이트 내부 활동 상세(/opportunity?id=…)로 이동.
 *  - prefers-reduced-motion: 자동 전환만 끔(수동 넘기기는 유지).
 *
 * 웹(히어로 우측)·모바일(CTA 위) 공용. 장식 아이콘 없음(화살표는 기능적 예외).
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_NEIGHBORHOOD,
  type MockOpportunity,
  POPULAR_NEIGHBORHOODS,
} from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { LandingPhoto } from "./landing-photo";

/** 자동 전환 간격(ms). */
const ADVANCE_MS = 1500;
/** 스와이프로 인정할 최소 이동(px). */
const SWIPE_THRESHOLD = 40;

/** 카테고리 → LandingPhoto 폴백 톤(이미지 로드 전/실패 시 은은한 브랜드색). */
const CATEGORY_TONE: Record<string, "rose" | "mint" | "purple" | "warm" | "dusk"> = {
  culture: "rose",
  active: "mint",
  side_job: "warm",
  class: "purple",
  food: "warm",
  market: "warm",
};

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/** 방향 화살표 버튼 — CSS로 그린 chevron(아이콘 라이브러리 없음). */
function ArrowButton({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "이전 활동" : "다음 활동"}
      className="grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-md transition-[background-color,transform] hover:bg-white active:scale-95"
    >
      <span
        className={`block size-2.5 border-ink ${
          dir === "left"
            ? "translate-x-[1px] rotate-45 border-b-2 border-l-2"
            : "translate-x-[-1px] -rotate-45 border-b-2 border-r-2"
        }`}
      />
    </button>
  );
}

/** 활동 카드 한 장 — 포스터 + 카테고리 라벨 + 제목·동네·참가비. 내부 상세로 링크. */
function HeroCard({
  item,
  state,
}: {
  item: MockOpportunity;
  state: "active" | "idle";
}) {
  const dong = item.location?.dongName;
  const tone = CATEGORY_TONE[item.category] ?? "rose";
  // title/summary는 데이터 레이어(rowToOpportunity)에서 이미 엔티티 디코드됨.
  const title = item.title;

  return (
    <Link
      href={`/opportunity?id=${item.id}`}
      aria-hidden={state === "idle"}
      tabIndex={state === "active" ? 0 : -1}
      draggable={false}
      className={`group/card absolute inset-0 block transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        state === "active"
          ? "z-10 opacity-100"
          : "pointer-events-none z-0 scale-[0.94] opacity-0"
      }`}
    >
      <LandingPhoto
        src={item.imageUrl}
        alt={title}
        tone={tone}
        sizes="(min-width: 1024px) 380px, 100vw"
        scrim
        className="h-full w-full rounded-[22px] shadow-[0_24px_54px_rgba(30,12,20,0.32)] ring-1 ring-white/12 transition-transform duration-300 ease-out group-hover/card:scale-[1.02] group-focus-visible/card:scale-[1.02]"
      >
        <span className="absolute right-3.5 top-3.5 inline-flex items-center rounded-pill bg-black/45 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm">
          {item.categoryLabel}
        </span>
        <div className="absolute inset-x-3.5 bottom-3.5">
          <h3 className="line-clamp-2 break-keep text-[16px] font-extrabold leading-[1.3] tracking-[-0.01em] text-white drop-shadow-sm">
            {title}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] font-medium text-white/85">
            {dong && <span>{dong}</span>}
            {dong && <span className="text-white/40">·</span>}
            <span className="font-bold text-white">{item.costLabel}</span>
          </p>
        </div>
      </LandingPhoto>
    </Link>
  );
}

/** 인기 동네 목록에서 동 이름 → 소속 구("서울 마포구" → "마포구") 룩업. 없으면 undefined. */
function guOf(dongName: string | undefined): string | undefined {
  if (!dongName) return undefined;
  const region = POPULAR_NEIGHBORHOODS.find((p) => p.dongName === dongName)?.region;
  // region 예: "서울 마포구" / "경기 성남시 분당구" → 마지막 토큰이 구/군.
  return region?.split(" ").at(-1);
}

export function HeroCarousel({ items }: { items: MockOpportunity[] }) {
  // 앵커 동네(사용자가 /location에서 정한 집 기준). 없으면 기본 망원동.
  const anchorDong = useAppStore((s) => s.anchors.home?.dongName) ?? DEFAULT_NEIGHBORHOOD.dongName;
  const gu = guOf(anchorDong);
  // 활동의 dong_name은 구 단위(예: "마포구")라 앵커의 구로 좁힌다. 구를 모르거나 매칭 0건이면
  // 전체를 보여준다(빈 캐러셀 방지) — 라벨은 항상 앵커 동네를 명시한다.
  const nearby = gu ? items.filter((o) => (o.location?.dongName ?? "").includes(gu)) : [];
  const shown = nearby.length >= 1 ? nearby : items;
  const scoped = nearby.length >= 1;

  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const swipe = useRef({ startX: 0, active: false });
  const reduce = useReducedMotion();
  const n = shown.length;

  const go = (next: number) => setIndex((next + n) % n);
  const prev = () => go(index - 1);
  const advance = () => go(index + 1);

  // 1.5초 자동 전환. hover/focus/스와이프로 일시정지, reduced-motion이면 돌지 않는다.
  useEffect(() => {
    if (reduce || n <= 1) return;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % n);
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [reduce, n]);

  if (n === 0) return null;
  // 필터로 목록이 줄어들 수 있으니 활성 인덱스를 범위 안으로 보정.
  const active = index % n;

  const pause = () => (paused.current = true);
  const resume = () => (paused.current = false);

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { startX: e.clientX, active: true };
    pause();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!swipe.current.active) return;
    const dx = e.clientX - swipe.current.startX;
    swipe.current.active = false;
    resume();
    if (Math.abs(dx) > SWIPE_THRESHOLD) (dx < 0 ? advance : prev)();
  };
  // 스와이프로 판정된 경우 카드 클릭(링크 이동)을 삼킨다.
  const onClickCapture = (e: React.MouseEvent) => {
    if (swipe.current.startX && Math.abs(e.nativeEvent.offsetX) > 0 && swipe.current.active) {
      e.preventDefault();
    }
  };

  return (
    <div
      className="w-full select-none"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
    >
      {/* 기준 동네 명시 — 앵커 동네를 강조. 구 매칭이 되면 "○○동 근처", 아니면 "○○동 기준" */}
      <p className="mb-3 text-[14px] font-medium text-white/85">
        <b className="text-[16px] font-extrabold text-white">{anchorDong}</b>
        {scoped ? " 근처에서 열리는 활동" : " 기준으로 골라본 활동"}
      </p>

      {/* 카드 스택 + 좌우 화살표. 3:4보다 낮은 5:6 비율로 높이를 줄여 한 화면에 CTA까지 들어오게. */}
      <div
        className="relative mx-auto aspect-[5/6] w-full max-w-[360px] touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current.active = false)}
        onClickCapture={onClickCapture}
      >
        {shown.map((item, i) => (
          <HeroCard key={item.id} item={item} state={i === active ? "active" : "idle"} />
        ))}

        {n > 1 && (
          <>
            <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2">
              <ArrowButton dir="left" onClick={prev} />
            </div>
            <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2">
              <ArrowButton dir="right" onClick={advance} />
            </div>
          </>
        )}
      </div>

      {/* 도트 인디케이터 — 현재 위치 + 점프 */}
      {n > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="활동 넘기기">
          {shown.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${i + 1}번째 활동`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-pill transition-all duration-300 ${
                i === active ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
