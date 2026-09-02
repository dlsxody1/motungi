/**
 * 동네 전환 메뉴(RN) — 웹 neighborhood-menu.tsx(M-085 이전에는 부재)와 같은 의도를 모바일에
 * 이식한다: pill을 누르면 인기 동네를 그 자리에서 골라 집 앵커만 갱신한다. 네비게이션이
 * 없으므로 tabs 화면(탐색)에 머문 채로 동네를 바꿀 수 있다.
 *
 * 인기 동네 목록에 없거나 처음부터 다시 진단을 받고 싶을 때만 "동네 다시 설정하기"로
 * `/location`(→ /diagnosis) 재진단 플로우로 보낸다 — 두 동작은 의도가 다르므로 목록과
 * 시각적으로 분리된 별도 행으로 둔다(M-085).
 *
 * RN에는 <dialog>가 없어 Modal(transparent + backdrop Pressable)로 같은 역할을 한다.
 */
import { POPULAR_NEIGHBORHOODS } from "@/data/opportunities";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { CheckCircle, ChevronDown } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

/** core Anchor와 같은 모양 — admCode·region은 인기 동네 목록에서 비어 있을 수 있어 옵셔널. */
type Pick = {
  dongName: string;
  admCode?: string;
  region?: string;
  point: { lat: number; lng: number };
};

export function NeighborhoodMenu({ dongLabel }: { dongLabel: string }) {
  const router = useRouter();
  const setAnchor = useAppStore((s) => s.setAnchor);
  const currentDong = useAppStore((s) => s.anchors.home?.dongName);
  const [open, setOpen] = useState(false);

  const pick = (n: Pick) => {
    // 인라인 갱신 — 화면을 벗어나지 않는다(재진단 플로우와 구분되는 핵심 지점, M-085).
    setAnchor("home", n);
    setOpen(false);
  };

  const restart = () => {
    setOpen(false);
    router.push("/location");
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="동네 변경"
        onPress={() => setOpen(true)}
      >
        <Text style={styles.triggerLabel}>{dongLabel}</Text>
        <ChevronDown size={16} color={C.muted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="닫기"
          onPress={() => setOpen(false)}
        >
          {/* 내부 컨텐츠 클릭이 백드롭까지 버블링해 바로 닫히지 않도록 막는다. 이 Pressable엔
              accessibilityRole을 주지 않는다 — 안쪽에 "동네 다시 설정하기" 등 실제 버튼이
              중첩돼 있어 role="button"을 얹으면 button-in-button 중첩(무효 마크업)이 된다. */}
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>동네 선택</Text>
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {POPULAR_NEIGHBORHOODS.map((n) => {
                const active = currentDong === n.dongName;
                return (
                  <Pressable
                    key={n.dongName}
                    style={styles.row}
                    accessibilityRole="button"
                    onPress={() =>
                      pick({
                        dongName: n.dongName,
                        admCode: n.admCode,
                        region: n.region,
                        point: n.point,
                      })
                    }
                  >
                    <View style={styles.rowLabelGroup}>
                      <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                        {n.dongName}
                      </Text>
                      <Text style={styles.rowRegion}>{n.region}</Text>
                    </View>
                    {active && <CheckCircle size={16} color={C.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.divider} />

            {/* 인라인 갱신과 명확히 분리된 별도 행 — 여기만 /location 재진단으로 이동한다. */}
            <Pressable style={styles.restartRow} accessibilityRole="button" onPress={restart}>
              <Text style={styles.restartLabel}>동네 다시 설정하기</Text>
              <Text style={styles.restartHint}>위치를 다시 잡고 추천을 새로 받아요</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
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
  triggerLabel: { fontSize: 13, fontWeight: "600", color: C.label },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 8,
    ...cardShadow,
  },
  title: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, fontSize: 12, fontWeight: "600", color: C.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabelGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 14, fontWeight: "500", color: C.label },
  rowLabelActive: { fontWeight: "700", color: C.primaryDeep },
  rowRegion: { fontSize: 12, fontWeight: "400", color: C.muted },
  divider: { height: 1, backgroundColor: C.lineAlt, marginVertical: 6 },
  restartRow: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  restartLabel: { fontSize: 14, fontWeight: "600", color: C.label },
  restartHint: { marginTop: 2, fontSize: 12, fontWeight: "400", color: C.muted },
});
