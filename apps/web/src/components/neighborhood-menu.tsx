"use client";

import { POPULAR_NEIGHBORHOODS } from "@motungi/core";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { CheckIcon, ChevronDownIcon, LocationIcon } from "@/components/icons";
import { useAppStore } from "@/store/useAppStore";

/**
 * 동네 전환 드롭다운. pill을 누르면 인기 동네를 바로 골라 집 앵커를 갱신한다.
 * native <dialog>는 top layer에 렌더돼 overflow:hidden 컨테이너 클리핑·z-index 경합이
 * 원천적으로 없다(포탈/position:fixed 수동 관리 불필요). ESC·백드롭 닫기도 native.
 * 동네 검색 자체는 재구현하지 않고 기존 /location 플로우로 위임한다.
 */
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

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-label="동네 변경"
      >
        <LocationIcon size={16} className="text-faint" />
        {dongLabel}
        <ChevronDownIcon size={16} className="text-faint" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="동네 선택"
        onClick={(e) => {
          // 백드롭(=dialog 자신) 클릭 시 닫기. 내부 컨텐츠 클릭은 통과.
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-surface p-2 shadow-web backdrop:bg-ink/30"
      >
        <p className="px-3 pb-1 pt-2 text-[12px] font-semibold text-muted">동네 선택</p>
        <ul>
          {POPULAR_NEIGHBORHOODS.map((n) => {
            const active = currentDong === n.dongName;
            return (
              <li key={n.dongName}>
                <button
                  type="button"
                  onClick={() => {
                    setAnchor("home", {
                      dongName: n.dongName,
                      admCode: n.admCode,
                      point: n.point,
                    });
                    close();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] ${
                    active ? "bg-tint font-bold text-primary-deep" : "font-medium text-label hover:bg-bg"
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
            close();
            router.push("/location");
          }}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] font-semibold text-label hover:bg-bg"
        >
          다른 동네 검색
          <span aria-hidden className="text-faint">→</span>
        </button>
      </dialog>
    </>
  );
}
