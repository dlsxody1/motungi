/**
 * 상세 본문이 없을 때의 화면 두 가지 — 로딩 / 못 찾음.
 * 본문(opportunity-detail-mobile/-desktop)과 성격이 달라 한 파일로 묶었다.
 */
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui";

/**
 * 카탈로그를 아직 불러오는 중(카드에서 직접 진입 등)일 때의 로딩 화면.
 *
 * 가운데 스피너에서 스켈레톤으로 바꿨다. 스피너는 "기다려라"만 말하고 화면이 빈 채로 있다가
 * 도착 순간 전체가 튀어나온다. 상세는 골격(배너 → 태그 → 제목 → 위치 → 본문 → CTA)이
 * 고정이라 미리 깔아둘 수 있고, 그러면 내용만 채워진다.
 */
export function OpportunityLoading() {
  return (
    <div className="flex flex-1 flex-col px-5 pb-4 md:px-0" aria-live="polite" aria-busy="true">
      <span className="sr-only">활동을 불러오는 중</span>
      <Skeleton className="mb-4 aspect-[16/9] w-full rounded-2xl" />
      <Skeleton className="h-[22px] w-24" />
      <Skeleton className="mt-3 h-7 w-[90%]" />
      <Skeleton className="mt-2 h-7 w-2/3" />
      <Skeleton className="mt-3 h-4 w-32" />
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-[88%]" />
      <Skeleton className="mt-2 h-3.5 w-3/5" />
      <Skeleton className="mt-6 h-[52px] w-full rounded-xl" />
    </div>
  );
}

/** 활동을 찾을 수 없을 때(카탈로그 비었거나 id 불일치)의 상태 화면. */
export function OpportunityNotFound({ onExplore }: { onExplore: () => void }) {
  return (
    <ErrorState
      title="활동을 찾을 수 없어요"
      desc="이 활동이 사라졌거나 아직 불러오지 못했어요. 탐색에서 다른 활동을 둘러보세요."
      action={{ label: "탐색 둘러보기", onClick: onExplore }}
    />
  );
}
