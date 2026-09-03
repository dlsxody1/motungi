/**
 * 탐색 목록 로딩 자리표시자(RN) — M-054.
 *
 * 웹 explore-skeleton.tsx(ExploreRowSkeleton)의 RN 대응물. catalogStatus는 조회가 끝나야
 * ok/empty/error로 바뀌므로 "idle"이 곧 로딩이다 — 이걸 구분하지 않으면 조회 중에도
 * "아직 등록된 활동이 없어요"가 떠서 없다고 거짓말을 한다(explore.tsx). 실제 행
 * (ActivityItem)과 같은 골격을 미리 깔아 도착 순간 레이아웃이 밀리는 것도 함께 막는다.
 *
 * 웹은 pulse 애니메이션을 쓰지만 여기선 정적 회색 블록만 둔다 — 새 의존성(Animated 타이밍
 * 튜닝) 없이 단순하게 유지한다.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { C, R } from "./theme";

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

/**
 * 탐색 행 스켈레톤 — ExploreScreen의 ActivityItem과 같은 골격
 * (좌: 64×64 썸네일 + 카테고리 라벨 + 2줄 제목 + 요약 / 우: 금액 + "자세히 →").
 */
export function ExploreRowSkeleton() {
  return (
    <View style={styles.row} testID="explore-row-skeleton">
      <View style={styles.thumb} />
      <View style={styles.body}>
        <Bar width={60} height={12} />
        <Bar width="90%" height={15} style={styles.gapSm} />
        <Bar width="60%" height={15} style={styles.gapXs} />
        <Bar width="45%" height={12} style={styles.gapSm} />
      </View>
      <View style={styles.side}>
        <Bar width={50} height={15} />
        <Bar width={40} height={12} style={styles.gapSm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 16 },
  body: { flex: 1 },
  side: { alignItems: "flex-end" },
  thumb: { width: 64, height: 64, borderRadius: R.md, backgroundColor: C.gray100 },
  bar: { borderRadius: R.sm, backgroundColor: C.gray100 },
  gapSm: { marginTop: 6 },
  gapXs: { marginTop: 4 },
});
