import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Chip, Screen, Txt } from "@/ui/components";
import { CheckCircle, ChevronLeft, ChevronRight, Location, Search } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

const NEIGHBORHOODS = ["망원동", "성수동", "연남동", "판교동", "합정동"];

/** A2 · 위치 / 동네 설정 */
export default function LocationScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState("망원동");

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ChevronLeft size={24} />
        </Pressable>

        <Txt preset="h1" style={{ marginTop: 8 }}>
          어느 동네 기준으로{"\n"}찾아드릴까요?
        </Txt>
        <Txt preset="body" color={C.muted} style={{ marginTop: 8 }}>
          설정한 동네가 추천의 기준이 돼요.
        </Txt>

        {/* 현재 위치로 찾기 */}
        <Pressable style={styles.locCard}>
          <View style={styles.locIcon}>
            <Location size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt preset="headline">현재 위치로 찾기</Txt>
            <Txt preset="label" color={C.muted} style={{ marginTop: 2, fontWeight: "400" }}>
              위치 권한 → 행정동 자동 설정
            </Txt>
          </View>
          <ChevronRight size={20} color={C.faint} />
        </Pressable>

        {/* 구분선 */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <Txt preset="caption" color={C.muted}>또는 직접 선택</Txt>
          <View style={styles.line} />
        </View>

        {/* 검색 */}
        <View style={styles.search}>
          <Search size={20} color={C.faint} />
          <TextInput
            style={styles.searchInput}
            placeholder="동네 이름 검색 (예: 망원동)"
            placeholderTextColor={C.muted}
          />
        </View>

        {/* 칩 */}
        <Txt preset="label" style={{ marginTop: 20, marginBottom: 10 }}>최근 · 인기 동네</Txt>
        <View style={styles.chips}>
          {NEIGHBORHOODS.map((n) => (
            <Chip
              key={n}
              label={n}
              active={selected === n}
              onPress={() => setSelected(n)}
              leading={selected === n ? <Location size={14} color={C.primary} /> : undefined}
            />
          ))}
        </View>

        {/* 확인 배너 */}
        <View style={styles.banner}>
          <CheckCircle size={18} color={C.primary} />
          <Text style={{ fontSize: 14, color: C.primaryDeep }}>
            서울 마포구 <Text style={{ fontWeight: "700" }}>{selected}</Text> 선택됨
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
        <Button label={`${selected}으로 시작하기`} onPress={() => router.push("/diagnosis")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, justifyContent: "center", marginLeft: -8 },
  locCard: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 16,
    ...cardShadow,
  },
  locIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: C.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: C.line },
  search: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  banner: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(251,232,236,0.6)",
    borderRadius: R.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
