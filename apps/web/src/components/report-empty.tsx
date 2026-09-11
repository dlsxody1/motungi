"use client";

import { BottomNav } from "@/components/bottom-nav";
import { ErrorState } from "@/components/error-state";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell } from "@/components/web-shell";

/**
 * 카탈로그가 비었을 때(로드 실패·빈결과·미진단)의 리포트 상태 화면.
 *
 * 본문 트리와 달리 여기는 양쪽이 같은 `ErrorState` 하나를 감싸기만 해서
 * 래퍼만 다르다 — 파일을 나눌 이유가 없어 한 컴포넌트에 둔다.
 */
export function ReportEmpty({
  status,
  onRetry,
  onExplore,
}: {
  status: string;
  onRetry: () => void;
  onExplore: () => void;
}) {
  const isError = status === "error" || status === "unconfigured";
  const title = isError ? "활동을 불러오지 못했어요" : "아직 추천할 활동이 없어요";
  const desc = isError
    ? "잠시 후 다시 시도하거나, 60초 진단으로 원픽을 받아보세요."
    : "60초 진단을 하면 우리 동네 원픽을 골라드려요.";

  const Body = (
    <ErrorState
      // 빈 결과는 경보가 아니다 — 실패일 때만 스크린리더에 즉시 알린다.
      alert={isError}
      title={title}
      desc={desc}
      action={{ label: isError ? "다시 시도" : "60초 진단하기", onClick: onRetry }}
      secondary={{ label: "탐색 둘러보기", onClick: onExplore }}
    />
  );

  return (
    <>
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            {Body}
            <SafeBottom />
            <BottomNav active="home" />
          </div>
        </MobileScreen>
      </div>
      <DesktopShell active="report">
        <div className="flex min-h-[60vh] flex-col">{Body}</div>
      </DesktopShell>
    </>
  );
}
