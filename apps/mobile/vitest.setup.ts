import { createElement, type ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * 네이티브 전용 라이브러리 전역 목업.
 * react-native-web 앨리어싱만으로는 react-native-svg(네이티브 렌더러 바인딩)와
 * react-native-safe-area-context(네이티브 insets)를 jsdom에서 렌더할 수 없어,
 * 화면 테스트 전반에서 공통으로 필요한 이 두 라이브러리만 여기서 통과용(passthrough)
 * 컴포넌트로 대체한다. 그 외 네이티브/expo 의존은 각 테스트가 개별 vi.mock으로 우회한다.
 */
function passthrough(tag: string) {
  return function Passthrough(props: { children?: ReactNode } & Record<string, unknown>) {
    return createElement(tag, props, props.children);
  };
}

vi.mock("react-native-svg", () => ({
  default: passthrough("svg"),
  Svg: passthrough("svg"),
  Circle: passthrough("circle"),
  Path: passthrough("path"),
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: passthrough("div"),
  SafeAreaProvider: passthrough("div"),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
