import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, Share as RNShare, StyleSheet, Text, View } from "react-native";
import { findOpportunity, ONE_PICK } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { Screen, Tag } from "@/ui/components";
import { Bookmark, ChevronLeft, ExternalLink, Location, Share } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

/** A6 · 기회 상세 */
export default function OpportunityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const o = findOpportunity(id) ?? ONE_PICK;

  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const saved = savedIds.includes(o.id);

  const hasLink = !!o.ctaUrl && o.ctaUrl !== "#";

  const onShare = () => {
    RNShare.share({ message: `${o.title}\n모퉁이에서 발견한 우리 동네 활동` }).catch(() => {});
  };

  return (
    <Screen>
      {/* 상단 바 */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
          <ChevronLeft size={24} />
        </Pressable>
        <Pressable hitSlop={8} style={styles.iconBtn} onPress={onShare}>
          <Share size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <Tag label={o.categoryLabel} />
        <Text style={styles.title}>{o.title}</Text>
        <View style={styles.locRow}>
          <Location size={16} color={C.primary} />
          <Text style={styles.locText}>{o.location?.dongName ?? "우리 동네"}</Text>
        </View>

        {/* 참가비 카드 */}
        <View style={styles.incomeCard}>
          <Text style={styles.incomeCap}>참가비</Text>
          <Text style={styles.incomeVal}>
            {o.costLabel} <Text style={styles.incomeUnit}>/ 1인</Text>
          </Text>
          {!!o.costNote && (
            <>
              <View style={styles.incomeLine} />
              <Text style={styles.incomeSub}>{o.costNote}</Text>
            </>
          )}
        </View>

        {/* 메타 3칸 */}
        <View style={styles.metaRow}>
          {o.meta.map((m) => (
            <View key={m.label} style={styles.metaCard}>
              <Text style={styles.metaLabel}>{m.label}</Text>
              <Text style={styles.metaValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* 즐기는 방법 */}
        <Text style={styles.sectionTitle}>즐기는 방법</Text>
        <View style={{ gap: 16 }}>
          {o.steps?.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          보러 가기를 누르면 주최·출처 채널로 이동해요. 모퉁이는 공공·제휴 정보를 모아 소개할 뿐,
          예약·주최 당사자가 아니에요.
        </Text>
      </ScrollView>

      {/* 하단 액션 */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.bookmark, saved && styles.bookmarkOn]}
          onPress={() => toggleSaved(o.id)}
          hitSlop={8}
        >
          <Bookmark size={22} filled={saved} color={saved ? C.primary : C.label} />
        </Pressable>
        <Pressable
          style={[styles.startBtn, !hasLink && styles.startBtnDisabled]}
          onPress={() => hasLink && Linking.openURL(o.ctaUrl!)}
          disabled={!hasLink}
        >
          <Text style={styles.startLabel}>{hasLink ? "보러 가기" : "링크 준비 중"}</Text>
          {hasLink && <ExternalLink size={18} color={C.white} />}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, justifyContent: "center" },
  title: { marginTop: 12, fontSize: 23, lineHeight: 30, fontWeight: "800", color: C.ink },
  locRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  locText: { fontSize: 14, color: C.muted },
  incomeCard: { marginTop: 16, backgroundColor: "rgba(251,232,236,0.6)", borderRadius: R.lg, padding: 16 },
  incomeCap: { fontSize: 12, fontWeight: "600", color: C.primaryDeep },
  incomeVal: { fontSize: 30, fontWeight: "800", color: C.primaryDeep },
  incomeUnit: { fontSize: 15, fontWeight: "700", color: C.muted },
  incomeLine: { marginTop: 8, height: 1, backgroundColor: "rgba(226,80,103,0.15)" },
  incomeSub: { marginTop: 8, fontSize: 13, color: C.muted },
  metaRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  metaCard: { flex: 1, backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: 12, alignItems: "center", ...cardShadow },
  metaLabel: { fontSize: 11, color: C.muted },
  metaValue: { marginTop: 4, fontSize: 15, fontWeight: "700", color: C.ink },
  sectionTitle: { marginTop: 24, marginBottom: 12, fontSize: 17, fontWeight: "700", color: C.ink },
  step: { flexDirection: "row", gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 999, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 12, fontWeight: "700", color: C.white },
  stepText: { flex: 1, fontSize: 14, lineHeight: 22, color: C.label },
  disclaimer: { marginTop: 24, backgroundColor: C.surfaceAlt, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 12, lineHeight: 18, color: C.muted },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  bookmark: { width: 52, height: 52, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  bookmarkOn: { borderColor: C.primary, backgroundColor: C.tint },
  startBtn: { flex: 1, height: 52, borderRadius: R.lg, backgroundColor: C.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  startBtnDisabled: { backgroundColor: C.faint },
  startLabel: { fontSize: 16, fontWeight: "700", color: C.white },
});
