import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Tag, Txt } from "@/ui/components";
import { Location, Refresh } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";
import { ONE_PICK, RELATED } from "@/data/opportunities";

/** A5 · 동네 리포트 (원픽 히어로) */
export default function ReportScreen() {
  const router = useRouter();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Location size={18} color={C.primary} />
            <Text style={styles.hTitle}>망원동 기준</Text>
          </View>
          <Txt preset="label" color={C.muted} style={{ marginTop: 2, fontWeight: "400" }}>
            도윤님 맞는 기회 3개예요
          </Txt>
        </View>
        <Pressable style={styles.redo} hitSlop={8} onPress={() => router.push("/diagnosis")}>
          <Refresh size={15} color={C.label} />
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      {/* 오늘의 원픽 */}
      <Txt preset="label" color={C.primary} style={{ marginTop: 20, marginBottom: 10, fontWeight: "700" }}>
        오늘의 원픽
      </Txt>

      <Pressable style={styles.hero} onPress={() => router.push("/opportunity")}>
        <View style={styles.heroBody}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Tag label={ONE_PICK.categoryLabel} />
            <Text style={styles.match}>매칭 {ONE_PICK.matchScore}%</Text>
          </View>
          <Text style={styles.heroTitle}>주말 오전, 동네 카페{"\n"}오픈 바리스타 파트</Text>
          <Text style={styles.heroSummary}>
            망원동은 카페 밀도 <Text style={{ color: C.primaryDeep, fontWeight: "700" }}>상위 5%</Text>.
            방전형인 도윤님께 맞는 주말 오전 단타임 수요가 많아요.
          </Text>

          <View style={styles.incomeBox}>
            <View>
              <Text style={styles.incomeCap}>예상 월 수입</Text>
              <Text style={styles.incomeVal}>{ONE_PICK.incomeLabel}</Text>
            </View>
            <Text style={styles.incomeNote}>한 달이면{"\n"}에어팟 프로 2개</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={styles.heroCta}>
            <Text style={styles.heroCtaLabel}>자세히 보고 시작하기</Text>
          </View>
        </View>
      </Pressable>

      {/* 함께 보면 좋아요 */}
      <Txt preset="headline" style={{ marginTop: 24, marginBottom: 4 }}>함께 보면 좋아요</Txt>
      <View>
        {RELATED.map((o, i) => (
          <Pressable
            key={o.id}
            onPress={() => router.push("/opportunity")}
            style={[styles.relItem, i > 0 && styles.relBorder]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.relCat, { color: o.tone === "mint" ? C.mint : C.primary }]}>
                {o.categoryLabel}
              </Text>
              <Text style={styles.relTitle}>{o.title}</Text>
              <Text style={styles.relSummary}>{o.summary}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.relIncome, { color: o.tone === "mint" ? C.mint : C.primary }]}>
                {o.incomeLabel}
              </Text>
              <Text style={styles.relMore}>자세히 →</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* 합산 배너 */}
      <View style={styles.sumBanner}>
        <View>
          <Text style={styles.sumTitle}>이거 다 하면 1년에 얼마?</Text>
          <Text style={styles.sumSub}>정책+부업+딜 합산 시뮬</Text>
        </View>
        <View style={styles.sumPill}>
          <Text style={styles.sumPillLabel}>곧 공개</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 },
  hTitle: { fontSize: 18, fontWeight: "800", color: C.ink },
  redo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
  },
  redoLabel: { fontSize: 13, fontWeight: "600", color: C.label },
  hero: {
    borderRadius: R["2xl"],
    borderWidth: 1,
    borderColor: "rgba(226,80,103,0.25)",
    backgroundColor: C.surface,
    overflow: "hidden",
    ...cardShadow,
  },
  heroBody: { backgroundColor: "rgba(251,232,236,0.5)", padding: 20 },
  match: { fontSize: 13, fontWeight: "700", color: C.primary },
  heroTitle: { marginTop: 12, fontSize: 21, lineHeight: 28, fontWeight: "800", color: C.ink },
  heroSummary: { marginTop: 10, fontSize: 14, lineHeight: 22, color: C.label },
  incomeBox: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: C.tint,
    borderRadius: R.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  incomeCap: { fontSize: 12, fontWeight: "600", color: C.primaryDeep },
  incomeVal: { fontSize: 26, fontWeight: "800", color: C.primaryDeep },
  incomeNote: { textAlign: "right", fontSize: 12, lineHeight: 16, color: C.muted },
  heroCta: { height: 50, borderRadius: R.lg, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  heroCtaLabel: { fontSize: 16, fontWeight: "700", color: C.white },
  relItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 16 },
  relBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  relCat: { fontSize: 12, fontWeight: "700" },
  relTitle: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  relSummary: { marginTop: 2, fontSize: 13, color: C.muted },
  relIncome: { fontSize: 16, fontWeight: "800" },
  relMore: { fontSize: 12, color: C.muted },
  sumBanner: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
    borderRadius: R.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sumTitle: { fontSize: 14, fontWeight: "700", color: C.ink },
  sumSub: { fontSize: 12, color: C.muted },
  sumPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sumPillLabel: { fontSize: 12, fontWeight: "600", color: C.muted },
});
