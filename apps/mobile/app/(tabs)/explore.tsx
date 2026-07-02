import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Chip, Txt } from "@/ui/components";
import { ChevronDown, Search } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";
import { EXPLORE_LIST } from "@/data/opportunities";

const FILTERS = ["전체", "부업", "지원금", "긱 · 딜", "클래스 · 재능"];

/** B1 · 탐색 (전체 기회) */
export default function ExploreScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState("전체");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Txt preset="h1" style={{ fontSize: 24 }}>탐색</Txt>
        <Pressable style={styles.dong} hitSlop={8}>
          <Text style={styles.dongLabel}>망원동</Text>
          <ChevronDown size={16} color={C.muted} />
        </Pressable>
      </View>

      {/* 검색 */}
      <View style={styles.search}>
        <Search size={20} color={C.muted} />
        <TextInput style={styles.searchInput} placeholder="기회·키워드 검색" placeholderTextColor={C.muted} />
      </View>

      {/* 필터 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {/* 목록 */}
      <View style={{ marginTop: 8 }}>
        {EXPLORE_LIST.map((o, i) => (
          <Pressable
            key={o.id}
            onPress={() => router.push("/opportunity")}
            style={[styles.item, i > 0 && styles.itemBorder]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cat, { color: o.tone === "mint" ? C.mint : C.primary }]}>
                {o.categoryLabel}
              </Text>
              <Text style={styles.title}>{o.title}</Text>
              <Text style={styles.summary}>{o.summary}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.income, { color: o.tone === "mint" ? C.mint : C.primary }]}>
                {o.incomeLabel}
              </Text>
              <Text style={styles.match}>매칭 {o.matchScore}%</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
  dong: {
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
  dongLabel: { fontSize: 13, fontWeight: "600", color: C.label },
  search: {
    marginTop: 16,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 16 },
  itemBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  cat: { fontSize: 12, fontWeight: "700" },
  title: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  summary: { marginTop: 2, fontSize: 13, color: C.muted },
  income: { fontSize: 15, fontWeight: "800" },
  match: { fontSize: 12, color: C.muted },
});
