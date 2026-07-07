import type { Energy } from "@motungi/core";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { Txt } from "@/ui/components";
import { ChevronRight, Location, User } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

const ENERGY_LABEL: Record<Energy, string> = {
  drained: "방전형",
  moderate: "보통",
  active: "활동형",
};

/** D1 · 마이 (간단 버전) */
export default function MyScreen() {
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "동네 미설정";
  const energy = useAppStore((s) => s.answers?.energy);
  const savedCount = useAppStore((s) => s.savedIds.length);

  const metaText = energy ? `${dongName} 기준 · ${ENERGY_LABEL[energy]}` : `${dongName} 기준`;

  const soon = () => Alert.alert("준비 중이에요", "곧 만나요!");
  const MENU = [
    { label: "내 동네 관리", desc: dongName, onPress: () => router.push("/location") },
    { label: "알림 설정", desc: "새 기회 · 마감 임박", onPress: soon },
    { label: "설정", desc: `저장 ${savedCount}개 · 계정`, onPress: soon },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      <Txt preset="h1" style={{ fontSize: 24, paddingTop: 4 }}>마이</Txt>

      {/* 프로필 카드 */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <User size={26} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>게스트</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Location size={14} color={C.primary} />
            <Text style={styles.meta}>{metaText}</Text>
          </View>
        </View>
        <Pressable style={styles.redo} hitSlop={8} onPress={() => router.push("/diagnosis")}>
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      {/* 메뉴 */}
      <View style={styles.menu}>
        {MENU.map((m, i) => (
          <Pressable key={m.label} onPress={m.onPress} style={[styles.menuItem, i > 0 && styles.menuBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Text style={styles.menuDesc}>{m.desc}</Text>
            </View>
            <ChevronRight size={20} color={C.faint} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  profile: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: R.xl, padding: 16, ...cardShadow },
  avatar: { width: 48, height: 48, borderRadius: 999, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "700", color: C.ink },
  meta: { fontSize: 13, color: C.muted },
  redo: { minHeight: 44, borderRadius: 999, backgroundColor: C.primary, paddingHorizontal: 16, justifyContent: "center" },
  redoLabel: { fontSize: 13, fontWeight: "700", color: C.white },
  menu: { marginTop: 16, backgroundColor: C.surface, borderRadius: R.xl, ...cardShadow },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  menuBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  menuLabel: { fontSize: 15, fontWeight: "600", color: C.ink },
  menuDesc: { marginTop: 2, fontSize: 13, color: C.muted },
});
