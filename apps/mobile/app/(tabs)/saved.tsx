import type { Opportunity } from "@motungi/core";
import { useRouter } from "expo-router";
import { memo, useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEnsureCatalog } from "@/hooks/useEnsureCatalog";
import { useSavedOpportunities } from "@/hooks/useSavedOpportunities";
import { useAppStore } from "@/store/useAppStore";
import { Txt } from "@/ui/components";
import { Bookmark, Location, User } from "@/ui/icons";
import { Thumbnail } from "@/ui/thumbnail";
import { C, R } from "@/ui/theme";

/** 보관함 목록 뷰 모델 — catalog 원소에 뷰 필드(categoryLabel/costLabel/tone)가 붙은 형태. */
type SavedRow = Opportunity & { categoryLabel: string; costLabel: string; tone?: "mint" | string };

/** 저장 활동 한 줄. memo로 감싸 목록 스크롤·toggle 시 해당 행 외 재렌더를 막는다. */
const SavedItem = memo(function SavedItem({
  item,
  first,
  onOpen,
  onToggle,
}: {
  item: SavedRow;
  first: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const accent = item.tone === "mint" ? C.mint : C.primary;
  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      accessibilityRole="button"
      style={[styles.item, !first && styles.itemBorder]}
    >
      <Thumbnail
        imageUrl={item.imageUrl}
        tone={item.tone === "mint" ? "mint" : "brand"}
        style={styles.thumb}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cat, { color: accent }]}>{item.categoryLabel}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.location?.dongName ?? ""}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={[styles.cost, { color: accent }]}>{item.costLabel}</Text>
        <Pressable
          onPress={() => onToggle(item.id)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="저장 취소"
          aria-pressed={true}
        >
          <Bookmark size={20} filled color={C.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
});

/** A7 · 보관함 / 홈 */
export default function SavedScreen() {
  useEnsureCatalog();
  const router = useRouter();
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";

  const catalog = useAppStore((s) => s.catalog);
  // 저장 id를 해소. catalog(반경으로 좁힌 창)에 있으면 그대로 쓰고, 없으면 단건 조회한다
  // (M-045 — 이전엔 catalog.find만 써서 창 밖 저장 id가 조용히 사라졌다).
  const { items, status, retry } = useSavedOpportunities(savedIds, catalog);
  const openDetail = useCallback(
    (id: string) => router.push({ pathname: "/opportunity", params: { id } }),
    [router],
  );

  const header = (
    <>
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

      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>이번 주 동네 다시 보기</Text>
          <Text style={styles.bannerSub}>상황이 바뀌었나요? 60초면 재진단해요.</Text>
        </View>
        <Pressable
          style={styles.redo}
          hitSlop={8}
          onPress={() => router.push("/diagnosis")}
          accessibilityRole="button"
        >
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      <View style={styles.savedHead}>
        <Txt preset="headline">저장한 활동</Txt>
        {/* 로딩·에러 중엔 count 노드 자체를 렌더하지 않는다 — "0개"로 오독되면 안 된다(M-046). */}
        {status !== "loading" && status !== "error" && (
          <Text style={styles.count}>{items.length}개</Text>
        )}
      </View>
    </>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <SavedItem item={item} first={index === 0} onOpen={openDetail} onToggle={toggleSaved} />
      )}
      ListEmptyComponent={
        status === "loading" ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.emptyTitle}>저장한 활동을 불러오는 중…</Text>
          </View>
        ) : status === "error" ? (
          <View style={styles.empty}>
            <Bookmark size={28} color={C.faint} />
            <Text style={styles.emptyTitle}>활동을 불러오지 못했어요</Text>
            <Text style={styles.emptySub}>네트워크 상태를 확인하고 다시 시도해 주세요.</Text>
            <Pressable style={styles.emptyCta} onPress={retry} accessibilityRole="button">
              <Text style={styles.emptyCtaLabel}>다시 시도</Text>
            </Pressable>
          </View>
        ) : (
          // status === "empty"(저장한 id 자체가 없음) 또는 status === "ok"인데 items가 0인
          // 드문 경우(저장한 활동이 전부 삭제됨) — 둘 다 "보여줄 게 없다"는 점은 같다.
          <View style={styles.empty}>
            <Bookmark size={28} color={C.faint} />
            <Text style={styles.emptyTitle}>아직 저장한 활동이 없어요</Text>
            <Text style={styles.emptySub}>마음에 드는 활동의 북마크를 눌러 담아두세요.</Text>
            <Pressable
              style={styles.emptyCta}
              onPress={() => router.push("/explore")}
              accessibilityRole="button"
            >
              <Text style={styles.emptyCtaLabel}>둘러보기</Text>
            </Pressable>
          </View>
        )
      }
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 },
  sub: { fontSize: 14, color: C.muted },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
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
  thumb: { width: 64, height: 64 },
  itemBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  cat: { fontSize: 12, fontWeight: "700" },
  title: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  meta: { marginTop: 2, fontSize: 13, color: C.muted },
  cost: { fontSize: 15, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  emptySub: { fontSize: 13, color: C.muted, textAlign: "center" },
  emptyCta: { marginTop: 12, height: 44, borderRadius: R.lg, backgroundColor: C.primary, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  emptyCtaLabel: { fontSize: 14, fontWeight: "700", color: C.white },
});
