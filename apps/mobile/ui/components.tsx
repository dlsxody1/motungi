/**
 * 모퉁이 Corner — 모바일 공용 UI 프리미티브 (React Native).
 * 웹의 ui.tsx 와 동일 역할. 스타일은 StyleSheet + 공용 토큰(theme.ts).
 */
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, R, S, T, cardShadow } from "./theme";

/** 화면 컨테이너 — SafeArea + 배경. tone 으로 배경색 지정. */
export function Screen({
  children,
  tone = "bg",
  edges = ["top", "bottom"],
}: {
  children: ReactNode;
  tone?: "bg" | "surface";
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tone === "surface" ? C.surface : C.bg }}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

/** 기본 버튼 */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === "primary" ? C.primary : variant === "secondary" ? C.tint : "transparent";
  const fg =
    variant === "primary" ? C.white : variant === "secondary" ? C.primaryDeep : C.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.88 : 1 },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** 칩 (선택 가능) */
export function Chip({
  label,
  active,
  onPress,
  leading,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  leading?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[
        styles.chip,
        active
          ? { borderColor: C.primary, backgroundColor: C.primary }
          : { borderColor: C.line, backgroundColor: C.surface },
      ]}
    >
      {leading}
      <Text style={[styles.chipLabel, { color: active ? C.white : C.label }]}>{label}</Text>
    </Pressable>
  );
}

/** 카테고리 태그 */
export function Tag({ label, tone = "brand" }: { label: string; tone?: "brand" | "mint" | "muted" }) {
  const bg = tone === "brand" ? C.primary : tone === "mint" ? C.mint : C.surfaceAlt;
  const fg = tone === "muted" ? C.muted : C.white;
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** 카드 표면 */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** 로고 */
export function Logo({ onDark = false, size = 28 }: { onDark?: boolean; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: R.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: onDark ? C.white : C.primary,
        }}
      >
        <Text style={{ color: onDark ? C.primary : C.white, fontWeight: "900", fontSize: size * 0.5 }}>
          모
        </Text>
      </View>
      <Text style={{ fontSize: 17, fontWeight: "800", color: onDark ? C.white : C.ink }}>
        모퉁이 <Text style={{ fontWeight: "600", opacity: 0.7 }}>Corner</Text>
      </Text>
    </View>
  );
}

/** 재사용 텍스트 헬퍼 — 타이포 프리셋 적용 */
export function Txt({
  preset = "body",
  color = C.ink,
  style,
  children,
}: {
  preset?: keyof typeof T;
  color?: string;
  style?: TextStyle;
  children: ReactNode;
}) {
  return <Text style={[T[preset], { color }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: R.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: S.xl,
  },
  btnLabel: { fontSize: 16, fontWeight: "700" },
  chip: {
    height: 34,
    borderRadius: R.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipLabel: { fontSize: 13, fontWeight: "600" },
  tag: {
    height: 22,
    borderRadius: R.sm,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  tagLabel: { fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    ...cardShadow,
  },
});
