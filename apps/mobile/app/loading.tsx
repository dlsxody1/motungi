import { pickTop } from "@motungi/core";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ALL_OPPORTUNITIES } from "@/data/opportunities";
import type { MockOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { Screen } from "@/ui/components";
import { C } from "@/ui/theme";

/** A4 · 로딩 — 진단 답변으로 스코어링 후 리포트로 이동 */
export default function LoadingScreen() {
  const router = useRouter();
  const answers = useAppStore((s) => s.answers);
  const anchors = useAppStore((s) => s.anchors);
  const setResults = useAppStore((s) => s.setResults);
  const dongName = anchors.home?.dongName ?? "우리 동네";

  useEffect(() => {
    // 진단 답변 기준으로 후보를 스코어링해 상위 3개를 리포트용 결과로 저장.
    // 답변이 없으면(온보딩 스킵 등) 원본 순서를 그대로 사용.
    const ranked = answers
      ? pickTop(ALL_OPPORTUNITIES, answers, anchors, 3).map((r) => {
          const opp = r.opportunity as MockOpportunity;
          return { ...opp, matchScore: Math.round(r.score * 100) };
        })
      : ALL_OPPORTUNITIES.slice(0, 3);
    setResults(ranked);

    const t = setTimeout(() => router.replace("/report"), 2400);
    return () => clearTimeout(t);
  }, [router, answers, anchors, setResults]);

  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.title}>{dongName} 기회를{"\n"}모으고 있어요</Text>
        <Text style={styles.sub}>
          문화 · 산책 · 먹거리 데이터를{"\n"}진단 결과에 맞춰보는 중
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
