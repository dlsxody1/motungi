import type { Opportunity, OpportunityCategory } from "@motungi/core";
import {
  buildSearchHaystacks,
  EXPLORE_CATEGORY_FILTERS,
  exploreCategoryCounts,
  exploreRegionCounts,
  filterExplore,
  scoreAll,
  searchTerms,
  sortByDistance,
} from "@motungi/core";
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEnsureCatalog } from "@/hooks/useEnsureCatalog";
import { useAppStore } from "@/store/useAppStore";
import { Chip, Txt } from "@/ui/components";
import { ExploreRowSkeleton } from "@/ui/explore-skeleton";
import { Search } from "@/ui/icons";
import { NeighborhoodMenu } from "@/ui/neighborhood-menu";
import { Thumbnail } from "@/ui/thumbnail";
import { C, R, cardShadow } from "@/ui/theme";

/** 탐색 목록에 들어가는 활동 뷰 모델 — catalog 원소 또는 scoreAll 결과(matchScore 부여)에 뷰 필드가 붙은 형태. */
type ActivityRow = Opportunity & {
  categoryLabel: string;
  costLabel: string;
  tone?: "mint" | string;
  matchScore?: number;
};

/**
 * 활동 카드 한 줄. React.memo로 감싸 FlatList 스크롤 중 보이는 행만 재렌더되게 한다.
 * (onPress는 부모에서 useCallback으로 고정 → props가 안 바뀌면 memo가 재렌더를 건너뛴다.)
 */
const ActivityItem = memo(function ActivityItem({
  item,
  first,
  onPress,
}: {
  item: ActivityRow;
  first: boolean;
  onPress: (id: string) => void;
}) {
  const accent = item.tone === "mint" ? C.mint : C.primary;
  return (
    <Pressable
      onPress={() => onPress(item.id)}
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
        <Text style={styles.summary}>{item.summary}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.cost, { color: accent }]}>{item.costLabel}</Text>
        <Text style={styles.match}>자세히 →</Text>
      </View>
    </Pressable>
  );
});

/**
 * 필터 라벨 → 카테고리. "전체"는 null. 데이터 있는 카테고리만 동적으로 노출된다.
 * taxonomy는 core 단일 출처(`EXPLORE_CATEGORY_FILTERS`, M-080) — web(explore-filters.ts)과
 * 동일 배열을 공유한다.
 */
const FILTERS = EXPLORE_CATEGORY_FILTERS;

/** B1 · 탐색 (전체 기회) */
export default function ExploreScreen() {
  useEnsureCatalog();
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";
  const [filter, setFilter] = useState<string>("전체");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [easyOnly, setEasyOnly] = useState(false);

  const catalog = useAppStore((s) => s.catalog);
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const answers = useAppStore((s) => s.answers);
  /**
   * `setAnchor`는 매번 `{...s.anchors}`로 **새 객체**를 만든다(core/store.ts).
   * 그대로 쓰면 앵커를 바꿀 때마다 source → sorted → haystacks → list 4단 메모가
   * 연쇄로 무너지고, list는 FlatList의 data라 ActivityItem memo까지 함께 뚫린다.
   * scoreAll/sortByDistance가 객체를 요구하므로 필드 추출 대신 **좌표 값이 같으면
   * 같은 참조**를 유지하는 쪽으로 고정한다. (web explore/page.tsx와 동일 처방 — M-106)
   */
  const rawAnchors = useAppStore((s) => s.anchors);
  const anchorKey = JSON.stringify([rawAnchors.home?.point, rawAnchors.work?.point]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 좌표 값(anchorKey)으로 비교한다
  const anchors = useMemo(() => rawAnchors, [anchorKey]);
  const matchActive = answers != null;
  const hasAnchor = anchors.home?.point != null || anchors.work?.point != null;
  const [sort, setSort] = useState<"recommend" | "distance" | "deadline">(
    matchActive ? "recommend" : "deadline",
  );
  // 진단 답변이 있으면 전체를 재스코어링해 추천 순으로 정렬한다(매칭 %는 표시하지 않음).
  // 서버 실데이터만 사용(목업 폴백 없음).
  const source = useMemo(
    () =>
      answers
        ? scoreAll(catalog, answers, anchors).map((r) => ({
            ...r.opportunity,
            matchScore: Math.round(r.score * 100),
          }))
        : catalog,
    [catalog, answers, anchors],
  );

  const sorted = useMemo(
    () => (sort === "distance" && hasAnchor ? sortByDistance(source, anchors) : source),
    [source, sort, hasAnchor, anchors],
  );

  // 지역(구) 옵션 — 정규화한 dong_name distinct + 건수, 건수순.
  const REGIONS = useMemo(() => exploreRegionCounts(source), [source]);

  /**
   * 행별 검색 하이스택. **sorted가 바뀔 때만** 만든다 — 예전엔 필터 안에서 매 행마다
   * 문자열을 조합해서 키 입력 한 번에 (행 × 필드) join이 통째로 다시 돌았다.
   */
  const haystacks = useMemo(() => buildSearchHaystacks(sorted), [sorted]);

  const list = useMemo(
    () =>
      filterExplore(sorted, {
        category: FILTERS.find((f) => f.label === filter)?.category ?? null,
        region,
        terms: searchTerms(query),
        easyOnly,
        haystacks,
      }),
    [filter, region, easyOnly, query, sorted, haystacks],
  );

  // 데이터 있는 카테고리만 필터 칩으로 노출("전체"는 항상).
  const visibleFilters = useMemo(
    () => exploreCategoryCounts(source).filter((c) => !c.category || c.count > 0),
    [source],
  );

  const openDetail = useCallback(
    (id: string) => router.push({ pathname: "/opportunity", params: { id } }),
    [router],
  );

  // 헤더(제목·검색·필터)는 리스트 스크롤을 함께 타도록 ListHeaderComponent로 넘긴다.
  // FlatList 안에 또 다른 세로 스크롤을 중첩하지 않기 위해, 리스트 자체가 화면 스크롤을 담당한다.
  const header = (
    <>
      <View style={styles.header}>
        <Txt preset="h1" style={{ fontSize: 24 }}>탐색</Txt>
        <NeighborhoodMenu dongLabel={dongName} />
      </View>

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {visibleFilters.map((f) => (
          <Chip key={f.label} label={f.label} active={filter === f.label} onPress={() => setFilter(f.label)} />
        ))}
      </ScrollView>

      {/* 정렬: 추천순(진단 완료 시에만) · 거리순(앵커 보유 시에만 활성) · 마감임박순(기본) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
        {matchActive && (
          <Chip label="추천순" active={sort === "recommend"} onPress={() => setSort("recommend")} />
        )}
        <Chip
          label="거리순"
          active={sort === "distance"}
          disabled={!hasAnchor}
          onPress={hasAnchor ? () => setSort("distance") : undefined}
        />
        <Chip label="마감임박순" active={sort === "deadline"} onPress={() => setSort("deadline")} />
        <Chip label="낮음만 보기" active={easyOnly} onPress={() => setEasyOnly((v) => !v)} />
      </ScrollView>

      {/* 지역(구) 필터 — 데이터가 있을 때만 노출 */}
      {REGIONS.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          <Chip label="전체 지역" active={region === null} onPress={() => setRegion(null)} />
          {REGIONS.map((r) => (
            <Chip
              key={r.label}
              label={`${r.label} (${r.count})`}
              active={region === r.label}
              onPress={() => setRegion(r.label)}
            />
          ))}
        </ScrollView>
      )}

      <View style={{ height: 8 }} />
    </>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={styles.content}
      data={list}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <ActivityItem item={item} first={index === 0} onPress={openDetail} />
      )}
      ListEmptyComponent={
        // catalogStatus는 조회가 끝나야 ok/empty/error로 바뀐다 — "idle"이 곧 로딩이다.
        // 구분하지 않으면 조회 중에도 "아직 등록된 활동이 없어요"가 떠서 없다고 거짓말한다(M-054).
        catalogStatus === "idle" ? (
          <View>
            {Array.from({ length: 6 }, (_, i) => (
              <ExploreRowSkeleton key={i} />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>
            {source.length === 0
              ? catalogStatus === "error" || catalogStatus === "unconfigured"
                ? "활동을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                : "아직 등록된 활동이 없어요. 곧 채워질 거예요."
              : "조건에 맞는 활동이 아직 없어요."}
          </Text>
        )
      }
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
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
  thumb: { width: 64, height: 64 },
  cat: { fontSize: 12, fontWeight: "700" },
  title: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  summary: { marginTop: 2, fontSize: 13, color: C.muted },
  cost: { fontSize: 15, fontWeight: "800" },
  match: { fontSize: 12, color: C.muted },
  empty: { paddingVertical: 40, textAlign: "center", fontSize: 14, color: C.muted },
});
