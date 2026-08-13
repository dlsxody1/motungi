/**
 * 활동 카드 썸네일(RN) — 대표 이미지(imageUrl)가 있으면 그대로 보여주고,
 * 없거나 로드에 실패하면 카테고리 톤의 플레이스홀더 면으로 대체한다.
 *
 * 웹 thumbnail.tsx(apps/web/src/components/thumbnail.tsx)의 RN 대응물(M-051).
 * RN 기본 내장 Image + onError 폴백 — 히어로 캐러셀(ui/hero-carousel.tsx)의
 * 기존 패턴을 그대로 따른다. 새 패키지/네이티브 의존성 없음.
 *
 * 크기는 호출부가 `style`로 고정폭/높이(또는 aspectRatio)를 넘긴다 — 이 컴포넌트
 * 자체는 컨테이너를 그 크기로 채우기만 해서, 이미지 로드 전/후 레이아웃이 흔들리지 않는다.
 */
import { useState } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { C, R } from "./theme";

/** 카테고리 톤 → 플레이스홀더 배경색. web TONE_BG의 그라데이션 대신 RN에선 단색 tint로 근사. */
const TONE_BG: Record<"brand" | "mint", string> = {
  brand: C.tint,
  mint: C.mintTint,
};

export function Thumbnail({
  imageUrl,
  tone = "brand",
  style,
}: {
  imageUrl?: string;
  tone?: "brand" | "mint";
  /** 컨테이너 크기(고정 width/height 또는 aspectRatio) + 모서리 반경 등 — 호출부가 지정 */
  style?: StyleProp<ViewStyle>;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = !!imageUrl && !broken;

  return (
    <View style={[styles.container, { backgroundColor: TONE_BG[tone] }, style]}>
      {showImage && (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          onError={() => setBroken(true)}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", borderRadius: R.md },
  image: { width: "100%", height: "100%" },
});
