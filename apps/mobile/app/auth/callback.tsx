import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { C } from "@/ui/theme";

/**
 * 딥링크 콜백 폴백(motungi://auth/callback).
 * 보통은 WebBrowser.openAuthSessionAsync가 리다이렉트를 직접 잡아 이 화면까지 안 오지만,
 * 콜드스타트/외부 브라우저 경로에서 여기로 들어오면 세션 반영(onAuthStateChange) 후 리포트로.
 */
export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/report"), 800);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
});
