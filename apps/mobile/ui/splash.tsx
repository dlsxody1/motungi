import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { C } from "@/ui/theme";

/**
 * 노을 토글 스플래시 — 낮(해쨍쨍) → "누름" → 노을 → 밤.
 *
 * 브랜드 마크를 3D로 세우던 옛 스플래시를 대신한다. 마크는 우리가 누군지만 말했지
 * 제품이 뭔지는 말하지 않았다. 해가 지는 2초가 "퇴근하고 뭐하지?"를 대신 말한다.
 *
 * 웹(apps/web/src/components/sunset-splash.tsx + globals.css의 `.sunset-toggle*`)과
 * **같은 타임라인·같은 색**이다. 한쪽을 고치면 다른 쪽도 고쳐야 한다.
 *
 * ⚠️ 색 전환은 보간이 아니라 **불투명 레이어 크로스페이드**다. RN에서 색 보간은
 *    useNativeDriver를 못 쓰고(JS 스레드에서 매 프레임 계산), 그라데이션은 애초에
 *    보간되지 않는다. opacity/transform만 움직이므로 전 구간 네이티브 드라이버로 돈다.
 */

/** 기준 단위(px) — 웹의 `--toggle-size`와 같은 역할. 레퍼런스의 em 값에 이걸 곱한다. */
const U = 38;
const TRACK_W = 5.625 * U;
const TRACK_H = 2.5 * U;
const KNOB_D = 3.375 * U;
const DISC_D = 2.125 * U;
/** 노브는 트랙보다 커서 위아래로 삐져나온다(레퍼런스 그대로). */
const KNOB_OFF = -((KNOB_D - TRACK_H) / 2);
const KNOB_TRAVEL = TRACK_W - 2 * KNOB_OFF - KNOB_D;

const CLOUD_FRONT = "#fff6ec";
const CLOUD_BACK = "#f0b184";
const SKY_DAY = ["#ffcb8d", "#efa054", "#e8834a"] as const;
const SKY_DUSK = ["#e8834a", "#c74b3e", "#9e2b41"] as const;
const SKY_NIGHT = ["#6b3d6e", "#4a3160", "#3d2b56"] as const;
const BG_DAY = "#fbe3cc";
const BG_NIGHT = "#2b1f3f";

/**
 * 구름 — 레퍼런스는 엘리먼트 하나에 box-shadow 15개를 얹어 그렸지만 RN은 다중 그림자를
 * 지원하지 않으므로 원(circle)으로 직접 그린다. 값은 그 box-shadow 목록을 그대로 옮긴 것:
 * `[중심 dx, 중심 dy, 반지름 추가분(spread), 앞구름인가]` (단위 em).
 *
 * 순서가 **그리는 순서**다 — CSS는 뒤쪽 그림자를 먼저(아래에) 깔고 엘리먼트 본체를 맨 위에
 * 올리므로, 목록을 뒤집고 본체를 마지막에 뒀다. 순서를 바꾸면 앞뒤 구름이 뒤집힌다.
 */
const CLOUD_BASE = { cx: 0.937, cy: 2.5, r: 0.625 };
const CLOUD_PUFFS: readonly (readonly [number, number, number, boolean])[] = [
  [4.125, -2.125, 0.437, false],
  [4, -0.625, 0, false],
  [4.625, -1.75, 0.437, true],
  [3.375, -0.437, 0, false],
  [4.5, -0.312, 0, true],
  [2.625, 0, 0, false],
  [3.625, -0.062, 0, true],
  [2, -0.312, 0, false],
  [2.937, 0.312, 0, true],
  [1.25, -0.062, 0, false],
  [2.187, 0, 0, true],
  [0.5, -0.125, 0, false],
  [1.437, 0.375, 0, true],
  [-0.312, -0.312, 0, false],
  [0.937, 0.312, 0, true],
  [0, 0, 0, true], // 본체 — 맨 위
];

/** 구름이 아래로 빠지는 거리 · 별이 위에서 내려오는 거리(em). */
const CLOUD_DROP = 3.437 * U;
const STARS_TOP = -TRACK_H;
const STARS_DROP = TRACK_H * 1.29;

const STARS_W = 2.75 * U;
const STARS_H = (STARS_W * 55) / 144;
const STARS_D =
  "M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z";

/**
 * 스플래시 오버레이 — 앱 부팅 시 1회. 라우터 위를 덮으므로 아래 화면은
 * 그동안 정상적으로 마운트·페치된다(스플래시가 부팅을 막지 않는다).
 *
 * 배경(밤으로 어두워지는 화면)과 토글이 **같은 `t` 하나**로 움직인다.
 * 둘을 각자 타이머로 돌렸더니 reduce-motion에서 토글만 밤이 되고 배경은 낮으로 남았다.
 */
export function Splash({ onDone }: { onDone?: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    let anim: Animated.CompositeAnimation | undefined;
    let skipTimer: ReturnType<typeof setTimeout> | undefined;

    const start = (reduce: boolean) => {
      if (!alive) return;
      if (reduce) {
        // 모션은 없애되 **끝 상태는 그대로 보여준다** — 정보 손실 없음.
        t.setValue(1);
        word.setValue(1);
        skipTimer = setTimeout(() => onDone?.(), 300);
        return;
      }
      anim = Animated.sequence([
        Animated.delay(450),
        // "누름" — 자동 재생이라 누른 사람이 없다. 이 0.25초가 유일한 눌림 신호다.
        Animated.timing(press, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(press, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(t, {
            toValue: 1,
            duration: 700,
            easing: Easing.bezier(0, -0.02, 0.4, 1.25),
            useNativeDriver: true,
          }),
          Animated.timing(word, {
            toValue: 1,
            duration: 520,
            delay: 550,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(250),
      ]);
      anim.start(({ finished }) => finished && onDone?.());
    };

    /**
     * reduce-motion 조회는 실패해도 **반드시 시퀀스가 시작돼야 한다.**
     * 스플래시는 라우터를 덮는 오버레이라 onDone이 안 불리면 앱이 영영 가려진다
     * (splash.test.tsx가 지키는 유일한 계약). 그래서 throw·reject 양쪽을 다 막는다.
     */
    try {
      Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
        .then((r) => start(Boolean(r)))
        .catch(() => start(false));
    } catch {
      start(false);
    }

    return () => {
      alive = false;
      anim?.stop();
      if (skipTimer) clearTimeout(skipTimer);
    };
  }, [t, press, word, onDone]);

  const lerp = (from: number, to: number, range: readonly [number, number] = [0, 1]) =>
    t.interpolate({ inputRange: [range[0], range[1]], outputRange: [from, to], extrapolate: "clamp" });

  return (
    <View style={[styles.screen, { backgroundColor: BG_DAY }]}>
      {/* 배경도 토글과 함께 낮 → 밤으로 넘어간다. 배경을 노을색으로 고정하면 같은 계열인
          낮 트랙이 배경에 묻힌다(웹에서 실측). 화면 전체가 하늘인 편이 대비도 살고
          "해가 진다"는 말도 커진다. 색 보간 대신 어두운 면을 위에 덮는다. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: BG_NIGHT, opacity: lerp(0, 1, [0.35, 0.95]), pointerEvents: "none" },
        ]}
      />

      <Animated.View
        style={[
          styles.track,
          { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.955] }) }] },
        ]}
      >
        {/* 하늘 3겹 — dusk가 먼저(0~0.35), night가 늦게(0.3~0.85) 올라온다. 그 시차가 노을이다. */}
        <Sky colors={SKY_DAY} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: lerp(0, 1, [0, 0.35]) }]}>
          <Sky colors={SKY_DUSK} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: lerp(0, 1, [0.3, 0.85]) }]}>
          <Sky colors={SKY_NIGHT} />
        </Animated.View>

        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ translateY: lerp(0, CLOUD_DROP) }] }]}
        >
          <Svg width={TRACK_W} height={TRACK_H}>
            {CLOUD_PUFFS.map((p, i) => (
              <Circle
                key={i}
                cx={(CLOUD_BASE.cx + p[0]) * U}
                cy={(CLOUD_BASE.cy + p[1]) * U}
                r={(CLOUD_BASE.r + p[2]) * U}
                fill={p[3] ? CLOUD_FRONT : CLOUD_BACK}
              />
            ))}
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.stars,
            { transform: [{ translateY: lerp(0, STARS_DROP) }] },
          ]}
        >
          <Svg width={STARS_W} height={STARS_H} viewBox="0 0 144 55">
            <Path d={STARS_D} fill={C.white} fillRule="evenodd" clipRule="evenodd" />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.knob,
            {
              transform: [
                {
                  // 누를 때 살짝 밀렸다가(press), 본 전환에서 끝까지 간다.
                  translateX: Animated.add(
                    lerp(0, KNOB_TRAVEL),
                    press.interpolate({ inputRange: [0, 1], outputRange: [0, 0.187 * U] }),
                  ),
                },
              ],
            },
          ]}
        >
          <View style={styles.disc}>
            {/* 달은 해 안에서 오른쪽 밖에 대기하다 밀려 들어온다(해가 overflow:hidden). */}
            <Animated.View style={[styles.moon, { transform: [{ translateX: lerp(DISC_D, 0) }] }]}>
              <View style={[styles.spot, { top: 0.75 * U, left: 0.312 * U, width: 0.75 * U, height: 0.75 * U }]} />
              <View style={[styles.spot, { top: 0.937 * U, left: 1.375 * U, width: 0.375 * U, height: 0.375 * U }]} />
              <View style={[styles.spot, { top: 0.312 * U, left: 0.812 * U, width: 0.25 * U, height: 0.25 * U }]} />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={{
          marginTop: 30,
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

function Sky({ colors }: { colors: readonly [string, string, string] }) {
  return (
    <LinearGradient
      colors={[...colors]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.45, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    overflow: "hidden",
  },
  stars: {
    position: "absolute",
    left: 0.312 * U,
    top: STARS_TOP,
    width: STARS_W,
    height: STARS_H,
  },
  knob: {
    position: "absolute",
    left: KNOB_OFF,
    top: KNOB_OFF,
    width: KNOB_D,
    height: KNOB_D,
    borderRadius: KNOB_D / 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    width: DISC_D,
    height: DISC_D,
    borderRadius: DISC_D / 2,
    backgroundColor: "#f5c451",
    overflow: "hidden",
  },
  moon: {
    width: "100%",
    height: "100%",
    borderRadius: DISC_D / 2,
    backgroundColor: "#c4c9d1",
  },
  spot: {
    position: "absolute",
    borderRadius: U,
    backgroundColor: "#959db1",
  },
  word: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: C.white,
    textAlign: "center",
  },
  tagline: { marginTop: 8, fontSize: 15, color: "rgba(255,255,255,0.85)", textAlign: "center" },
});
