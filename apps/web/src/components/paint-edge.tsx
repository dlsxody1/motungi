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
  /**
   * 종이 결을 얹을지. 맞닿는 섹션이 .paint-paper면 true —
   * 결이 있는 면과 없는 물결이 만나면 그 차이가 곧 경계선으로 보인다.
   */
  grain = false,
  className = "",
}: {
  color: string;
  direction?: "up" | "down";
  grain?: boolean;
  className?: string;
}) {
  // id는 direction으로 충분하다 — 결의 내용이 방향별로 하나뿐이라 같은 방향끼리는 공유해도 된다.
  // (전역 카운터나 useId는 SSR에서 값이 어긋날 위험만 늘리고 여기선 얻는 게 없다.)
  const uid = `paint-edge-${direction}`;
  return (
    <svg
      className={`paint-edge ${className}`}
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <path d={PATHS[direction]} fill={color} />
      {grain && (
        <>
          {/* 결을 물결 모양으로 잘라낸다 — 물결 밖(=맞은편 섹션)까지 덮으면 안 된다. */}
          <clipPath id={`${uid}c`}>
            <path d={PATHS[direction]} />
          </clipPath>
          <filter id={`${uid}f`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={4} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <g clipPath={`url(#${uid}c)`}>
            <rect
              className="paint-edge-grain"
              width="1440"
              height="80"
              filter={`url(#${uid}f)`}
              opacity={0.11}
            />
          </g>
        </>
      )}
    </svg>
  );
}
