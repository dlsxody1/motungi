"use client";

import Link from "next/link";
import { BookmarkIcon } from "@/components/icons";

/**
 * 보관함의 실패·빈 상태.
 *
 * 모바일·데스크톱이 **구조가 같고 치수와 래퍼만 다르다**(모바일은 py-12 맨바닥,
 * 데스크톱은 rounded-[18px] surface 카드). 그래서 트리를 나누지 않고 variant로 합친다 —
 * 문구가 양쪽에 복붙돼 있어서 한쪽만 고치면 조용히 갈라지는 게 실제 위험이었다.
 * (구조 자체가 다른 opportunity-detail·report는 반대로 파일을 나눴다.)
 *
 * 상태 박스는 흰 surface를 쓴다 — tint/로즈 배경은 경고처럼 읽힌다(DESIGN.md).
 */
export function SavedEmptyState({
  failed,
  onRetry,
  variant,
}: {
  /** true면 조회 실패, false면 저장한 게 없음. */
  failed: boolean;
  onRetry: () => void;
  variant: "mobile" | "desktop";
}) {
  const mobile = variant === "mobile";
  const box = mobile ? "py-12" : "rounded-[18px] bg-surface py-16 shadow-web";
  const title = mobile ? "text-[16px]" : "text-[17px]";
  const body = mobile ? "text-[13px]" : "text-[14px]";
  const cta = `tap-safe mt-3 flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-[14px] font-bold text-white${
    mobile ? "" : " hover:bg-primary-deep"
  }`;

  if (failed) {
    return (
      <div className={`flex flex-col items-center gap-2 text-center ${box}`} role="alert">
        <p className={`${title} font-bold text-ink`}>저장한 활동을 불러오지 못했어요</p>
        <p className={`${body} text-muted`}>저장한 목록은 그대로예요. 잠시 후 다시 시도해 주세요.</p>
        <button type="button" onClick={onRetry} className={cta}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 text-center ${box}`}>
      <BookmarkIcon size={mobile ? 28 : 30} className="text-faint" />
      <p className={`mt-1 ${title} font-bold text-ink`}>아직 저장한 활동이 없어요</p>
      <p className={`${body} text-muted`}>마음에 드는 활동의 북마크를 눌러 담아두세요.</p>
      <Link href="/explore" className={cta}>
        둘러보기
      </Link>
    </div>
  );
}
