import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchOpportunities, type MockOpportunity } from "@/data/opportunities";
import { Logo } from "@/ui/components";
import { HeroCarousel } from "@/ui/hero-carousel";
import { C } from "@/ui/theme";

const TEASERS = [
  { k: "마찰 제로", v: "진단 60초면 끝나요" },
  { k: "원픽", v: "수백 개 대신 딱 1~3개만" },
  { k: "하이퍼로컬", v: "내 동네 기준으로 추천돼요" },
];

/** 캐러셀이 성립하는 최소 건수 — 미만이면 TEASERS 폴백(웹 hero-poster-stage.tsx와 동일 기준). */
const MIN_HERO_PICKS = 4;

/** A1 · 온보딩 — 선셋 그라데이션 히어로 */
export default function OnboardingScreen() {
  const router = useRouter();
  const [heroPicks, setHeroPicks] = useState<MockOpportunity[]>([]);

  useEffect(() => {
    let alive = true;
    fetchOpportunities({ withImageOnly: true, limit: 12 }).then((r) => {
      if (alive && r.status === "ok") setHeroPicks(r.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const showHero = heroPicks.length >= MIN_HERO_PICKS;

  return (
    <LinearGradient
      colors={["#e25067", "#e05f67", "#f2a06a"]}
      locations={[0, 0.42, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.body}>
          <Logo onDark size={30} />

          <View style={{ marginTop: 56 }}>
            <Text style={styles.title}>퇴근하고{"\n"}뭐하지?</Text>
            <Text style={styles.sub}>
              퇴근 후·주말 내 동네에서 할 만한 것,{"\n"}딱 1~3개만 골라드려요.
            </Text>
          </View>

          {showHero ? (
            <View style={{ marginTop: 28 }}>
              <HeroCarousel items={heroPicks} />
            </View>
          ) : (
            <View style={{ marginTop: 32, gap: 14 }}>
              {TEASERS.map((t) => (
                <View key={t.k} style={styles.teaser}>
                  <Text style={styles.teaserK}>{t.k}</Text>
                  <Text style={styles.teaserV}>{t.v}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.cta} onPress={() => router.push("/location")}>
              <Text style={styles.ctaLabel}>내 동네에서 찾기</Text>
            </Pressable>
            {/* 예전엔 /report(진단 건너뛴 폴백 리포트)로 가는 죽은 링크였다.
                웹(apps/web/src/app/page.tsx)과 동일하게 /explore로 보내는 실제 둘러보기 경로로 교체(M-050). */}
            <Pressable style={styles.ghost} onPress={() => router.push("/explore")}>
              <Text style={styles.ghostLabel}>동네 활동 둘러보기</Text>
            </Pressable>
            <Text style={styles.caption}>로그인 없이 바로 시작 · 저장할 때만 가입</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: C.white, letterSpacing: -0.6 },
  sub: { marginTop: 16, fontSize: 15, lineHeight: 23, color: "rgba(255,255,255,0.85)" },
  teaser: { flexDirection: "row", alignItems: "baseline", gap: 12 },
  teaserK: { width: 78, fontSize: 14, fontWeight: "700", color: C.white },
  teaserV: { fontSize: 14, color: "rgba(255,255,255,0.75)" },
  actions: { marginTop: "auto", gap: 12 },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { fontSize: 16, fontWeight: "700", color: C.primaryDeep },
  ghost: { height: 44, alignItems: "center", justifyContent: "center" },
  ghostLabel: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  caption: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
});
