/**
 * 활동 카드 썸네일 — 대표 이미지(imageUrl)가 있으면 그대로 보여주고,
 * 없으면 카테고리 톤의 은은한 그라데이션 플레이스홀더로 대체한다.
 *
 * 장식용 아이콘(코끼리·불꽃 등)을 카드에서 걷어낸 자리를 채운다: "이게 무슨 기능이다"를
 * 나타내지 않는 아이콘 대신, 활동 자체의 실제 이미지를 보여주는 편이 정직하다.
 * imageUrl은 외부(공공 데이터) 호스트라 next/image 최적화 대신 순수 <img>로 로드하고,
 * 로드 실패 시 플레이스홀더로 폴백한다(onError).
 */
"use client";

import { useState } from "react";

/** 카테고리 톤 → 플레이스홀더 그라데이션. report/explore의 tone 파생과 결이 같다. */
const TONE_BG: Record<string, string> = {
  brand: "linear-gradient(135deg, var(--color-tint), var(--color-primary) 220%)",
  mint: "linear-gradient(135deg, var(--color-mint-tint), var(--color-mint) 240%)",
  purple: "linear-gradient(135deg, var(--color-purple-tint), var(--color-purple) 240%)",
};

export function Thumbnail({
  src,
  tone = "brand",
  className = "",
  rounded = "rounded-xl",
  sizeClass = "size-11",
}: {
  src?: string;
  tone?: "brand" | "mint" | "purple";
  className?: string;
  /** 모서리 반경 유틸 클래스 (카드별로 다름) */
  rounded?: string;
  /** 크기 유틸 클래스 (정사각 기본, 히어로는 override) */
  sizeClass?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = !!src && !broken;

  return (
    <div
      className={`shrink-0 overflow-hidden ${rounded} ${sizeClass} ${className}`}
      style={showImage ? undefined : { background: TONE_BG[tone] ?? TONE_BG.brand }}
      aria-hidden
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 호스트 이미지, 최적화 대상 아님
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
