/**
 * 장소 지도 카드 — 모바일판(M-052). 웹 VenueMap(apps/web/src/components/venue-map.tsx)의
 * NAVER SDK 지도 자체는 옮기지 않는다 — 대신 웹 VenueMap이 "SDK 미준비/미설정" 시
 * 이미 자체 열화 상태로 쓰고 있는 딥링크 UI(`hasCoords` 가드 + 동일 URL 스킴)를
 * 재사용하고, 걷기길처럼 경로가 있는 경우엔 좌표를 정규화한 추상 SVG 미리보기를 더한다.
 *
 * 왜 이 형태인가(M-052, 08-13~09-09 28일 연속 기각 배경) — 세 경로 모두 무인 야간
 * 실행에 부적합했다: (1) react-native-maps는 신규 네이티브 의존성이라 Expo
 * prebuild/EAS + 사람 승인이 필요하다. (2) NAVER 정적지도 백엔드 프록시 신설은 없는
 * NCP 자격증명이 필요하다. (3) 키리스 서드파티 정적지도는 security-policy.md의
 * NAVER-only 프록시 원칙을 위반한다. 이 컴포넌트는 신규 의존성·신규 시크릿·신규
 * 외부 서비스 없이 세 차단을 모두 피한다 — 이미 앱에 있는 react-native-svg와
 * 웹이 이미 쓰고 있는 딥링크 URL 스킴만 재사용한다.
 *
 * 좌표가 없으면(공공 데이터에 좌표 누락) 아무것도 렌더하지 않는다 → 호출부에서 조건부 배치.
 */
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ExternalLink, Location } from "./icons";
import { C, R, cardShadow } from "./theme";

export interface VenueMapProps {
  lat?: number | null;
  lng?: number | null;
  /** 딥링크 라벨(활동 제목) */
  title: string;
  /** 장소명(있으면 딥링크 검색어로 사용, 없으면 title) */
  placeName?: string;
  /** 산책로 코스 경로 [[lat, lng], ...]. 2점 이상이면 추상 SVG 미리보기를 그린다. */
  routePoints?: [number, number][];
}

/** 폴리라인 미리보기 SVG viewBox 크기(정사각형, 여백 포함). */
const PREVIEW_SIZE = 240;
const PREVIEW_PADDING = 16;

export function VenueMap({ lat, lng, title, placeName, routePoints }: VenueMapProps) {
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasCoords) return null;

  // 딥링크 — 키 없이도 열린다. 웹 venue-map.tsx와 byte-identical 스킴(장소명 검색).
  const query = encodeURIComponent(placeName || title);
  const naverMapUrl = `https://map.naver.com/p/search/${query}`;

  const pathD = routePoints && routePoints.length >= 2 ? buildPreviewPath(routePoints) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Location size={20} color={C.primary} />
        <Text style={styles.placeName} numberOfLines={1}>
          {placeName || title}
        </Text>
      </View>

      {pathD && (
        <View style={styles.previewWrap} testID="route-preview">
          <Svg width="100%" height={PREVIEW_SIZE} viewBox={`0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}`}>
            <Path
              d={pathD}
              stroke={C.primary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      )}

      <Pressable
        style={styles.deepLinkBtn}
        onPress={() => {
          void Linking.openURL(naverMapUrl);
        }}
        accessibilityRole="button"
        accessibilityLabel="네이버 지도에서 열기"
      >
        <Text style={styles.deepLinkText}>네이버 지도에서 열기</Text>
        <ExternalLink size={15} color={C.label} />
      </Pressable>
    </View>
  );
}

/**
 * lat/lng 좌표를 min/max 기반으로 정사각형 SVG viewBox에 정규화한다.
 * 이건 지도가 아니라 "코스 모양이 있다"는 것만 보여주는 추상 미리보기다 — 실제
 * 축척·방위와 무관하므로 georeferenced 지도로 오해되지 않게 딥링크와 함께만 노출한다.
 */
function buildPreviewPath(points: [number, number][]): string {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;
  const inner = PREVIEW_SIZE - PREVIEW_PADDING * 2;

  const coords = points.map(([la, ln]) => {
    const x = PREVIEW_PADDING + ((ln - minLng) / lngRange) * inner;
    // 위도는 화면 좌표계와 방향이 반대(북=위)라 뒤집는다.
    const y = PREVIEW_PADDING + (1 - (la - minLat) / latRange) * inner;
    return [x, y] as const;
  });

  const [first, ...rest] = coords;
  if (!first) return "";
  const start = `M ${first[0]},${first[1]}`;
  const segments = rest.map(([x, y]) => `L ${x},${y}`).join(" ");
  return `${start} ${segments}`.trim();
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.lineAlt,
    overflow: "hidden",
    ...cardShadow,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  placeName: { flex: 1, fontSize: 14, fontWeight: "700", color: C.ink },
  previewWrap: {
    marginTop: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deepLinkBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: C.lineAlt,
    paddingVertical: 12,
  },
  deepLinkText: { fontSize: 13, fontWeight: "700", color: C.label },
});
