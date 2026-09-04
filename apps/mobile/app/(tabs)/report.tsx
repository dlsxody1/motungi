import { useRouter } from "expo-router";
import { Pressable, ScrollView, Share as RNShare, StyleSheet, Text, View } from "react-native";
import { deadlineLabel } from "@motungi/core";
import { useEnsureCatalog } from "@/hooks/useEnsureCatalog";
import { useAppStore } from "@/store/useAppStore";
import { Button, Tag, Txt } from "@/ui/components";
import { Location, Refresh, Share } from "@/ui/icons";
import { Thumbnail } from "@/ui/thumbnail";
import { C, R, cardShadow } from "@/ui/theme";

/**
 * 공유 링크용 오리진 — apps/mobile/app/opportunity.tsx의 SITE_URL과 **같은 값을 유지해야 한다**
 * (도메인을 바꾸면 양쪽 다 고칠 것. import로 못 묶는 이유도 opportunity.tsx 주석과 동일 — RN은
 * EXPO_PUBLIC_*, 웹은 NEXT_PUBLIC_*로 런타임이 갈린다).
 */
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "https://motungi-web.vercel.app";

/** A5 · 동네 리포트 (원픽 히어로) */
export default function ReportScreen() {
  useEnsureCatalog();
  const router = useRouter();
  const results = useAppStore((s) => s.results);
  const catalog = useAppStore((s) => s.catalog);
  const catalogStatus = useAppStore((s) => s.catalogStatus);
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";

  // 스코어링 결과 우선, 없으면 카탈로그 상위 6개. 원픽1 + 함께 최대5.
  const list = results.length > 0 ? results : catalog.slice(0, 6);
  const onePick = list[0];
  const related = list.slice(1);

  const openDetail = (id: string) => router.push({ pathname: "/opportunity", params: { id } });

  // 마감(D-day) — 웹 상세와 동일하게 순수 deadlineLabel로 계산(M-053 선례). onePick 없으면 스킵.
  const today = new Date().toISOString().slice(0, 10);
  const deadline = onePick ? deadlineLabel(onePick.deadline, today) : null;

  const onShare = () => {
    if (!onePick) return;
    RNShare.share({
      message: `${onePick.title}\n모퉁이에서 발견한 우리 동네 원픽\n${SITE_URL}/opportunity?id=${onePick.id}`,
    }).catch(() => {});
  };

  // 데이터 없으면 상태 화면.
  if (!onePick) {
    const isError = catalogStatus === "error" || catalogStatus === "unconfigured";
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>
          {isError ? "활동을 불러오지 못했어요" : "아직 추천할 활동이 없어요"}
        </Text>
        <Text style={styles.emptyDesc}>
          {isError
            ? "잠시 후 다시 시도하거나, 60초 진단으로 원픽을 받아보세요."
            : "60초 진단을 하면 우리 동네 원픽을 골라드려요."}
        </Text>
        <View style={{ marginTop: 24, alignSelf: "stretch", gap: 10, paddingHorizontal: 32 }}>
          <Button
            label={isError ? "다시 시도" : "60초 진단하기"}
            onPress={() => router.replace(isError ? "/loading" : "/diagnosis")}
          />
          <Button label="탐색 둘러보기" variant="ghost" onPress={() => router.push("/explore")} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Location size={18} color={C.primary} />
            <Text style={styles.hTitle}>{dongName} 기준</Text>
          </View>
          <Txt preset="label" color={C.muted} style={{ marginTop: 2, fontWeight: "400" }}>
            퇴근하고 즐길 거 {list.length}개 골랐어요
          </Txt>
        </View>
        <Pressable style={styles.redo} hitSlop={8} accessibilityRole="button" onPress={() => router.push("/diagnosis")}>
          <Refresh size={15} color={C.label} />
          <Text style={styles.redoLabel}>재진단</Text>
        </Pressable>
      </View>

      {/* 오늘의 원픽 */}
      <Txt preset="label" color={C.primary} style={{ marginTop: 20, marginBottom: 10, fontWeight: "700" }}>
        오늘의 원픽
      </Txt>

      <View style={styles.heroWrap}>
        <Pressable style={styles.hero} accessibilityRole="button" onPress={() => openDetail(onePick.id)}>
          {/* 이미지가 없어도 Thumbnail이 카테고리 톤 플레이스홀더로 채운다(M-087). */}
          <Thumbnail imageUrl={onePick.imageUrl} tone={onePick.tone} style={styles.heroImage} />
          <View style={styles.heroBody}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Tag label={onePick.categoryLabel} />
              {deadline && <DdayPill deadline={deadline} />}
            </View>
            <Text style={styles.heroTitle}>{onePick.title}</Text>
            <Text style={styles.heroSummary}>{onePick.summary}</Text>

            <View style={styles.costBox}>
              <View>
                <Text style={styles.costCap}>{onePick.costHeading}</Text>
                <Text style={styles.costVal}>{onePick.costLabel}</Text>
              </View>
              {!!onePick.costNote && (
                <Text style={styles.costNote}>{onePick.costNote}</Text>
              )}
            </View>
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaLabel}>자세히 보기</Text>
            </View>
          </View>
        </Pressable>
        {/* 공유 버튼 — hero Pressable과 형제로 분리(중첩 인터랙티브 방지, M-014 선례) */}
        <Pressable
          style={styles.heroShareBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="공유"
          onPress={onShare}
        >
          <Share size={18} color={C.white} />
        </Pressable>
      </View>

      {/* 함께 보면 좋아요 */}
      {related.length > 0 && (
        <View style={styles.relHeader}>
          <Txt preset="headline">함께 보면 좋아요</Txt>
          <Pressable hitSlop={8} onPress={() => router.push("/explore")}>
            <Text style={styles.relMoreLink}>더 찾아보기 →</Text>
          </Pressable>
        </View>
      )}
      <View>
        {related.map((o, i) => (
          <Pressable
            key={o.id}
            onPress={() => openDetail(o.id)}
            accessibilityRole="button"
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
              <Text style={[styles.relCost, { color: o.tone === "mint" ? C.mint : C.primary }]}>
                {o.costLabel}
              </Text>
              <Text style={styles.relMore}>자세히 →</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* 합산 배너 */}
      <View style={styles.sumBanner}>
        <View>
          <Text style={styles.sumTitle}>이거 묶어서 하루 코스로?</Text>
          <Text style={styles.sumSub}>관심사·시간대로 저녁 코스 짜기</Text>
        </View>
        <View style={styles.sumPill}>
          <Text style={styles.sumPillLabel}>곧 공개</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * 마감 임박도 배지 — apps/mobile/app/opportunity.tsx의 동명 로컬 컴포넌트와 동일 톤 규칙
 * (지남=회색, 임박≤3일=강조, 여유=은은). 공유 컴포넌트로 승격하지 않고 각 화면이 로컬로
 * 두는 기존 패턴을 그대로 따른다(M-087 scope가 report.tsx로 한정돼 opportunity.tsx는 건드리지 않음).
 */
function DdayPill({ deadline }: { deadline: { dday: number; past: boolean } }) {
  const { dday, past } = deadline;
  const text = past ? "마감" : dday === 0 ? "오늘 마감" : `D-${dday}`;
  const pillTone = past ? styles.pillPast : dday <= 3 ? styles.pillImminent : styles.pillComfortable;
  const textTone = past ? styles.pillTextPast : dday <= 3 ? styles.pillTextImminent : styles.pillTextComfortable;
  return (
    <View style={[styles.pill, pillTone]}>
      <Text style={[styles.pillText, textTone]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  emptyWrap: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: C.ink, textAlign: "center" },
  emptyDesc: { marginTop: 8, fontSize: 14, lineHeight: 21, color: C.muted, textAlign: "center", maxWidth: 320 },
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
  heroWrap: { position: "relative" },
  hero: {
    borderRadius: R["2xl"],
    borderWidth: 1,
    borderColor: "rgba(226,80,103,0.25)",
    backgroundColor: C.surface,
    overflow: "hidden",
    ...cardShadow,
  },
  heroImage: { width: "100%", aspectRatio: 16 / 9 },
  // hero Pressable과 형제(자식 아님) — 중첩 인터랙티브를 피해 카드 우상단에 절대배치로 겹친다.
  heroShareBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pill: { borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: "700" },
  pillPast: { backgroundColor: C.gray100 },
  pillTextPast: { color: C.muted },
  pillImminent: { backgroundColor: C.primary },
  pillTextImminent: { color: C.white },
  pillComfortable: { backgroundColor: C.tint },
  pillTextComfortable: { color: C.primaryDeep },
  heroBody: { backgroundColor: "rgba(251,232,236,0.5)", padding: 20 },
  heroTitle: { marginTop: 12, fontSize: 21, lineHeight: 28, fontWeight: "800", color: C.ink },
  heroSummary: { marginTop: 10, fontSize: 14, lineHeight: 22, color: C.label },
  costBox: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: C.tint,
    borderRadius: R.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  costCap: { fontSize: 12, fontWeight: "600", color: C.primaryDeep },
  costVal: { fontSize: 26, fontWeight: "800", color: C.primaryDeep },
  costNote: { textAlign: "right", fontSize: 12, lineHeight: 16, color: C.muted },
  heroCta: { height: 50, borderRadius: R.lg, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  heroCtaLabel: { fontSize: 16, fontWeight: "700", color: C.white },
  relHeader: {
    marginTop: 24,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  relMoreLink: { fontSize: 13, fontWeight: "600", color: C.primary },
  relItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 16 },
  relBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  relCat: { fontSize: 12, fontWeight: "700" },
  relTitle: { marginTop: 4, fontSize: 16, fontWeight: "700", color: C.ink },
  relSummary: { marginTop: 2, fontSize: 13, color: C.muted },
  relCost: { fontSize: 16, fontWeight: "800" },
  relMore: { fontSize: 12, color: C.muted },
  sumBanner: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.gray100,
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
