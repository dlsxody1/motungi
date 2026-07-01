import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/ui/components";
import { C } from "@/ui/theme";

const TEASERS = [
  { k: "마챌 세일", v: "인근샵 60초면 끝나요" },
  { k: "원픽", v: "수백 개 대신 딱 1~3개만" },
  { k: "아이어로컬", v: "내 동네 기준으로 추천돼요" },
];

/** A1 · 온보딩 — 선셋 그라데이션 히어로 */
export default function OnboardingScreen() {
  const router = useRouter();
  return (
    <LinearGradient
      colors={["#e25067", "#e05f67", "#f2a06a"]}
      locations={[0, 0.42, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.body}>
          <Logo onDark size={30} />

          <View style={{ marginTop: 56 }}>
            <Text style={styles.title}>내 동네 모퉁이에,{"\n"}기회가 있다</Text>
            <Text style={styles.sub}>
              최근 내 우리 동네에서 잡을 수 있는 기회,{"\n"}딱 1~3개만 골라드려요.
            </Text>
          </View>

          <View style={{ marginTop: 32, gap: 14 }}>
            {TEASERS.map((t) => (
              <View key={t.k} style={styles.teaser}>
                <Text style={styles.teaserK}>{t.k}</Text>
                <Text style={styles.teaserV}>{t.v}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cta} onPress={() => router.push("/location")}>
              <Text style={styles.ctaLabel}>내 동네 기회 보기</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={() => router.push("/report")}>
              <Text style={styles.ghostLabel}>로그인 없이 바로 시작</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: C.white, letterSpacing: -0.6 },
  sub: { marginTop: 16, fontSize: 15, lineHeight: 23, color: "rgba(255,255,255,0.85)" },
  teaser: { flexDirection: "row", alignItems: "baseline", gap: 12 },
  teaserK: { width: 78, fontSize: 14, fontWeight: "700", color: C.white },
  teaserV: { fontSize: 14, color: "rgba(255,255,255,0.75)" },
  actions: { marginTop: "auto", gap: 12 },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { fontSize: 16, fontWeight: "700", color: C.primaryDeep },
  ghost: { height: 44, alignItems: "center", justifyContent: "center" },
  ghostLabel: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
});
