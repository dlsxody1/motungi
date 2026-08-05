import { Skeleton } from "@/components/ui";

/**
 * 탐색 목록 로딩 자리표시자.
 *
 * 스피너가 아니라 스켈레톤인 이유: 탐색은 "목록이 뜬다"는 게 화면의 전부다.
 * 빈 화면 → 목록 팝인은 사용자에게 "없음"으로 읽히고(실제로 예전엔 아무것도 안 그렸다),
 * 도착 순간 레이아웃이 통째로 밀린다. 실제 행/카드와 같은 골격을 미리 깔아 둘 다 막는다.
 *
 * 개수는 첫 화면을 채울 만큼만 — 스크롤 밖까지 그리면 도착 후 걷어내는 비용만 는다.
 */

/** 모바일 행 스켈레톤 — ExploreRow와 같은 골격(좌: 카테고리·제목·요약 / 우: 금액·자세히). */
export function ExploreRowSkeleton() {
  return (
    <div className="flex w-full items-start gap-3 border-b border-line-alt py-4">
      <div className="flex-1">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="mt-2 h-4 w-[85%]" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="mt-2 h-3 w-10" />
      </div>
    </div>
  );
}

/** 데스크톱 카드 스켈레톤 — ExploreCard와 같은 골격(썸네일 + 태그 + 제목 + 하단 금액줄). */
export function ExploreCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[18px] bg-surface shadow-web">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="size-5 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-5 w-[90%]" />
        <Skeleton className="mt-2 h-5 w-3/5" />
        <Skeleton className="mt-2.5 h-3 w-2/5" />
        <div className="mt-3.5 flex items-end justify-between border-t border-line-alt pt-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}
