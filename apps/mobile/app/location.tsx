import * as ExpoLocation from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { normalizeDong } from "@motungi/core";
import {
  DEFAULT_NEIGHBORHOOD,
  type NeighborhoodPick,
  POPULAR_NEIGHBORHOODS,
} from "@/data/opportunities";
import { type NeighborhoodSearchResult, reverseGeocode, searchNeighborhoods } from "@/lib/geo";
import { useAppStore } from "@/store/useAppStore";
import { Button, Chip, FlowHeader, Screen, Txt } from "@/ui/components";
import { CheckCircle, ChevronRight, Location, Search } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

/** 검색어 최소 길이 — 한 글자로는 조회하지 않는다(요청 폭주 방지 + 의미 없는 "결과 없음" 방지). */
const MIN_QUERY_LEN = 2;

function itemToPick(it: NeighborhoodSearchResult): NeighborhoodPick {
  return {
    admCode: it.admCode,
    dongName: it.dongName,
    region: it.sigungu,
    point: { lat: it.lat, lng: it.lng },
  };
}

/** A2 · 위치 / 동네 설정 */
export default function LocationScreen() {
  const router = useRouter();
  const setAnchor = useAppStore((s) => s.setAnchor);
  const [selected, setSelected] = useState<NeighborhoodPick>(DEFAULT_NEIGHBORHOOD);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NeighborhoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 검색어 디바운스(250ms). MIN_QUERY_LEN 미만이면 조회하지 않는다(요청 폭주 방지).
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    // 매 키 입력마다 새 컨트롤러를 만들고, 정리 함수에서 이전 요청을 실제로 abort한다.
    // 이전엔 `cancelled` 불리언으로 응답 반영만 막았을 뿐 네트워크 요청 자체는 계속
    // 나갔다 — 빠르게 타이핑하면 인플라이트 요청이 쌓이는 요청 폭주였다.
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const items = await searchNeighborhoods(q, ctrl.signal);
      // abort된 뒤에도 fetch가 resolve될 수 있으니(취소 타이밍에 따라) signal로 다시 확인한다.
      if (!ctrl.signal.aborted) {
        setResults(items);
        setSearching(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  const showDropdown = query.trim().length >= MIN_QUERY_LEN;

  const choose = (pick: NeighborhoodPick) => {
    setSelected(pick);
    setQuery("");
    setResults([]);
  };

  const start = () => {
    // 선택 동네를 집 앵커로 저장(좌표 주입). 리포트/스코어링의 distance 기준점.
    setAnchor("home", {
      dongName: selected.dongName,
      admCode: selected.admCode,
      region: selected.region,
      point: selected.point,
    });
    router.push("/diagnosis");
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setGeoError(null);
    try {
      // 영구 거부(status:"denied" & canAskAgain:false)면 request*를 불러도 OS가 조용히
      // 같은 결과만 반환한다(재프롬프트 없음) — 미리 조회해 그 경우만 별도 안내로 갈라낸다.
      const precheck = await ExpoLocation.getForegroundPermissionsAsync();
      if (precheck.status === "denied" && !precheck.canAskAgain) {
        setGeoError(
          "위치 권한이 꺼져 있어요. 설정 앱 > 개인정보 보호 > 위치 서비스에서 모퉁이 앱의 위치 접근을 허용하거나, 아래에서 동네를 직접 골라주세요.",
        );
        return;
      }
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError("위치 권한이 없어요. 아래에서 동네를 직접 골라주세요.");
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({});
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      // 좌표 → 행정동 역지오코딩. 성공하면 선택만 갱신하고 유저가 확인 후 시작하도록 둔다
      // (바로 넘기지 않음 — 위치가 제대로 잡혔는지 유저가 눈으로 확인).
      const geo = await reverseGeocode(point.lat, point.lng);
      setSelected({
        // NAVER는 "역삼1동"처럼 번호가 붙은 행정동명을 준다 — 검색 결과 표기와 맞춘다.
        dongName: geo?.dongName ? normalizeDong(geo.dongName) : "현재 위치",
        admCode: geo?.admCode ?? undefined,
        region: geo ? undefined : "좌표로 설정됨",
        point,
      });
      setQuery("");
      setResults([]);
    } catch {
      setGeoError("위치를 가져오지 못했어요. 아래에서 동네를 직접 골라주세요.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen>
      <FlowHeader title="동네 설정" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Txt preset="h1" style={{ marginTop: 8 }}>
          어느 동네 기준으로{"\n"}찾아드릴까요?
        </Txt>
        <Txt preset="body" color={C.muted} style={{ marginTop: 8 }}>
          설정한 동네가 추천의 기준이 돼요.
        </Txt>

        {/* 현재 위치로 찾기 */}
        <Pressable style={styles.locCard} onPress={useCurrentLocation} disabled={locating}>
          <View style={styles.locIcon}>
            <Location size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt preset="headline">{locating ? "위치 확인 중…" : "현재 위치로 찾기"}</Txt>
            <Txt preset="label" color={C.muted} style={{ marginTop: 2, fontWeight: "400" }}>
              위치 권한 → 행정동 자동 설정
            </Txt>
          </View>
          <ChevronRight size={20} color={C.faint} />
        </Pressable>

        {!!geoError && (
          <Txt preset="bodySm" color={C.primaryDeep} style={{ marginTop: 10 }}>
            {geoError}
          </Txt>
        )}

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
            placeholder="동네 또는 구 검색 (예: 역삼동, 강남구)"
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {showDropdown ? (
          /* 검색 결과 드롭다운 */
          <View style={styles.dropdown}>
            {searching && results.length === 0 ? (
              <Txt preset="bodySm" color={C.muted} style={styles.dropdownMsg}>검색 중…</Txt>
            ) : results.length > 0 ? (
              results.map((it) => (
                <Pressable
                  key={it.admCode}
                  style={styles.dropdownRow}
                  onPress={() => choose(itemToPick(it))}
                >
                  <Location size={16} color={C.faint} />
                  <Text style={{ fontSize: 15, fontWeight: "500", color: C.ink }}>{it.dongName}</Text>
                  <Text style={{ fontSize: 13, color: C.muted }}>{it.sigungu}</Text>
                </Pressable>
              ))
            ) : (
              <Txt preset="bodySm" color={C.muted} style={styles.dropdownMsg}>검색 결과가 없어요.</Txt>
            )}
          </View>
        ) : (
          <>
            <Txt preset="label" style={{ marginTop: 20, marginBottom: 10 }}>최근 · 인기 동네</Txt>
            <View style={styles.chips}>
              {POPULAR_NEIGHBORHOODS.map((n) => {
                const active = selected.dongName === n.dongName && !selected.admCode;
                return (
                  <Chip
                    key={n.dongName}
                    label={n.dongName}
                    active={active}
                    onPress={() => choose(n)}
                    leading={active ? <Location size={14} color={C.white} /> : undefined}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* 확인 배너 — 흰 박스 + 통일 border/shadow, 체크는 민트(빨강 지양) */}
        <View style={styles.banner}>
          <CheckCircle size={18} color={C.mint} />
          <Text style={{ fontSize: 14, color: C.label }}>
            {selected.region ? `${selected.region} ` : ""}
            <Text style={{ fontWeight: "700", color: C.ink }}>{selected.dongName}</Text> 선택됨
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
        <Button label={`${selected.dongName}으로 시작하기`} onPress={start} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  locCard: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.lineAlt,
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
    borderWidth: 1,
    borderColor: C.lineAlt,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink },
  dropdown: {
    marginTop: 8,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.lineAlt,
    backgroundColor: C.surface,
    overflow: "hidden",
    ...cardShadow,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownMsg: { paddingHorizontal: 16, paddingVertical: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  banner: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.lineAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...cardShadow,
  },
});
