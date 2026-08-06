import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signInWithKakao } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";
import { C, R } from "@/ui/theme";

/**
 * 로그인 후 돌아갈 수 있는 경로 화이트리스트.
 * expo-router는 라우트를 타입으로 좁히므로 임의 string을 받지 않는다 —
 * 딥링크로 아무 경로나 밀어넣는 걸 막는 화이트리스트가 곧 타입도 만족시킨다.
 */
const NEXT_ROUTES = ["/my", "/saved", "/report", "/explore"] as const;

/**
 * 로그인 전용 화면 (웹 /login 과 같은 역할·같은 카피).
 *
 * 왜 별도 화면인가: 예전엔 마이(D1) 한복판에 노란 카카오 버튼이 그대로 박혀 있어
 * 메뉴 사이에 낀 배너였다. 로그인이 왜 필요한지 설명할 자리가 없었다.
 * 로그인은 계정을 만드는 결정이므로 자기 화면을 가진다.
 *
 * 로그인은 선택이다 — 모퉁이는 로그인 없이도 전부 쓸 수 있으므로
 * "나중에 할게요"를 항상 같은 무게로 남겨둔다(강제 로그인 벽 금지).
 */
export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const user = useAppStore((s) => s.user);
  const savedCount = useAppStore((s) => s.savedIds.length);
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const next = NEXT_ROUTES.find((r) => r === params.next) ?? "/my";

  // 이미 로그인됐으면 이 화면에 머물 이유가 없다.
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const login = async () => {
    setBusy(true);
    setLoginError(null);
    const { error } = await signInWithKakao();
    setBusy(false);
    if (error) setLoginError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 브랜드 색면 — 웹 로그인 좌측 패널과 같은 그라데이션. */}
      <LinearGradient
        colors={[C.sun, C.primary, C.purple]}
        locations={[0, 0.52, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <Text style={styles.heroTitle}>
          퇴근하고 뭐하지?{"\n"}동네에서 찾은 오늘의 원픽.
        </Text>
        <Text style={styles.heroBody}>
          로그인하면 저장한 활동이 계정에 남아, 폰을 바꿔도 그대로예요.
        </Text>
      </LinearGradient>

      <View style={styles.panel}>
        <Text style={styles.title}>카카오로 시작하기</Text>
        <Text style={styles.sub}>
          {savedCount > 0
            ? `지금 저장한 ${savedCount}개를 계정으로 옮겨요.`
            : "가입 절차 없이 카카오 계정으로 바로 시작해요."}
        </Text>

        <Pressable
          style={[styles.kakao, busy && { opacity: 0.6 }]}
          onPress={login}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
        >
          <Text style={styles.kakaoLabel}>{busy ? "연결 중…" : "카카오로 시작하기"}</Text>
        </Pressable>

        {!!loginError && <Text style={styles.error}>{loginError}</Text>}

        <Pressable
          style={styles.later}
          onPress={() => router.replace(next)}
          accessibilityRole="button"
        >
          <Text style={styles.laterLabel}>나중에 할게요</Text>
        </Pressable>

        <Text style={styles.footnote}>
          로그인하지 않아도 진단·탐색·보관함은 모두 쓸 수 있어요.{"\n"}
          저장은 이 기기에만 남아요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 32 },
  heroTitle: { fontSize: 26, lineHeight: 34, fontWeight: "800", color: C.white, letterSpacing: -0.5 },
  heroBody: { marginTop: 12, fontSize: 14, lineHeight: 22, color: "rgba(255,255,255,0.88)" },
  panel: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  title: { fontSize: 22, lineHeight: 30, fontWeight: "700", color: C.ink, letterSpacing: -0.2 },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 22, color: C.label },
  kakao: {
    marginTop: 24,
    height: 52,
    borderRadius: R.lg,
    backgroundColor: "#FEE500",
    alignItems: "center",
    justifyContent: "center",
  },
  kakaoLabel: { fontSize: 15, fontWeight: "700", color: "#191600" },
  error: { marginTop: 8, fontSize: 13, fontWeight: "500", color: C.primaryDeep },
  later: { marginTop: 12, height: 52, alignItems: "center", justifyContent: "center" },
  laterLabel: { fontSize: 15, fontWeight: "600", color: C.muted },
  footnote: { marginTop: 20, fontSize: 12, lineHeight: 18, color: C.muted, textAlign: "center" },
});
