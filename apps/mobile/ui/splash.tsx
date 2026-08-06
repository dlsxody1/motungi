import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { C } from "@/ui/theme";

/**
 * 흩어진 선 → 모퉁이 마크로 수렴 → 압출(3D) 등장.
 * 3D는 실제 3D 엔진이 아니라 "정면 면 + 오프셋 측면 + 스펙큘러" 페이크다.
 * ponytail: SVG 페이크 압출. 실제 회전/조명 필요해지면 그때 three/GLB.
 */

/** 마크 정면(24x24 뷰박스): ㄴ자 코너 획 + 점. web-shell.tsx의 WebLogo와 동일 형상. */
const CORNER_D = "M6 20V6h14";
const DOT = { cx: 16.5, cy: 16, r: 2.4 };

/** 수렴 전 조각들이 출발하는 위치(dx, dy는 뷰박스 단위, 회전은 deg). 사방에서 모인다. */
const SHARDS = [
  { id: "a", d: "M6 20V13", from: [-46, 34, -22] },
  { id: "b", d: "M6 13V6", from: [-38, -40, 18] },
  { id: "c", d: "M6 6h7", from: [10, -52, -14] },
  { id: "d", d: "M13 6h7", from: [54, -30, 20] },
] as const;

const DEPTH = 4.5; // 최대 압출 깊이(24 뷰박스 단위)

/**
 * 압출 겹 — 뒤(k=1)에서 앞(k=0.12) 순으로 그려 가까운 면이 위에 오게 한다.
 * 색은 반투명이 아니라 **불투명 단계색**이다. 반투명 겹을 쌓으면 획이 겹치는 안쪽이
 * 누적 합성돼 새까만 쐐기로 뭉친다(획을 압출할 때의 함정). 불투명이면 앞 겹이 뒤 겹을
 * 그냥 덮으므로 합성이 일어나지 않고 옆면 계조만 남는다.
 */
const EXTRUDE_LAYERS = [
  { k: 1, c: "#6d1f31" },
  { k: 0.85, c: "#7c2438" },
  { k: 0.7, c: "#8b293f" },
  { k: 0.56, c: "#992e46" },
  { k: 0.42, c: "#a5324c" },
  { k: 0.27, c: "#ab3450" },
  { k: 0.12, c: "#b0344e" },
] as const;

/**
 * 마크 그라데이션. 조각마다 별도 SVG라 정의를 각자 들고 있어야 한다.
 * gradientUnits="userSpaceOnUse"가 핵심 — 기본값(objectBoundingBox)은 도형의 바운딩박스를
 * 기준으로 삼는데, 조각들은 완전한 직선이라 박스의 폭이나 높이가 0이다. 넓이 0인 박스에
 * 걸린 그라데이션은 아무것도 그리지 않아 획이 통째로 안 보인다.
 * 좌표를 뷰박스(0~24) 고정으로 두면 조각이 나뉘어 있어도 하나의 연속된 그라데이션으로 읽힌다.
 */
function MarkGradient({ id }: { id: string }) {
  return (
    <Defs>
      <SvgGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={C.sun} />
        <Stop offset="0.58" stopColor={C.primary} />
        <Stop offset="1" stopColor={C.purple} />
      </SvgGradient>
    </Defs>
  );
}

export function SplashMark({ size = 132, onDone }: { size?: number; onDone?: () => void }) {
  // 0 → 1: 조각 수렴, 1 → 2: 압출 + 워드마크
  const converge = useRef(new Animated.Value(0)).current;
  const extrude = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(converge, {
        toValue: 1,
        duration: 900,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(extrude, { toValue: 1, friction: 7, tension: 48, useNativeDriver: true }),
        Animated.timing(word, {
          toValue: 1,
          duration: 520,
          delay: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    anim.start(({ finished }) => finished && onDone?.());
    return () => anim.stop();
  }, [converge, extrude, word, onDone]);

  const px = (v: number) => (v / 24) * size; // 뷰박스 단위 → 화면 px

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size }}>
        {/*
          압출된 측면 — 마크를 깊이 축으로 여러 겹 얇게 밀어 쌓는다.
          한 장만 크게 offset하면 획 사이가 메워져 "두께"가 아니라 검은 삼각형으로 뭉친다.
          겹을 잘게 나누고 뒤로 갈수록 어둡게 해야 옆면(side wall)으로 읽힌다.
        */}
        {EXTRUDE_LAYERS.map((layer) => (
          <Animated.View
            key={layer.k}
            style={[
              StyleSheet.absoluteFill,
              {
                // 겹 자체는 불투명. 등장만 extrude로 페이드한다.
                opacity: extrude.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
                transform: [
                  {
                    translateX: extrude.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, px(DEPTH * layer.k)],
                    }),
                  },
                  {
                    translateY: extrude.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, px(DEPTH * layer.k)],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={size} height={size} viewBox="0 0 24 24">
              {/* fill="none" 필수 — SVG 기본 fill은 검정이라, 열린 ㄴ자 경로가 암묵적으로
                  닫히며 안쪽이 새까맣게 칠해진다(획만 원해도 fill을 꺼야 한다). */}
              <Path d={CORNER_D} fill="none" stroke={layer.c} strokeWidth={2.6} strokeLinecap="round" />
              <Circle {...DOT} fill={layer.c} />
            </Svg>
          </Animated.View>
        ))}

        {/* 정면 — 조각들이 각자 위치에서 날아와 제자리에 붙는다. */}
        {/*
          조각은 SVG <G> transform이 아니라 각자 Animated.View로 움직인다.
          react-native-svg의 web 렌더러는 rotate를 문자열로 파싱("...deg".endsWith)하는데
          Animated 보간값을 넘기면 angle.endsWith is not a function으로 죽는다.
          View transform은 RN이 직접 처리하므로 네이티브·웹 모두 안전하다.
        */}
        {SHARDS.map((s) => (
          <Animated.View
            key={s.d}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: converge,
                transform: [
                  {
                    translateX: converge.interpolate({
                      inputRange: [0, 1],
                      outputRange: [px(s.from[0]), 0],
                    }),
                  },
                  {
                    translateY: converge.interpolate({
                      inputRange: [0, 1],
                      outputRange: [px(s.from[1]), 0],
                    }),
                  },
                  {
                    rotate: converge.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${s.from[2]}deg`, "0deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={size} height={size} viewBox="0 0 24 24">
              <MarkGradient id={`face-${s.id}`} />
              <Path
                d={s.d}
                fill="none"
                stroke={`url(#face-${s.id})`}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
        ))}

        {/* 점은 수렴 끝물에 톡 나타난다. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: converge.interpolate({ inputRange: [0.7, 1], outputRange: [0, 1] }) },
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <MarkGradient id="face-dot" />
            <Circle {...DOT} fill="url(#face-dot)" />
          </Svg>
        </Animated.View>

        {/* 스펙큘러 — 획 위를 스치는 하이라이트. 3D의 "빛 받는 면" 역할. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: extrude.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.55, 0.28] }) },
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
              d={CORNER_D}
              fill="none"
              stroke={C.white}
              strokeWidth={0.9}
              strokeLinecap="round"
              translateX={-0.7}
              translateY={-0.7}
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.View
        style={{
          marginTop: 26,
          opacity: word,
          transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }}
      >
        <Text style={styles.word}>모퉁이</Text>
        <Text style={styles.tagline}>퇴근하고 뭐하지?</Text>
      </Animated.View>
    </View>
  );
}

/**
 * 스플래시 오버레이 — 앱 부팅 시 1회. 라우터 위를 덮으므로 아래 화면은
 * 그동안 정상적으로 마운트·페치된다(스플래시가 부팅을 막지 않는다).
 */
export function Splash({ onDone }: { onDone?: () => void }) {
  return (
    // 베이지 폐기 후 [C.bg, C.surfaceAlt]는 흰→거의 흰이라 그라디언트가 사라진다.
    // 스플래시는 브랜드 첫인상이라 중립 회색으로 때우지 않고 로즈 틴트로 내려앉게 한다
    // (tint는 배경·칩용 연한 로즈라 위 ink/muted 텍스트 대비도 그대로 유지된다).
    <LinearGradient colors={[C.surface, C.tint]} style={styles.screen}>
      <SplashMark onDone={onDone} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  word: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: C.ink, textAlign: "center" },
  tagline: { marginTop: 8, fontSize: 14, color: C.muted, textAlign: "center" },
});
