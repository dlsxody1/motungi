import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Txt } from "@/ui/components";
import { Bookmark, Location, User } from "@/ui/icons";
import { C, R } from "@/ui/theme";

const SAVED = [
  {
    id: "cafe-barista",
    categoryLabel: "동네 기반 부업",
    title: "주말 오전 카페 바리스타 파트",
    meta: "망원동 · 도보 8분",
    income: "+48만/월",
    tone: "brand" as const,
  },
  {
    id: "youth-rent",
    categoryLabel: "내게 맞는 지원금",
    title: "청년 월세 한시 특별지원",
    meta: "마포구 · 만 19~34세",
    income: "연 240만",
    tone: "mint" as const,
  },
];

/** A7 · 보관함 / 홈 */
export default function SavedScreen() {
  const router = useRouter();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Txt preset="h1" style={{ fontSize: 22 }}>도윤님, 안녕하세요</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Location size={15} color={C.primary} />
            <Text style={styles.sub}>망원동 기준</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <User size={22} color={C.muted} />
        </View>
      </View>

      {/* 재진단 배너 */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>이번 주 동네 기회 다시 보기</Text>
          <Text style={styles.bannerSub}>상황이 바뀌었나요? 60초면 재진단해요.</Text>
        </View>
        <Pressable style={styles.redo} hitSlop={8} onPress={() => router.push("/diagnosis")}>
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      {/* 저장한 기회 */}
      <View style={styles.savedHead}>
        <Txt preset="headline">저장한 기회</Txt>
        <Text style={styles.count}>{SAVED.length}개</Text>
      </View>

      <View>
        {SAVED.map((s, i) => (
          <Pressable
            key={s.id}
            onPress={() => router.push("/opportunity")}
            style={[styles.item, i > 0 && styles.itemBorder]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cat, { color: s.tone === "mint" ? C.mint : C.primary }]}>
                {s.categoryLabel}
              </Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.meta}>{s.meta}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={[styles.income, { color: s.tone === "mint" ? C.mint : C.primary }]}>
                {s.income}
              </Text>
              <Bookmark size={20} filled color={C.primary} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 },
  sub: { fontSize: 14, color: C.muted },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  banner: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(251,232,236,0.6)",
    borderRadius: R.xl,
    padding: 16,
  },
  bannerTitle: { fontSize: 15, fontWeight: "700", color: C.ink },
  bannerSub: { marginTop: 2, fontSize: 13, color: C.muted },
  redo: { minHeight: 44, borderRadius: 999, backgroundColor: C.primary, paddingHorizontal: 16, justifyContent: "center" },
  redoLabel: { fontSize: 14, fontWeight: "700", color: C.white },
  savedHead: { marginTop: 24, marginBottom: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  count: { fontSize: 13, color: C.muted },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 16 },
  itemBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  cat: { fontSize: 12, fontWeight: "700" },
  title: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  meta: { marginTop: 2, fontSize: 13, color: C.muted },
  income: { fontSize: 15, fontWeight: "800" },
});
