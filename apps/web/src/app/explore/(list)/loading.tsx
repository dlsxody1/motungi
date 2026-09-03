/**
 * B1 · 탐색 로딩 경계 — 라우트 전환 중(서버 컴포넌트 로드) 잠깐 비는 화면을 막는다.
 *
 * 페이지 자체도 조회 중(isLoading)에 같은 스켈레톤을 그리지만, 그건 클라이언트
 * 컴포넌트가 이미 마운트된 뒤의 이야기다. `<Suspense fallback={null}>`이 감싸는
 * page.tsx가 하이드레이션을 마치기 전까지는 이 loading.tsx가 대신 나가서
 * 빈 화면 플래시·레이아웃 밀림(CLS)을 막는다. 헤더·검색·필터 같은 크롬은
 * 넣지 않는다 — page.tsx가 마운트되는 순간 통째로 교체되므로, 목록 자리 모양만
 * 맞으면 충분하다.
 */
import { ExploreCardSkeleton, ExploreRowSkeleton } from "@/components/explore-skeleton";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";

export default function ExploreLoading() {
  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
              <div className="mt-2" aria-busy="true" aria-live="polite">
                <span className="sr-only">활동을 불러오는 중</span>
                {Array.from({ length: 6 }, (_, i) => (
                  <ExploreRowSkeleton key={i} />
                ))}
              </div>
            </div>
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="explore" hideNeighborhood>
        <WebContainer className="py-8">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="sr-only">활동을 불러오는 중</span>
            {Array.from({ length: 6 }, (_, i) => (
              <ExploreCardSkeleton key={i} />
            ))}
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
