"use client";

import { memo } from "react";
import { ChevronRightIcon } from "@/components/icons";

export interface MenuItem {
  label: string;
  desc: string;
  onClick: () => void;
  soon?: boolean;
}

/**
 * 마이 화면 메뉴 목록.
 *
 * memo인 이유: 이 목록은 로그인 진행 상태(`busy`)나 에러 문구(`loginError`)와 아무
 * 상관이 없는데, 예전엔 page 안에 JSX 상수로 있어서 로그인 버튼을 누르는 것만으로도
 * 다시 그려졌다. `md:hidden`은 CSS라 모바일·데스크톱 트리에서 각각 돌았다.
 *
 * items는 호출부에서 useMemo로 고정해야 memo가 실제로 걸린다.
 */
export const MyMenuList = memo(function MyMenuList({ items }: { items: MenuItem[] }) {
  return (
    <div className="divide-y divide-line-alt rounded-xl bg-surface shadow-card">
      {items.map((m) => (
        <button
          key={m.label}
          onClick={m.onClick}
          disabled={m.soon}
          aria-disabled={m.soon}
          className="flex w-full items-center gap-3 p-4 text-left disabled:cursor-default"
        >
          <span className="flex-1">
            <span className={`block text-[15px] font-semibold ${m.soon ? "text-muted" : "text-ink"}`}>
              {m.label}
            </span>
            <span className="block text-[13px] text-muted">{m.desc}</span>
          </span>
          {m.soon ? (
            <span className="rounded-pill bg-bg px-2.5 py-1 text-[11px] font-semibold text-muted">
              출시 예정
            </span>
          ) : (
            <ChevronRightIcon size={20} className="text-faint" />
          )}
        </button>
      ))}
    </div>
  );
});
