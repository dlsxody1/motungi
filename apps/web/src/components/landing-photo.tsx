/**
 * 랜딩 이미지 슬롯 — next/image 기반, 최적화·블러업·아트디렉션을 한 곳에 캡슐화.
 *
 * 설계 의도(모바일 공유 대비):
 *  - 실제 사진(한강·망원시장·경의선숲길 등)은 `public/landing/`에 넣기만 하면
 *    이 컴포넌트가 그대로 최적화(next/image: AVIF/WebP·반응형 sizes·lazy)해서 붙는다.
 *  - 사진이 아직 없을 때는 `tone` 기반 그라데이션 폴백을 그려 레이아웃이 절대 비지 않는다.
 *  - 톤/비율/오버레이 규칙을 여기서만 관리 → 나중에 apps/mobile이 같은 자산·같은 규칙을
 *    RN Image로 재사용할 때 진실의 단일 소스가 된다.
 */
import Image from "next/image";
import type { CSSProperties } from "react";

/** 브랜드 톤별 폴백 그라데이션 — 사진 부재 시 카테고리 색을 은은히 깐다 */
const TONE_GRADIENT: Record<string, string> = {
  rose: "linear-gradient(150deg, #f2a06a 0%, #e25067 52%, #b0344e 116%)",
  mint: "linear-gradient(150deg, #7fc9b8 0%, #1e6e64 118%)",
  purple: "linear-gradient(150deg, #b39ad8 0%, #6e4e9c 120%)",
  dusk: "linear-gradient(160deg, #e25067 0%, #6e4e9c 130%)",
  warm: "linear-gradient(150deg, #f6d9b8 0%, #f2a06a 120%)",
};

type PhotoTone = keyof typeof TONE_GRADIENT;

export function LandingPhoto({
  src,
  alt,
  tone = "rose",
  className = "",
  imgClassName = "",
  sizes = "(min-width: 1024px) 40vw, 100vw",
  priority = false,
  /** 사진 위에 텍스트를 얹을 때 하단을 어둡게 하는 그라데이션 스크림 */
  scrim = false,
  style,
  children,
}: {
  /** public/landing/ 기준 경로. 없으면 톤 그라데이션 폴백만 렌더. */
  src?: string;
  alt: string;
  tone?: PhotoTone;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  scrim?: boolean;
  style?: CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: TONE_GRADIENT[tone], ...style }}
    >
      {src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover ${imgClassName}`}
        />
      )}
      {/* 사진 위 텍스트 가독성 스크림 — 사진이 있을 때만 의미 있으나, 폴백에서도 깊이감을 준다 */}
      {scrim && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(20,10,14,0.62) 0%, rgba(20,10,14,0.12) 46%, transparent 72%)",
          }}
        />
      )}
      {children}
    </div>
  );
}
