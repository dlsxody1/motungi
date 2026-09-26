/**
 * 동네 리포트 로딩 자리표시자(RN) — M-088.
 *
 * 웹 report-skeleton.tsx(ReportSkeleton)의 RN 대응물. catalogStatus는 조회가 끝나야
 * ok/empty/error로 바뀌므로 "idle"이 곧 로딩이다 — 구분하지 않으면 조회 중에도
 * "아직 추천할 활동이 없어요"가 떠서 없다고 거짓말한다(report.tsx). 실제 원픽 히어로 +
 * "함께 보면 좋아요" 행과 같은 골격을 미리 깔아 도착 순간 레이아웃이 밀리는 것도 막는다.
 * explore-skeleton.tsx(ExploreRowSkeleton)와 동일하게 정적 회색 블록만 쓴다(pulse 없음).
 */
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Location } from "./icons";
import { C, R, cardShadow } from "./theme";

type BarWidth = number | `${number}%`;

/** 스켈레톤 막대 하나 — 정적 회색 블록. */
function Bar({
  width,
  height,
  style,
}: {
  width: BarWidth;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.bar, { width, height }, style]} />;
}

export function ReportSkeleton({ dongName = "우리 동네" }: { dongName?: string }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={styles.content}
      testID="report-skeleton"
    >
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Location size={18} color={C.primary} />
          <Bar width={100} height={16} />
        </View>
        <Bar width={140} height={13} style={styles.gapSm} />
      </View>

      <Bar width={70} height={14} style={styles.sectionLabel} />

      <View style={styles.hero}>
        <View style={styles.heroImage} />
        <View style={styles.heroBody}>
          <Bar width={60} height={22} />
          <Bar width="90%" height={21} style={styles.gapMd} />
          <Bar width="60%" height={21} style={styles.gapXs} />
          <View style={styles.costBox}>
            <View>
              <Bar width={40} height={12} />
              <Bar width={80} height={26} style={styles.gapSm} />
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Bar width="100%" height={50} style={{ borderRadius: R.lg }} />
        </View>
      </View>

      <View>
        {Array.from({ length: 2 }, (_, i) => (
          <View key={i} style={[styles.relItem, i > 0 && styles.relBorder]}>
            <View style={{ flex: 1 }}>
              <Bar width={60} height={12} />
              <Bar width="85%" height={16} style={styles.gapSm} />
              <Bar width="50%" height={13} style={styles.gapXs} />
            </View>
            <Bar width={40} height={16} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  header: { paddingTop: 4 },
  sectionLabel: { marginTop: 20, marginBottom: 10 },
  hero: {
    borderRadius: R["2xl"],
    borderWidth: 1,
    borderColor: "rgba(226,80,103,0.25)",
    backgroundColor: C.surface,
    overflow: "hidden",
    ...cardShadow,
  },
  heroImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: C.gray100 },
  heroBody: { backgroundColor: "rgba(251,232,236,0.5)", padding: 20 },
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
  relItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 16 },
  relBorder: { borderTopWidth: 1, borderTopColor: C.lineAlt },
  bar: { borderRadius: R.sm, backgroundColor: C.gray100 },
  gapSm: { marginTop: 6 },
  gapMd: { marginTop: 12 },
  gapXs: { marginTop: 4 },
});
