/**
 * 아이콘 세트 (React Native · react-native-svg).
 * 웹 icons.tsx 와 동일한 라인 스타일. color 로 stroke 지정.
 */
import Svg, { Circle, Path } from "react-native-svg";
import { C } from "./theme";

type IconProps = { size?: number; color?: string; strokeWidth?: number; fill?: string };

function base({ size = 24, strokeWidth = 2 }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function ChevronLeft(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Path d="m15 18-6-6 6-6" stroke={p.color ?? C.ink} strokeWidth={base(p).strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRight(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Path d="m9 18 6-6-6-6" stroke={p.color ?? C.ink} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronDown(p: IconProps) {
  return (
    <Svg {...base(p)}>
      <Path d="m6 9 6 6 6-6" stroke={p.color ?? C.ink} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Location(p: IconProps) {
  const c = p.color ?? C.primary;
  return (
    <Svg {...base(p)}>
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="3" stroke={c} />
    </Svg>
  );
}

export function Search(p: IconProps) {
  const c = p.color ?? C.faint;
  return (
    <Svg {...base(p)}>
      <Circle cx="11" cy="11" r="7" stroke={c} />
      <Path d="m21 21-4.3-4.3" stroke={c} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckCircle(p: IconProps) {
  const c = p.color ?? C.primary;
  return (
    <Svg {...base(p)}>
      <Circle cx="12" cy="12" r="9" stroke={c} />
      <Path d="m8.5 12 2.5 2.5 4.5-5" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Bookmark({ filled, ...p }: IconProps & { filled?: boolean }) {
  const c = p.color ?? C.primary;
  return (
    <Svg {...base(p)}>
      <Path
        d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"
        stroke={c}
        fill={filled ? c : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Share(p: IconProps) {
  const c = p.color ?? C.ink;
  return (
    <Svg {...base(p)}>
      <Path d="M12 3v12" stroke={c} strokeLinecap="round" />
      <Path d="m8 7 4-4 4 4" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Refresh(p: IconProps) {
  const c = p.color ?? C.label;
  return (
    <Svg {...base(p)}>
      <Path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 3v5h-5" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 21v-5h5" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ExternalLink(p: IconProps) {
  const c = p.color ?? C.white;
  return (
    <Svg {...base(p)}>
      <Path d="M15 3h6v6" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 14 21 3" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Home(p: IconProps) {
  const c = p.color ?? C.faint;
  return (
    <Svg {...base(p)}>
      <Path d="M3 10.5 12 3l9 7.5" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Compass(p: IconProps) {
  const c = p.color ?? C.faint;
  return (
    <Svg {...base(p)}>
      <Circle cx="12" cy="12" r="9" stroke={c} />
      <Path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function User(p: IconProps) {
  const c = p.color ?? C.faint;
  return (
    <Svg {...base(p)}>
      <Circle cx="12" cy="8" r="4" stroke={c} />
      <Path d="M4 21a8 8 0 0 1 16 0" stroke={c} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
