"use client";

import Image from "next/image";
import { memo, useId } from "react";

/**
 * 카카오 공식 로그인 버튼.
 *
 * 카카오 디자인 가이드상 버튼은 제공된 에셋 그대로 써야 한다(색·문구·비율 임의 변경 금지).
 * 그래서 라벨을 직접 그리지 않고 `kakao_login_large_wide.png`(600×90, 비율 20:3)를 쓴다.
 *
 * 접근성 이름은 이미지에 실제로 박혀 있는 문구("카카오로 시작하기")로 시작해야 한다 —
 * WCAG 2.5.3(Label in Name). 음성 제어 사용자가 보이는 대로 "카카오로 시작하기"라고
 * 말했을 때 걸려야 하므로, 임의 문구("로그인하고 저장 동기화")로 대체하지 않는다.
 * 부연 설명은 aria-describedby로 붙인다(이름이 아니라 설명으로).
 *
 * busy일 때 이미지를 문구로 갈아끼우지 않는다 — 공식 에셋을 훼손하지 않으면서
 * 진행 상태만 오버레이로 덮는다.
 */
export const KakaoLoginButton = memo(function KakaoLoginButton({
  onClick,
  busy = false,
  error,
}: {
  onClick: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  // md:hidden은 CSS라 모바일·데스크톱 트리가 둘 다 마운트된다 — 이 컴포넌트도 한 페이지에
  // 두 번 존재한다. 고정 id를 쓰면 중복 id가 되어 aria-describedby가 항상 첫 번째(모바일)
  // 문구를 가리킨다. useId로 인스턴스마다 다른 id를 만든다.
  const hintId = useId();
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label="카카오로 시작하기"
        aria-describedby={hintId}
        className="relative block h-[52px] w-full overflow-hidden rounded-lg bg-kakao transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] disabled:cursor-default"
      >
        {/*
         * 높이를 52px로 고정한다(Button lg=52px와 동일). 원본은 600×90(20:3)이라
         * w-full + h-auto로 두면 폭이 넓어질수록 높이가 같이 커져서(640px 폭 → 96px 높이)
         * 카카오 기본 버튼(50~60px)보다 훨씬 커진다.
         * object-contain이라 비율은 유지되고 좌우 여백만 bg-kakao로 메워진다.
         */}
        <Image
          src="/brand/kakao_login_large_wide.png"
          alt=""
          aria-hidden
          width={600}
          height={90}
          sizes="(min-width: 768px) 640px, 100vw"
          className="h-full w-full object-contain"
        />
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-kakao/85 text-[15px] font-bold text-[#191600]">
            연결 중…
          </span>
        )}
      </button>
      <p id={hintId} className="mt-2 text-center text-[12px] leading-[17px] text-muted">
        저장한 활동을 다른 기기에서도 그대로 볼 수 있어요.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-primary-deep">
          {error}
        </p>
      )}
    </div>
  );
});
