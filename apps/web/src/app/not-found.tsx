/**
 * 404 — 없는 주소에 뜨는 유일한 화면(프로덕션에는 Next 기본 페이지 대신 이게 나간다).
 *
 * 서버 컴포넌트로 둔다: 상호작용이 링크뿐이라 JS가 필요 없다.
 * ErrorState는 onClick 기반이라 여기선 쓰지 않고, 같은 시각 공식을 <Link>로 옮겼다.
 * role="alert"도 넣지 않는다 — 404는 내비게이션 결과지 경보가 아니라서 로드 시 낭독은 소음이다.
 */
import Link from "next/link";
import { DesktopShell } from "@/components/web-shell";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";

const body = (
  <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
    <h1 className="text-[18px] font-extrabold text-ink md:text-[22px]">페이지를 찾을 수 없어요</h1>
    <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-muted md:text-[15px]">
      주소가 바뀌었거나 사라진 페이지예요. 홈에서 다시 시작해보세요.
    </p>
    <div className="mt-6 flex flex-col items-stretch gap-2.5">
      <Link
        href="/"
        className="tap-safe flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-[14px] font-bold text-white transition-colors hover:bg-primary-deep"
      >
        홈으로
      </Link>
      <Link
        href="/explore"
        className="tap-safe flex h-11 items-center justify-center rounded-xl px-6 text-[14px] font-semibold text-label"
      >
        탐색 둘러보기
      </Link>
    </div>
  </div>
);

export default function NotFound() {
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
