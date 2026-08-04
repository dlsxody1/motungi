/**
 * vitest 전역 셋업 — jest-dom matcher 등록 + next/navigation 기본 mock.
 * 개별 테스트 파일에서 필요시 vi.mock("next/navigation", ...)으로 재정의할 수 있다.
 */
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * jsdom은 레이아웃 엔진이 없어 ResizeObserver가 없고 getBoundingClientRect가 전부 0을 반환한다.
 * 그대로 두면 가상화(@tanstack/react-virtual)가 뷰포트를 0px로 보고 **아무 행도 렌더하지 않아**
 * 탐색 페이지 테스트가 전부 깨진다. 그래서 테스트 환경에서만 최소한의 기하를 흉내낸다.
 *
 * 주의: 전역 스텁이라 이후 레이아웃 의존 테스트는 실제와 다른 기하를 보게 된다.
 * 픽셀 단위 위치를 단언하지 말고 "무엇이 렌더됐는지"만 단언할 것.
 */
// react-virtual은 ResizeObserver 콜백으로 뷰포트 크기를 받는다. 아무것도 통지하지 않는
// no-op 스텁이면 뷰포트를 0으로 보고 getVirtualItems()가 항상 빈 배열이 된다 —
// 그래서 observe 즉시 고정 크기를 한 번 통지한다.
class ResizeObserverStub {
  constructor(private cb: ResizeObserverCallback) {}
  observe(target: Element) {
    this.cb(
      [{ target, contentRect: { width: 1200, height: 800 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom엔 matchMedia가 없다. 탐색 그리드가 열 수(1/2/3)를 물어보므로 최소 구현을 둔다.
// 항상 미매치 → 테스트에선 1열로 렌더된다(단일 컬럼 = 단언하기 쉬운 상태).
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

// react-virtual은 스크롤 요소 크기를 offsetWidth/offsetHeight로 잰다(virtual-core index.js:15).
// jsdom은 둘 다 0이라 뷰포트를 0으로 보고 getVirtualItems()가 항상 빈 배열이 된다.
// 여기서만 크기가 있는 것처럼 흉내내 "보이는 범위"가 계산되게 한다.
for (const [prop, value] of [
  ["offsetHeight", 800],
  ["offsetWidth", 1200],
  ["clientHeight", 800],
  ["clientWidth", 1200],
] as const) {
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get: () => value,
  });
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
