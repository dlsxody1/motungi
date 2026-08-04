/**
 * 빈 상태 · 에러 상태 공용 본문.
 *
 * report/opportunity/saved에 세 벌로 복붙돼 있던 블록을 하나로 모았다.
 * **본문만** 소유한다 — MobileScreen/DesktopShell로 감싸지 않는 이유는 페이지마다
 * 모바일·데스크톱 형제 트리 구조가 달라서, 감싸는 순간 호출부 수만큼 variant가 생기기 때문이다.
 *
 * 시각 공식은 기존 ReportEmpty를 그대로 옮겼다(치수까지 동일). text 프리셋을 쓰지 않는 건
 * 18px+extrabold 조합이 스케일에 없어서다 — 프리셋을 늘리는 대신 검증된 값을 유지한다.
 *
 * 색: 로즈는 CTA에만. 배경은 bg-bg 위에 그대로 둔다(DESIGN.md — 상태 박스에 tint 배경 금지).
 */
import type { ReactNode } from "react";

export interface ErrorStateAction {
  label: string;
  onClick: () => void;
}

export function ErrorState({
  title,
  desc,
  action,
  secondary,
  /** 에러는 스크린리더에 즉시 알린다. 404·빈 상태는 경보가 아니므로 끈다. */
  alert = false,
  children,
}: {
  title: string;
  desc: string;
  action?: ErrorStateAction;
  secondary?: ErrorStateAction;
  alert?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-8 text-center"
      {...(alert ? { role: "alert" } : {})}
    >
      <p className="text-[18px] font-extrabold text-ink md:text-[22px]">{title}</p>
      <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-muted md:text-[15px]">{desc}</p>
      {(action || secondary) && (
        <div className="mt-6 flex flex-col items-stretch gap-2.5">
          {action && (
            <button
              onClick={action.onClick}
              className="tap-safe h-11 rounded-xl bg-primary px-6 text-[14px] font-bold text-white transition-colors hover:bg-primary-deep"
            >
              {action.label}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary.onClick}
              className="tap-safe h-11 rounded-xl px-6 text-[14px] font-semibold text-label"
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
