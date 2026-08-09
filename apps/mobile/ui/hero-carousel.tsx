/**
 * 온보딩 히어로 캐러셀 — 실제 활동(image_url 있는 것)을 가로 스크롤 카드로 보여준다.
 *
 * 웹 hero-carousel.tsx의 3D/자동전환 없는 네이티브 대응물(M-033). RN에는 WebGL 스테이지
 * (hero-poster-stage.tsx)를 그대로 옮기지 않는다 — 여기선 단순 가로 스크롤로 충분하다.
 * 4건 미만이면 호출부(index.tsx)가 기존 TEASERS 폴백을 그대로 쓴다.
 */
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { MockOpportunity } from "@/data/opportunities";
import { C, R } from "./theme";

const CARD_WIDTH = 148;

function HeroCard({ item }: { item: MockOpportunity }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/opportunity", params: { id: item.id } })}
      style={styles.card}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.location?.dongName ?? ""} · {item.costLabel}
      </Text>
    </Pressable>
  );
}

/** 실 활동 캐러셀. 항목이 없으면(로딩 중 포함) 아무것도 렌더하지 않는다 — 폴백은 호출부 책임. */
export function HeroCarousel({ items }: { items: MockOpportunity[] }) {
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((o) => (
        <HeroCard key={o.id} item={o} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingRight: 8 },
  card: { width: CARD_WIDTH },
  image: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: R.lg,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  imageFallback: { backgroundColor: "rgba(255,255,255,0.25)" },
  title: { marginTop: 8, fontSize: 13, fontWeight: "700", color: C.white },
  meta: { marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.75)" },
});
