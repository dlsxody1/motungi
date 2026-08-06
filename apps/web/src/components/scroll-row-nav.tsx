"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * 가로 스크롤 목록 + 좌우 이동 버튼.
 *
 * 왜 필요한가: 랜딩의 포스터 열은 네이티브 `overflow-x: auto`였다. 트랙패드나 터치가
 * 있으면 자연스럽지만, **휠 마우스만 쓰는 데스크톱 사용자에겐 넘길 방법이 없다**
 * (세로 휠은 페이지를 내리고, 가로 스크롤바는 .scroll-row가 숨긴다).
 * 그래서 목록이 거기서 끝난 것처럼 보였다.
 *
 * 스크롤 자체는 그대로 네이티브다 — 하이재킹하지 않는다. 버튼은 scrollBy를 부를 뿐이라
 * 터치·키보드·트랙패드 동작은 전혀 건드리지 않는다.
 *
 * 버튼은 갈 수 있는 방향에만 나온다(끝에 닿으면 그쪽 버튼이 사라진다) — 눌러도 아무 일도
 * 없는 버튼은 고장으로 읽힌다.
 */
export function ScrollRowNav({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  /** 스크롤 영역의 접근성 이름(무엇을 넘기는 목록인지). */
  label: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  // 스크롤 위치에 따라 버튼 표시를 갱신. 목록 자체가 화면을 안 넘치면 둘 다 숨는다.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      // 소수점 오차로 끝에 닿아도 1px 남는 경우가 있어 여유를 둔다.
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // 폭이 바뀌면(창 리사이즈·이미지 로드) 넘침 여부도 바뀐다.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, []);

  /** 한 번에 보이는 폭의 80%씩 — 카드 몇 개가 겹쳐 보여 맥락이 끊기지 않는다. */
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* ul을 직접 그린다 — 스크롤 컨테이너를 따로 감싸면 li의 목록 의미가 끊긴다. */}
      <ul ref={ref} className={className} aria-label={label}>
        {children}
      </ul>

      {/* 버튼은 장식이 아니라 유일한 조작 수단일 수 있다(휠 마우스) — 항상 클릭 가능해야 한다.
          hover가 없는 터치 기기에서도 그대로 보인다: 숨기면 터치 사용자만 손해다. */}
      {!atStart && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="이전 활동 보기"
          className="absolute left-3 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-web transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:grid"
        >
          <ChevronLeftIcon size={20} />
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="다음 활동 보기"
          className="absolute right-3 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-web transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:grid"
        >
          <ChevronRightIcon size={20} />
        </button>
      )}
    </div>
  );
}
