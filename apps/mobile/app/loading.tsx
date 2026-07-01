import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/ui/components";
import { C } from "@/ui/theme";

/** A4 · 로딩 — 2.4초 후 리포트로 자동 이동 */
export default function LoadingScreen() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/report"), 2400);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.title}>망원동 기회를{"\n"}모으고 있어요</Text>
        <Text style={styles.sub}>
          상권 · 청년정책 · 제휴 데이터를{"\n"}도윤님 기준으로 맞춰보는 중
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  title: { marginTop: 28, fontSize: 20, lineHeight: 27, fontWeight: "800", color: C.ink, textAlign: "center" },
  sub: { marginTop: 12, fontSize: 14, lineHeight: 22, color: C.muted, textAlign: "center" },
});
