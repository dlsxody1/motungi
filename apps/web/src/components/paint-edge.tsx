/**
 * 섹션 경계 붓자국 — 두 색면 사이를 직선이 아니라 물감이 칠해진 자국으로 나눈다.
 *
 * 왜 필요한가: 랜딩이 "AI가 짠 것 같다"고 읽히는 큰 이유 하나가 섹션마다 딱 떨어지는
 * 수평 경계다. 블록을 위에서 아래로 쌓았다는 게 그대로 보인다. 실제 디자이너가 만든
 * 페이지는 색면이 서로 침범한다. 그 침범을 여기서 담당한다.
 *
 * 구현: SVG path 하나. 이미지 자산이 아니라 벡터라 어떤 폭에서도 안 깨지고
 * 색은 부모가 넘긴 토큰을 그대로 쓴다(하드코딩 없음).
 *
 * 접근성: 순수 장식이므로 aria-hidden. 스크린리더는 섹션 제목으로 경계를 안다.
 */

/** 붓자국 형태 — 위/아래 어느 쪽을 칠할지에 따라 두 벌. */
const PATHS = {
  /* 아래 색면이 위로 번져 올라간 자국 */
  up: "M0,60 C120,18 240,4 380,22 C520,40 610,72 760,60 C900,49 1010,10 1160,26 C1290,40 1380,64 1440,52 L1440,80 L0,80 Z",
  /* 위 색면이 아래로 흘러내린 자국 */
  down:
    "M0,20 C130,52 250,66 400,52 C540,39 640,8 790,20 C930,31 1040,68 1190,56 C1310,46 1390,16 1440,28 L1440,0 L0,0 Z",
} as const;

export function PaintEdge({
  /** 칠할 색. CSS 색 문자열 또는 var(--color-*) */
  color,
  /** 번지는 방향. up = 아래 섹션 색이 위로, down = 위 섹션 색이 아래로 */
  direction = "up",
  className = "",
}: {
  color: string;
  direction?: "up" | "down";
  className?: string;
}) {
  return (
    <svg
      className={`paint-edge ${className}`}
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <path d={PATHS[direction]} fill={color} />
    </svg>
  );
}
