import { LocationIcon } from "@/components/icons";
import { BottomNav } from "@/components/bottom-nav";
import { MobileScreen, SafeBottom, SafeTop, Skeleton } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";

/**
 * 리포트 로딩 자리표시자 — 원픽 히어로 + "함께 보면 좋아요" 골격.
 *
 * 이 화면은 원픽 카드 하나가 전부라 스피너를 띄우면 "무엇을 기다리는지"가 안 보인다.
 * 실제 카드와 같은 형태(썸네일 → 태그 → 제목 → 참가비 박스 → CTA)를 미리 깔아
 * 도착 순간 내용만 채워지게 한다.
 *
 * report/page.tsx(조회 중 상태)와 report/loading.tsx(라우트 전환 경계) 둘 다에서
 * 쓰므로 여기로 뽑았다. dongName은 실제 동네를 아직 모르는 loading.tsx 쪽을 위해
 * 기본값을 둔다 — page.tsx는 여전히 명시적으로 넘긴다.
 */
export function ReportSkeleton({ dongName = "우리 동네" }: { dongName?: string }) {
  const Hero = (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
      <Skeleton className="h-40 w-full rounded-none md:h-52" />
      <div className="bg-tint/40 p-5">
        <Skeleton className="h-[22px] w-28" />
        <Skeleton className="mt-3 h-6 w-[92%]" />
        <Skeleton className="mt-2 h-6 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <div className="mt-4 rounded-xl bg-tint px-4 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-7 w-32" />
        </div>
      </div>
      <div className="p-5">
        <Skeleton className="h-[50px] w-full rounded-xl" />
      </div>
    </div>
  );

  const Related = (
    <div className="mt-6 divide-y divide-line-alt">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-start gap-3 py-4">
          <Skeleton className="size-16 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-2 h-4 w-[85%]" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
          <Skeleton className="mt-1 h-4 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );

  const Body = (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">동네 리포트를 불러오는 중</span>
      <div className="flex items-center gap-1">
        <LocationIcon size={18} className="text-primary" />
        <span className="text-[18px] font-extrabold text-ink">{dongName} 기준</span>
      </div>
      <Skeleton className="mt-2 h-3.5 w-44" />
      <p className="mb-2.5 mt-5 text-[14px] font-bold text-primary">오늘의 원픽</p>
      {Hero}
      {Related}
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex-1 overflow-y-auto px-5 pb-4">{Body}</div>
            <BottomNav active="home" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>
      <DesktopShell active="report" dongName={dongName}>
        <WebContainer className="py-9">
          <div className="mx-auto max-w-[760px]">{Body}</div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
