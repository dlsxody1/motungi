import { pickTop } from "@motungi/core";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fetchOpportunities } from "@/data/opportunities";
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
    let cancelled = false;
    // 리포트용으로 관심 카테고리만·소량 받아 진단 답변으로 스코어링 → 원픽+함께(최대 6) 저장.
    // 넓은 카탈로그(탐색용)는 여기서 채우지 않는다 — explore가 useEnsureCatalog로 별도 로드.
    void (async () => {
      const { data: candidates } = await fetchOpportunities({
        categories: answers?.interests,
        limit: 30,
      });
      if (cancelled) return;
      // pickTop은 slice(0, topN)이라 후보가 적으면 그만큼만 — "나온 만큼" 렌더.
      const ranked = answers
        ? pickTop(candidates, answers, anchors, 6).map((r) => {
            return { ...r.opportunity, matchScore: Math.round(r.score * 100) };
          })
        : candidates.slice(0, 6);
      setResults(ranked);
    })();

    // 최소 로딩 시간 유지(스코어링이 더 빨라도 2.4초 후 이동).
    const t = setTimeout(() => {
      if (!cancelled) router.replace("/report");
    }, 2400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
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
