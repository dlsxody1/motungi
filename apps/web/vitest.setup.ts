/**
 * vitest 전역 셋업 — jest-dom matcher 등록 + next/navigation 기본 mock.
 * 개별 테스트 파일에서 필요시 vi.mock("next/navigation", ...)으로 재정의할 수 있다.
 */
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
