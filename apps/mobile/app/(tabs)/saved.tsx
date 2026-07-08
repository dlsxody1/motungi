import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { findOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";
import { Txt } from "@/ui/components";
import { Bookmark, Location, User } from "@/ui/icons";
import { C, R } from "@/ui/theme";

/** A7 · 보관함 / 홈 */
export default function SavedScreen() {
  const router = useRouter();
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";

  const catalog = useAppStore((s) => s.catalog);
  const items = savedIds
    .map((id) => catalog.find((o) => o.id === id) ?? findOpportunity(id))
    .filter((o): o is NonNullable<typeof o> => !!o);
  const openDetail = (id: string) => router.push({ pathname: "/opportunity", params: { id } });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Txt preset="h1" style={{ fontSize: 22 }}>보관함</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Location size={15} color={C.primary} />
            <Text style={styles.sub}>{dongName} 기준</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <User size={22} color={C.muted} />
        </View>
      </View>

      {/* 재진단 배너 */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>이번 주 동네 다시 보기</Text>
          <Text style={styles.bannerSub}>상황이 바뀌었나요? 60초면 재진단해요.</Text>
        </View>
        <Pressable style={styles.redo} hitSlop={8} onPress={() => router.push("/diagnosis")}>
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      {/* 저장한 활동 */}
      <View style={styles.savedHead}>
        <Txt preset="headline">저장한 활동</Txt>
        <Text style={styles.count}>{items.length}개</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Bookmark size={28} color={C.faint} />
          <Text style={styles.emptyTitle}>아직 저장한 활동이 없어요</Text>
          <Text style={styles.emptySub}>마음에 드는 활동의 북마크를 눌러 담아두세요.</Text>
          <Pressable style={styles.emptyCta} onPress={() => router.push("/explore")}>
            <Text style={styles.emptyCtaLabel}>둘러보기</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          {items.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => openDetail(s.id)}
              style={[styles.item, i > 0 && styles.itemBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cat, { color: s.tone === "mint" ? C.mint : C.primary }]}>
                  {s.categoryLabel}
                </Text>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.meta}>{s.location?.dongName ?? ""}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={[styles.income, { color: s.tone === "mint" ? C.mint : C.primary }]}>
                  {s.costLabel}
                </Text>
                <Pressable onPress={() => toggleSaved(s.id)} hitSlop={10}>
                  <Bookmark size={20} filled color={C.primary} />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      )}
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
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  emptySub: { fontSize: 13, color: C.muted, textAlign: "center" },
  emptyCta: { marginTop: 12, height: 44, borderRadius: R.lg, backgroundColor: C.primary, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  emptyCtaLabel: { fontSize: 14, fontWeight: "700", color: C.white },
});
