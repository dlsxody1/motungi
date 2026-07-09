import { ENERGY_LABEL, displayNameOf } from "@motungi/core";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { signInWithKakao, signOut } from "@/lib/auth";
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
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const metaText = energy ? `${dongName} 기준 · ${ENERGY_LABEL[energy]}` : `${dongName} 기준`;
  const displayName = displayNameOf(user);

  const login = async () => {
    setBusy(true);
    setLoginError(null);
    const { error } = await signInWithKakao();
    setBusy(false);
    if (error) setLoginError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
  };
  // 로그아웃은 되돌릴 수 있지만 결과를 명시하는 확인 다이얼로그 유지(파괴적 아님).
  const logout = () =>
    Alert.alert("로그아웃", "이 기기에서 계정 연결이 풀려요. 진행할까요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: () => void signOut() },
    ]);

  // soon 항목은 탭 불가(alert 금지) — "출시 예정" 배지로만 안내.
  const noop = () => {};
  const MENU = [
    { label: "내 동네 관리", desc: dongName, onPress: () => router.push("/location"), soon: false },
    { label: "알림 설정", desc: "새 활동 · 마감 임박 알림", onPress: noop, soon: true },
    ...(user
      ? [{ label: "로그아웃", desc: `저장 ${savedCount}개 · 계정 연결됨`, onPress: logout, soon: false }]
      : [{ label: "설정", desc: `저장 ${savedCount}개 · 로그인 안 됨`, onPress: noop, soon: true }]),
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
      {!user && (
        <Pressable
          style={[styles.kakao, busy && { opacity: 0.6 }]}
          onPress={login}
          disabled={busy}
        >
          <Text style={styles.kakaoLabel}>
            {busy ? "연결 중…" : "카카오로 로그인하고 저장 동기화"}
          </Text>
        </Pressable>
      )}
      {!user && !!loginError && (
        <Text style={styles.loginError}>{loginError}</Text>
      )}

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
  kakao: { marginTop: 12, height: 50, borderRadius: R.lg, backgroundColor: "#FEE500", alignItems: "center", justifyContent: "center" },
  kakaoLabel: { fontSize: 15, fontWeight: "700", color: "#191600" },
  loginError: { marginTop: 8, fontSize: 13, fontWeight: "500", color: C.primaryDeep },
  menu: { marginTop: 16, backgroundColor: C.surface, borderRadius: R.xl, ...cardShadow },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  menuBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  menuLabel: { fontSize: 15, fontWeight: "600", color: C.ink },
  menuDesc: { marginTop: 2, fontSize: 13, color: C.muted },
  soonBadge: { backgroundColor: C.surfaceAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  soonText: { fontSize: 11, fontWeight: "600", color: C.muted },
});
