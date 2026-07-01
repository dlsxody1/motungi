import { DIAGNOSIS_STEPS } from "@motungi/core";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

/**
 * 스캐폴딩 확인용 플레이스홀더. 디자인/UI는 다음 단계에서.
 * 공용 패키지(@motungi/core) import가 앱에서 동작하는지만 증명한다.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>모퉁이 Corner</Text>
      <Text>내 동네 모퉁이에, 기회가 있다.</Text>
      <Text style={styles.muted}>
        스캐폴딩 완료 · 진단 {DIAGNOSIS_STEPS.length}문항 준비됨
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "700" },
  muted: { color: "#888" },
});
