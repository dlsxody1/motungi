/**
 * 물감 여정 경로 — 3스텝을 잇는 손으로 그린 붓자국.
 *
 * 왜 이 형태인가: 이전 구현은 동일한 카드 3개 + 01/02/03 번호였다. 같은 크기 상자가
 * 반복되면 "템플릿을 채웠다"로 읽히고, 번호 라벨은 그 자체로 정보가 없다(순서는 위치가
 * 이미 말한다). 대신 실제로 이어지는 하나의 경로를 그리면 "세 걸음이면 끝난다"는
 * 메시지가 레이아웃 자체로 전달된다 — 카피가 하던 일을 형태가 한다.
 *
 * 접근성: 경로는 순수 장식(aria-hidden). 스텝 내용은 부모의 ol/li가 의미를 갖는다.
 * 모션: 스크롤로 경로가 그려진다. CSS scroll-driven only — JS 스크롤 리스너 없음.
 *       미지원·reduced-motion이면 그냥 처음부터 다 그려져 있다(콘텐츠 안 가림).
 */

export function PaintPath({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 44"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* 경로는 세 지점을 잇고 거기서 끝난다 — 마지막 걸음 뒤로 선이 흘러가면
          "아직 뭔가 더 있다"로 읽혀 세 걸음이라는 메시지가 깨진다.
          지점(h-11 블롭)은 각 열 왼쪽 정렬이므로 x도 열 왼쪽(≈22 / 411 / 800)을 지난다.
          y=22는 44px 띠의 한가운데 = 블롭의 세로 중심. */}
      {/* 밑칠 — 물감이 번진 넓은 자국 */}
      <path
        d="M22,24 C160,12 280,34 411,23 C540,12 670,33 800,22"
        stroke="var(--color-sun)"
        strokeWidth={15}
        strokeLinecap="round"
        opacity={0.26}
      />
      {/* 본선 — 스크롤에 따라 그려진다 */}
      <path
        className="paint-path-line"
        d="M22,22 C160,10 280,32 411,21 C540,10 670,31 800,20"
        stroke="var(--color-primary)"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.62}
      />
    </svg>
  );
}
