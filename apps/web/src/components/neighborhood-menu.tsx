"use client";

import { POPULAR_NEIGHBORHOODS } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, LocationIcon, SearchIcon } from "@/components/icons";
import { MIN_QUERY_LEN, useNeighborhoodSearch } from "@/hooks/useNeighborhoodSearch";
import { useAppStore } from "@/store/useAppStore";

/**
 * 동네 전환 드롭다운. pill을 누르면 인기 동네를 바로 골라 집 앵커를 갱신한다.
 * native <dialog>는 top layer에 렌더돼 overflow:hidden 컨테이너 클리핑·z-index 경합이
 * 원천적으로 없다(포탈/position:fixed 수동 관리 불필요). ESC·백드롭 닫기도 native.
 *
 * 인기 동네에 없는 곳은 두 갈래로 갈린다:
 *  - "동네 검색하기"      → 이 다이얼로그 안에서 타입어헤드로 바로 고른다(화면 이동 없음).
 *  - "리포트 다시 만들기" → 위치를 다시 잡고 추천을 새로 받아야 하는 경우라 /location으로 보낸다.
 * 예전에는 둘을 구분하지 않고 무조건 /location으로 보내, 동네만 바꾸려던 사람까지
 * 온보딩 플로우로 튕겨나갔다.
 */

/** core Anchor와 같은 모양 — admCode·region은 인기 동네 목록에서 비어 있을 수 있어 옵셔널. */
type Pick = {
  dongName: string;
  admCode?: string;
  region?: string;
  point: { lat: number; lng: number };
};

export function NeighborhoodMenu({
  dongLabel,
  triggerClassName,
}: {
  dongLabel: string;
  triggerClassName: string;
}) {
  const router = useRouter();
  const setAnchor = useAppStore((s) => s.setAnchor);
  const currentDong = useAppStore((s) => s.anchors.home?.dongName);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"list" | "search">("list");
  // 디바운스·IME 보류·요청 취소는 훅이 소유한다(location 페이지와 같은 구현을 공유).
  const search = useNeighborhoodSearch(mode === "search");
  const { query, results, searching } = search;

  const reset = () => {
    setMode("list");
    search.reset();
  };

  const close = () => dialogRef.current?.close();

  const pick = (n: Pick) => {
    setAnchor("home", n);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          dialogRef.current?.showModal();
        }}
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-label="동네 변경"
      >
        {/* 라벨 묶음과 chevron을 갈라놓는다 — 트리거가 w-full이면 chevron이 오른쪽 끝으로 가고,
            내용 폭 pill이면 gap만큼만 벌어져 예전 모양 그대로다. */}
        <span className="flex min-w-0 items-center gap-1.5">
          <LocationIcon size={16} className="shrink-0 text-faint" />
          <span className="truncate">{dongLabel}</span>
        </span>
        <ChevronDownIcon size={16} className="shrink-0 text-faint" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="동네 선택"
        onClose={reset}
        onClick={(e) => {
          // 백드롭(=dialog 자신) 클릭 시 닫기. 내부 컨텐츠 클릭은 통과.
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-surface p-2 shadow-web backdrop:bg-ink/30"
      >
        {mode === "list" ? (
          <>
            <p className="px-3 pb-1 pt-2 text-[12px] font-semibold text-muted">동네 선택</p>
            <ul>
              {POPULAR_NEIGHBORHOODS.map((n) => {
                const active = currentDong === n.dongName;
                return (
                  <li key={n.dongName}>
                    <button
                      type="button"
                      onClick={() =>
                        pick({
                          dongName: n.dongName,
                          admCode: n.admCode,
                          region: n.region,
                          point: n.point,
                        })
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] ${
                        active ? "bg-tint font-bold text-primary-deep" : "font-medium text-label hover:bg-surface-alt"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {n.dongName}
                        <span className="text-[12px] font-normal text-muted">{n.region}</span>
                      </span>
                      {active && <CheckIcon size={15} />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="my-1.5 h-px bg-line-alt" />
            <button
              type="button"
              onClick={() => {
                setMode("search");
                // 같은 다이얼로그 안에서 화면만 바뀌므로 포커스를 직접 옮겨준다.
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="w-full rounded-lg px-3 py-2.5 text-left text-[14px] font-semibold text-label hover:bg-surface-alt"
            >
              동네 검색하기
              <span className="mt-0.5 block text-[12px] font-normal text-muted">
                목록에 없는 동네를 이름으로 찾아요
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                router.push("/location");
              }}
              className="w-full rounded-lg px-3 py-2.5 text-left text-[14px] font-semibold text-label hover:bg-surface-alt"
            >
              리포트 다시 만들기
              <span className="mt-0.5 block text-[12px] font-normal text-muted">
                위치를 다시 잡고 추천을 새로 받아요
              </span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 px-1 pb-1 pt-1">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg px-2 py-1 text-[13px] font-semibold text-muted hover:bg-surface-alt"
              >
                뒤로
              </button>
              <p className="text-[12px] font-semibold text-muted">동네 검색</p>
            </div>
            <div className="mx-1 flex items-center gap-2 rounded-lg border border-line bg-gray-100 px-3 py-2">
              <SearchIcon size={16} className="shrink-0 text-faint" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => search.setQuery(e.target.value)}
                onCompositionEnd={search.onCompositionEnd}
                placeholder="동·구 이름으로 검색"
                aria-label="동네 검색"
                className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </div>
            <div className="mt-1 max-h-[15rem] overflow-y-auto">
              {query.trim().length < MIN_QUERY_LEN ? (
                <p className="px-3 py-3 text-[13px] text-muted">두 글자 이상 입력해 주세요.</p>
              ) : searching ? (
                <p className="px-3 py-3 text-[13px] text-muted">검색 중…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-[13px] text-muted">일치하는 동네가 없어요.</p>
              ) : (
                <ul>
                  {results.map((it) => (
                    <li key={it.admCode}>
                      <button
                        type="button"
                        onClick={() =>
                          pick({
                            dongName: it.dongName,
                            admCode: it.admCode,
                            region: it.sigungu,
                            point: { lat: it.lat, lng: it.lng },
                          })
                        }
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-label hover:bg-surface-alt"
                      >
                        {it.dongName}
                        <span className="text-[12px] font-normal text-muted">{it.sigungu}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
