# Design

> 모퉁이 Corner의 시각 시스템. 단일 소스는 `@motungi/tokens`(트와일라잇 로즈 팔레트, 원티드 디자인 시스템 기반). 웹(Next.js)은 이 토큰을 `@theme` CSS 변수/Tailwind 유틸리티로, 앱(Expo/RN)은 `ui/theme.ts`의 style 객체로 참조한다. 값은 두 플랫폼 100% 동일.

## Theme

라이트 모드 전용(`color-scheme: light`). 배경은 순백이 아니라 **웜 아이보리**(`#f4f0eb`)로, 크림/샌드 AI 기본값과 달리 트와일라잇 로즈 브랜드의 웜 언더톤을 의도적으로 낮게 깐 톤. 표면(카드)만 순백(`#ffffff`)으로 띄워 위계를 만든다.

색 전략은 **Restrained**: 웜 아이보리/웜그레이 중립 위에 로즈 프라이머리를 CTA·현재 선택·강조에만 쓴다. 리포트/기회 상세 같은 단일 화면은 민트(지원금/정책)·퍼플(보조)로 **Committed**까지 올릴 수 있다.

물리적 장면: 퇴근길 지하철, 한 손, 실내 조명 아래 짧게 확인 → 밝고 따뜻하되 눈부시지 않은 라이트 UI.

## Color

OKLCH가 아니라 커밋된 hex 소스를 유지한다(브랜드 정체성 보존 우선). 값은 `packages/tokens/src/index.ts`가 정본.

### Brand

| Token | Hex | 용도 |
| --- | --- | --- |
| `primary` | `#e25067` | 메인 로즈 · 주요 CTA·강조·현재 선택 |
| `primary-deep` | `#b0344e` | hover/press · 진지한 강조 |
| `tint` | `#fbe8ec` | 연한 로즈 틴트 · 배경·칩·secondary 버튼 |
| `sun` | `#f2a06a` | 선셋 오렌지 · 히어로 그라데이션 |
| `purple` | `#6e4e9c` | 보조 강조 |
| `mint` | `#1e6e64` | 지원금/정책 강조 |
| `mint-tint` | `#e0f0ec` | 민트 배경 |

### Neutral (웜그레이, 오렌지 언더톤)

| Token | Hex | 용도 |
| --- | --- | --- |
| `bg` | `#f4f0eb` | 앱 배경(웜 아이보리) |
| `surface` | `#ffffff` | 카드/표면 |
| `surface-alt` | `#f1ede6` | 대체 표면 |
| `ink` | `#1c1a17` | 최상위 텍스트 |
| `label` | `#4a453e` | 본문 텍스트 |
| `muted` | `#8a8378` | 보조 텍스트 |
| `faint` | `#b4ada1` | 흐린 텍스트/플레이스홀더 — 본문 용도로 쓸 때 대비 재검증(AA) |
| `line` / `line-alt` | `#6e4e3c2e` / `#6e4e3c17` | 구분선(웜 반투명) |

### Semantic

`negative #ff4242` · `google #4285f4` · `kakao #fee500`. 상태색은 아이콘·라벨과 병기하고 색만으로 의미를 전달하지 않는다.

### 대비 규칙

본문은 `label`/`ink` 사용. `muted`·`faint`를 본문으로 쓸 때 웜 아이보리 배경 대비 ≥4.5:1을 확인한다. 컬러 배경 위 텍스트는 회색 대신 그 색의 진한 톤 또는 흰색.

## Typography

단일 패밀리 **Pretendard**(한글 우선, 시스템 산세리프 폴백). 디스플레이/본문 페어링 없이 한 패밀리를 두께로 운용한다.

고정 px 스케일(유동 clamp 아님 — product UI, 일정 DPI). 두께: regular 400 / medium 500 / semibold 600 / bold 700 / extrabold 800.

| 프리셋 | size/line (px) | weight | tracking |
| --- | --- | --- | --- |
| display | 30/39 | 800 | -0.02em |
| heading1 | 22/30 | 700 | -0.01em |
| heading2 | 19/27 | 700 | -0.01em |
| headline1 | 18/26 | 600 | -0.01em |
| headline2 | 17/24 | 600 | 0 |
| body1 | 15/23 | 400 | 0 |
| body2 | 14/22 | 400 | 0 |
| label | 13/18 | 500 | 0 |
| caption | 11/16 | 500 | 0.02em |

모바일(RN)은 약간 큰 대응값(display 32/40 등, `ui/theme.ts`의 `T`). 프로즈 줄길이 65–75ch.

## Spacing & Radius

8pt 그리드 간격: `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 56 · 6xl 80`.

반경: `xs 4 · sm 6 · md 8 · lg 12 · xl 16 · 2xl 24 · pill 999`. 카드·주요 버튼은 `xl`(16), 칩은 `pill`, 앱 화면 컨테이너는 28px.

## Shadows

- `card`: `0 1px 2px rgba(46,42,36,.04), 0 8px 24px rgba(46,42,36,.06)` — 표면 부양
- `hero`: `0 12px 32px rgba(176,52,78,.18)` — 로즈 히어로/CTA
- `bottomBar`: `0 -1px 0 rgba(110,78,60,.09)` — 하단 내비 경계

## Layout

**모바일 퍼스트, 앱 폭 고정.** `MobileScreen`이 폰에선 `100dvh` 꽉 채우고, 넓은 화면에선 `max-w-[420px]` 가운데 정렬 + 28px 라운드 + `card` 그림자로 앱과 동일한 레이아웃을 유지한다. 데스크톱은 별도 레이아웃이 아니라 앱 프레임의 확장.

안전영역(`SafeTop`/`SafeBottom`)은 여백만 확보하고 상태바·홈 인디케이터는 OS가 그린다. 하단 내비(`bottom-nav`)로 주요 이동. 히트타깃 ≥44px(`tap-safe`, `MIN_HIT_TARGET`).

1D는 flex, 2D는 grid. 반응형은 구조적(폭 고정·하단 내비)이지 유동 타이포가 아니다.

## Components

공용 프리미티브: web `apps/web/src/components/ui.tsx`, mobile `apps/mobile/ui/components.tsx`. 두 곳의 시각 어휘를 일치시킨다.

- **Button** — variant: `primary`(로즈 채움) / `secondary`(틴트+딥로즈) / `ghost`(투명). size: `lg`(52px, radius xl) / `md`(44px, radius lg). `active:scale-[0.99]`, disabled 40% opacity, hover는 primary-deep. 상태: default·hover·active·disabled 정의됨 — 신규 인터랙션 요소도 이 세트를 갖춘다.
- **Chip** — 34px pill, 선택형. active: 로즈 보더 + `primary/8` 배경 + 로즈 텍스트 / idle: line 보더 + surface.
- **Tag** — 22px, 카테고리 라벨. tone: brand(로즈) / mint / muted.
- **Card** — surface 배경 + radius xl + `card` 그림자. 카드는 남발하지 않고 꼭 필요한 곳에만(큐레이션 앱은 덜어내는 게 원칙). 중첩 카드 금지.
- **Logo** — 로즈 스퀘어(모) + "모퉁이 Corner" 워드마크. `onDark`로 히어로 반전.

로딩은 `corner-spinner`(0.9s linear). product UI 원칙상 콘텐츠 자리엔 스피너보다 스켈레톤을 우선한다.

## Motion

트랜지션 150–250ms, 상태 전달 위주(하단 내비 전환, 버튼 press, 칩 선택). 페이지 로드 오케스트레이션 없음 — 앱은 작업으로 바로 진입한다. `corner-spin` 외 커스텀 모션은 exponential ease-out, no bounce.

**reduced-motion 필수**: 모든 모션은 `@media (prefers-reduced-motion: reduce)` 대안(크로스페이드/즉시 전환)을 가진다. A1 온보딩 히어로 등 컬러 화면의 진입 모션도 예외 없이.

## Accessibility

WCAG AA + 모바일 최적화. 본문 대비 ≥4.5:1(플레이스홀더 포함), 큰 텍스트 ≥3:1. 히트타깃 ≥44px. 색만으로 의미 전달 금지(아이콘·라벨 병기). reduced-motion 대안 상시.
