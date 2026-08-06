import { ENERGY_LABEL, displayNameOf } from "@motungi/core";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { signOut } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";
import { Txt } from "@/ui/components";
import { ChevronRight, Location, User } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

/** D1 · 마이 (간단 버전) */
export default function MyScreen() {
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "동네 미설정";
  const energy = useAppStore((s) => s.answers?.energy);
  const savedCount = useAppStore((s) => s.savedIds.length);
  const user = useAppStore((s) => s.user);

  const metaText = energy ? `${dongName} 기준 · ${ENERGY_LABEL[energy]}` : `${dongName} 기준`;
  const displayName = displayNameOf(user);

  // 로그아웃은 되돌릴 수 있지만 결과를 명시하는 확인 다이얼로그 유지(파괴적 아님).
  const logout = () =>
    Alert.alert("로그아웃", "이 기기에서 계정 연결이 풀려요. 진행할까요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: () => void signOut() },
    ]);

  // soon 항목은 탭 불가(alert 금지) — "출시 예정" 배지로만 안내.
  const noop = () => {};
  // 보관함은 하단 탭에도 있지만, 저장 개수가 "설정 · 저장 N개" 라는 비활성 메뉴에만
  // 붙어 있어 숫자를 봐도 갈 데가 없었다. 개수를 실제 진입점에 붙인다(웹과 동일).
  const MENU = [
    // 로그인은 전용 화면(/login)이 받는다 — 예전엔 이 화면 한복판에 노란 카카오 버튼이
    // 박혀 있어 메뉴 사이에 낀 배너였고, 왜 로그인하는지 설명할 자리가 없었다.
    ...(user
      ? []
      : [
          {
            label: "로그인",
            desc: "저장한 활동을 다른 기기에서도 이어보기",
            onPress: () => router.push("/login"),
            soon: false,
          },
        ]),
    {
      label: "보관함",
      desc: savedCount > 0 ? `저장한 활동 ${savedCount}개` : "마음에 드는 활동을 저장해 두세요",
      onPress: () => router.push("/saved"),
      soon: false,
    },
    { label: "내 동네 관리", desc: dongName, onPress: () => router.push("/location"), soon: false },
    { label: "알림 설정", desc: "새 활동 · 마감 임박 알림", onPress: noop, soon: true },
    ...(user
      ? [{ label: "로그아웃", desc: "이 기기에서 계정 연결 해제", onPress: logout, soon: false }]
      : []),
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
          <Text style={styles.name}>{displayName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Location size={14} color={C.primary} />
            <Text style={styles.meta}>{metaText}</Text>
          </View>
        </View>
        <Pressable style={styles.redo} hitSlop={8} onPress={() => router.push("/diagnosis")}>
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      {/* 카카오 로그인 (비로그인 시) */}

      {/* 메뉴 */}
      <View style={styles.menu}>
        {MENU.map((m, i) => (
          <Pressable
            key={m.label}
            onPress={m.onPress}
            disabled={m.soon}
            accessibilityState={{ disabled: m.soon }}
            style={[styles.menuItem, i > 0 && styles.menuBorder]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, m.soon && { color: C.muted }]}>{m.label}</Text>
              <Text style={styles.menuDesc}>{m.desc}</Text>
            </View>
            {m.soon ? (
              <View style={styles.soonBadge}>
                <Text style={styles.soonText}>출시 예정</Text>
              </View>
            ) : (
              <ChevronRight size={20} color={C.faint} />
            )}
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
  soonBadge: { backgroundColor: C.gray100, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  soonText: { fontSize: 11, fontWeight: "600", color: C.muted },
});
