import type { OpportunityCategory } from "@motungi/core";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEnsureCatalog } from "@/hooks/useEnsureCatalog";
import { useAppStore } from "@/store/useAppStore";
import { Chip, Txt } from "@/ui/components";
import { ChevronDown, Search } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

/** 필터 라벨 → 카테고리. "전체"는 null. 데이터 있는 카테고리만 동적으로 노출된다. */
const FILTERS: { label: string; category: OpportunityCategory | null }[] = [
  { label: "전체", category: null },
  { label: "문화·공연", category: "culture" },
  { label: "운동·산책", category: "active" },
  { label: "먹거리·마켓", category: "food" },
  { label: "클래스", category: "class" },
  { label: "마켓", category: "market" },
  { label: "부업", category: "side_job" },
];

/** B1 · 탐색 (전체 기회) */
export default function ExploreScreen() {
  useEnsureCatalog();
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";
  const [filter, setFilter] = useState<string>("전체");
  const [query, setQuery] = useState("");

  const catalog = useAppStore((s) => s.catalog);
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const source = catalog; // 서버 실데이터만 사용(목업 폴백 없음).

  const list = useMemo(() => {
    const cat = FILTERS.find((f) => f.label === filter)?.category ?? null;
    const q = query.trim();
    return source.filter((o) => {
      if (cat && o.category !== cat) return false;
      if (q && !`${o.title} ${o.summary}`.includes(q)) return false;
      return true;
    });
  }, [filter, query, source]);

  // 데이터 있는 카테고리만 필터 칩으로 노출("전체"는 항상).
  const visibleFilters = useMemo(
    () => FILTERS.filter((f) => !f.category || source.some((o) => o.category === f.category)),
    [source],
  );

  const openDetail = (id: string) => router.push({ pathname: "/opportunity", params: { id } });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Txt preset="h1" style={{ fontSize: 24 }}>탐색</Txt>
        <Pressable
          style={styles.dong}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="동네 변경"
          onPress={() => router.push("/location")}
        >
          <Text style={styles.dongLabel}>{dongName}</Text>
          <ChevronDown size={16} color={C.muted} />
        </Pressable>
      </View>

      {/* 검색 */}
      <View style={styles.search}>
        <Search size={20} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="활동·키워드 검색"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* 필터 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {visibleFilters.map((f) => (
          <Chip key={f.label} label={f.label} active={filter === f.label} onPress={() => setFilter(f.label)} />
        ))}
      </ScrollView>

      {/* 목록 */}
      <View style={{ marginTop: 8 }}>
        {list.length === 0 && (
          <Text style={styles.empty}>
            {source.length === 0
              ? catalogStatus === "error" || catalogStatus === "unconfigured"
                ? "활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                : "아직 등록된 활동이 없어요. 곧 채워질 거예요."
              : "조건에 맞는 활동이 아직 없어요."}
          </Text>
        )}
        {list.map((o, i) => (
          <Pressable
            key={o.id}
            onPress={() => openDetail(o.id)}
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
                {o.costLabel}
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
  empty: { paddingVertical: 40, textAlign: "center", fontSize: 14, color: C.muted },
});
