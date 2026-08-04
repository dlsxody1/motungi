"use client";

/**
 * 라우트 에러 경계 — 페이지 렌더 중 던져진 예외를 여기서 받는다.
 *
 * 프로덕션에는 dev 오버레이가 없다. 이 파일이 없으면 사용자는 흰 화면을 본다.
 * 라우트가 전부 평면(동적 세그먼트 없음)이고 레이아웃이 루트 하나뿐이라 여기 하나면 전부 덮는다.
 *
 * 레이아웃(<body>의 AuthBoot·KakaoSDK·WebVitals)이 던지는 경우는 이 경계 **밖**이라
 * 못 잡는다 — 그건 global-error.tsx가 받는다.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/error-state";
import { DesktopShell } from "@/components/web-shell";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { reportError } from "@/lib/api-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError("app/error", error);
  }, [error]);

  const router = useRouter();

  // 라우터 push보다 reset()이 싸다 — 같은 라우트를 다시 렌더할 뿐 이동하지 않는다.
  const body = (
    <ErrorState
      alert
      title="문제가 생겼어요"
      desc="잠시 후 다시 시도해 주세요. 계속 이러면 잠깐 뒤에 다시 들러주세요."
      action={{ label: "다시 시도", onClick: reset }}
      secondary={{ label: "홈으로", onClick: () => router.push("/") }}
    />
  );

  return (
    <>
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            {body}
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>
      <DesktopShell>
        <div className="flex min-h-[60vh] flex-col">{body}</div>
      </DesktopShell>
    </>
  );
}
