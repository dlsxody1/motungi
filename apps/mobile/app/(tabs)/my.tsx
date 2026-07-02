import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Txt } from "@/ui/components";
import { ChevronRight, Location, User } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

const MENU = [
  { label: "내 동네 관리", desc: "망원동 외 1곳" },
  { label: "알림 설정", desc: "새 기회 · 마감 임박" },
  { label: "설정", desc: "계정 · 개인정보" },
];

/** D1 · 마이 (간단 버전) */
export default function MyScreen() {
  const router = useRouter();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      <Txt preset="h1" style={{ fontSize: 24, paddingTop: 4 }}>마이</Txt>

      {/* 프로필 카드 */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <User size={26} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>도윤님</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Location size={14} color={C.primary} />
            <Text style={styles.meta}>망원동 기준 · 활동형</Text>
          </View>
        </View>
        <Pressable style={styles.redo} hitSlop={8} onPress={() => router.push("/diagnosis")}>
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      {/* 메뉴 */}
      <View style={styles.menu}>
        {MENU.map((m, i) => (
          <Pressable key={m.label} style={[styles.menuItem, i > 0 && styles.menuBorder]}>
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
