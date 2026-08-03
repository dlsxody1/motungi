import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share as RNShare,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { displayNameOf, isWeekendOuting, whyReasons } from "@motungi/core";
import { useOpportunity } from "@/hooks/useOpportunity";
import { useAppStore } from "@/store/useAppStore";
import { Button, FlowHeader, Screen, Tag } from "@/ui/components";
import { Bookmark, CheckCircle, ExternalLink, Location, Share } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

/** A6 · 기회 상세 */
export default function OpportunityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // 상세는 카탈로그 전량을 받지 않는다 — id로 1건만(이미 스토어에 있으면 재사용).
  const { opportunity: o, status } = useOpportunity(id ?? null);

  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const answers = useAppStore((s) => s.answers);
  const user = useAppStore((s) => s.user);

  // 아직 불러오는 중(idle/loading)이면 "없음"이 아니라 스피너.
  if (!o && (status === "idle" || status === "loading")) {
    return (
      <Screen>
        <FlowHeader />
        <View style={styles.notFound}>
          <ActivityIndicator color={C.primary} />
        </View>
      </Screen>
    );
  }

  if (!o) {
    return (
      <Screen>
        <FlowHeader />
        <View style={styles.notFound}>
          <Text style={styles.nfTitle}>활동을 찾을 수 없어요</Text>
          <Text style={styles.nfDesc}>
            이 활동이 사라졌거나 아직 불러오지 못했어요. 탐색에서 다른 활동을 둘러보세요.
          </Text>
          <View style={{ marginTop: 20, alignSelf: "stretch", paddingHorizontal: 32 }}>
            <Button label="탐색 둘러보기" onPress={() => router.replace("/explore")} />
          </View>
        </View>
      </Screen>
    );
  }

  const saved = savedIds.includes(o.id);

  const displayName = displayNameOf(user);
  const why = whyReasons(o, answers);
  const hasLink = !!o.ctaUrl && o.ctaUrl !== "#";

  const onShare = () => {
    RNShare.share({ message: `${o.title}\n모퉁이에서 발견한 우리 동네 활동` }).catch(() => {});
  };

  return (
    <Screen>
      <FlowHeader
        right={
          <Pressable hitSlop={8} style={styles.iconBtn} onPress={onShare} accessibilityLabel="공유">
            <Share size={22} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Tag label={o.categoryLabel} />
          {isWeekendOuting(o) && <Text style={styles.weekendBadge}>주말 나들이</Text>}
        </View>
        <Text style={styles.title}>{o.title}</Text>
        <View style={styles.locRow}>
          <Location size={16} color={C.primary} />
          <Text style={styles.locText}>{o.location?.dongName ?? "우리 동네"}</Text>
        </View>

        {/* 비용 카드 */}
        <View style={styles.costCard}>
          <Text style={styles.costCap}>{o.costHeading}</Text>
          <Text style={styles.costVal}>
            {o.costLabel} <Text style={styles.costUnit}>/ {o.costUnit}</Text>
          </Text>
          {!!o.costNote && (
            <>
              <View style={styles.costLine} />
              <Text style={styles.costSub}>{o.costNote}</Text>
            </>
          )}
        </View>

        {/* 왜 맞을까요 */}
        <View style={styles.whyCard}>
          <Text style={styles.whyTitle}>왜 {displayName}님께 맞을까요?</Text>
          <View style={{ gap: 10 }}>
            {why.map((w) => (
              <View key={w} style={styles.whyRow}>
                <CheckCircle size={18} color={C.primary} />
                <Text style={styles.whyText}>{w}</Text>
              </View>
            ))}
          </View>
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

        {/* 걷기길 코스 안내 — 두루누비엔 사진이 없어 이 안내가 그 자리를 대신한다.
            시점이 있으면 코스 안내, 없으면 주의사항(DMZ 코스). 둘 다 없으면 렌더 안 함. */}
        {!!o.courseStart && (
          <>
            <Text style={styles.guideTitle}>코스 안내</Text>
            <View style={styles.guideCard}>
              <Text style={styles.guideLabel}>시점</Text>
              <Text style={styles.guideText}>{o.courseStart}</Text>
              {!!o.courseEnd && (
                <>
                  <Text style={[styles.guideLabel, { marginTop: 12 }]}>종점</Text>
                  <Text style={styles.guideText}>{o.courseEnd}</Text>
                </>
              )}
              {o.isLoop === false && (
                <Text style={styles.guideNote}>
                  비순환형이라 종점에서 출발지로 돌아오는 길을 따로 계획해야 해요.
                </Text>
              )}
            </View>
          </>
        )}

        {!o.courseStart && !!o.courseNotes?.length && (
          <>
            <Text style={styles.guideTitle}>알아두세요</Text>
            <View style={styles.guideCard}>
              {o.courseNotes.map((n, i) => (
                <Text key={i} style={[styles.guideText, i > 0 && { marginTop: 8 }]}>
                  · {n}
                </Text>
              ))}
            </View>
          </>
        )}

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
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  nfTitle: { fontSize: 20, fontWeight: "800", color: C.ink, textAlign: "center" },
  nfDesc: { marginTop: 8, fontSize: 14, lineHeight: 21, color: C.muted, textAlign: "center", maxWidth: 320 },
  title: { marginTop: 12, fontSize: 23, lineHeight: 30, fontWeight: "800", color: C.ink },
  locRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  locText: { fontSize: 14, color: C.muted },
  costCard: { marginTop: 16, backgroundColor: "rgba(251,232,236,0.6)", borderRadius: R.lg, padding: 16 },
  costCap: { fontSize: 12, fontWeight: "600", color: C.primaryDeep },
  costVal: { fontSize: 30, fontWeight: "800", color: C.primaryDeep },
  costUnit: { fontSize: 15, fontWeight: "700", color: C.muted },
  costLine: { marginTop: 8, height: 1, backgroundColor: "rgba(226,80,103,0.15)" },
  costSub: { marginTop: 8, fontSize: 13, color: C.muted },
  whyCard: { marginTop: 16, backgroundColor: C.surface, borderRadius: R.lg, padding: 16, ...cardShadow },
  whyTitle: { fontSize: 15, fontWeight: "700", color: C.ink, marginBottom: 12 },
  whyRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  whyText: { flex: 1, fontSize: 13, lineHeight: 20, color: C.label },
  metaRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  metaCard: { flex: 1, backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: 12, alignItems: "center", ...cardShadow },
  metaLabel: { fontSize: 11, color: C.muted },
  metaValue: { marginTop: 4, fontSize: 15, fontWeight: "700", color: C.ink },
  guideTitle: { marginTop: 24, marginBottom: 10, fontSize: 17, fontWeight: "700", color: C.ink },
  guideCard: { backgroundColor: C.surface, borderRadius: R.md, padding: 16, ...cardShadow },
  guideLabel: { fontSize: 12, fontWeight: "600", color: C.primaryDeep },
  guideText: { marginTop: 2, fontSize: 14, lineHeight: 22, color: C.label },
  guideNote: { marginTop: 12, fontSize: 12, color: C.muted },
  weekendBadge: { backgroundColor: C.surfaceAlt, color: C.muted, fontSize: 11, fontWeight: "600",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden" },
  disclaimer: { marginTop: 24, backgroundColor: C.surfaceAlt, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 12, lineHeight: 18, color: C.muted },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  bookmark: { width: 52, height: 52, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  bookmarkOn: { borderColor: C.primary, backgroundColor: C.tint },
  startBtn: { flex: 1, height: 52, borderRadius: R.lg, backgroundColor: C.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  startBtnDisabled: { backgroundColor: C.faint },
  startLabel: { fontSize: 16, fontWeight: "700", color: C.white },
});
