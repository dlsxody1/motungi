import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, Txt } from "@/ui/components";
import { CheckCircle, ChevronLeft } from "@/ui/icons";
import { C, R, cardShadow } from "@/ui/theme";

type Option = { value: string; title: string; desc: string; soon?: boolean };
type Question = { eyebrow: string; title: string; hint: string; auto: boolean; options: Option[] };

const QUESTIONS: Question[] = [
  {
    eyebrow: "Q1. 관심사",
    title: "퇴근하고 뭐 하고 싶으세요?",
    hint: "끌리는 걸 하나 골라주세요. 그쪽부터 골라드려요.",
    auto: false,
    options: [
      { value: "culture", title: "문화·공연", desc: "전시 · 공연 · 영화" },
      { value: "active", title: "운동·산책", desc: "러닝 · 걷기길 · 클래스" },
      { value: "food", title: "먹거리·마켓", desc: "맛집 · 야시장 · 플리마켓" },
      { value: "side_job", title: "가벼운 부업", desc: "퇴근 후 파트 · 단기" },
    ],
  },
  {
    eyebrow: "Q2. 시간대",
    title: "주로 언제 시간이 나세요?",
    hint: "퇴근 후·주말 중 즐기기 좋은 걸 맞춰드려요.",
    auto: true,
    options: [
      { value: "weekday_evening", title: "평일 저녁", desc: "퇴근 후 2~3시간" },
      { value: "weekend", title: "주말", desc: "토·일 오전/오후" },
      { value: "flexible", title: "유연하게", desc: "그때그때 가능한 시간" },
    ],
  },
  {
    eyebrow: "Q3. 에너지",
    title: "요즘 에너지는 어떠세요?",
    hint: "무리 없는 강도로 맞춰드려요.",
    auto: false,
    options: [
      { value: "drained", title: "방전형", desc: "가볍게 · 앉아서 쉬듯" },
      { value: "moderate", title: "보통", desc: "적당한 활동까지 OK" },
      { value: "active", title: "활동형", desc: "몸 좀 움직이고 싶어요" },
    ],
  },
];

export default function DiagnosisScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const q = QUESTIONS[step]!;
  const total = QUESTIONS.length;
  const selected = answers[step];

  const goNext = () => {
    if (step < total - 1) setStep(step + 1);
    else router.push("/loading");
  };
  const goBack = () => {
    if (step === 0) router.back();
    else setStep(step - 1);
  };
  const pick = (value: string, soon?: boolean) => {
    if (soon) return;
    setAnswers((a) => ({ ...a, [step]: value }));
    if (q.auto) setTimeout(goNext, 260);
  };

  return (
    <Screen>
      {/* 진행바 */}
      <View style={styles.progressRow}>
        <Pressable onPress={goBack} hitSlop={8} style={{ width: 36, marginLeft: -8 }}>
          <ChevronLeft size={22} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((step + 1) / total) * 100}%` }]} />
        </View>
        <Text style={styles.count}>{step + 1} / {total}</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        <Txt preset="label" color={C.primary} style={{ fontWeight: "700" }}>{q.eyebrow}</Txt>
        <Txt preset="h1" style={{ marginTop: 6, fontSize: 24 }}>{q.title}</Txt>
        <Txt preset="bodySm" color={C.muted} style={{ marginTop: 8 }}>{q.hint}</Txt>

        <View style={{ marginTop: 20, gap: 12 }}>
          {q.options.map((o) => {
            const on = selected === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => pick(o.value, o.soon)}
                disabled={o.soon}
                style={[
                  styles.opt,
                  o.soon
                    ? { backgroundColor: "rgba(241,237,230,0.7)" }
                    : { backgroundColor: C.surface, ...cardShadow },
                  on && { borderColor: C.primary, borderWidth: 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optTitle, { color: o.soon ? C.faint : C.ink }]}>
                    {o.title}
                  </Text>
                  {!!o.desc && <Text style={styles.optDesc}>{o.desc}</Text>}
                </View>
                {o.soon ? (
                  <View style={styles.soon}>
                    <Text style={styles.soonLabel}>준비중</Text>
                  </View>
                ) : (
                  on && <CheckCircle size={22} color={C.primary} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: "auto", paddingBottom: 16 }}>
          {q.auto ? (
            <Text style={styles.autoHint}>선택하면 다음 질문으로 넘어가요</Text>
          ) : (
            <Pressable
              onPress={goNext}
              disabled={!selected}
              style={[styles.resultBtn, { opacity: selected ? 1 : 0.4 }]}
            >
              <Text style={styles.resultLabel}>결과 보기</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 8 },
  track: { flex: 1, height: 6, borderRadius: 999, backgroundColor: C.lineAlt, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: C.primary },
  count: { fontSize: 13, fontWeight: "600", color: C.muted },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: R.xl,
    padding: 16,
    borderColor: "transparent",
    borderWidth: 1,
  },
  optTitle: { fontSize: 16, fontWeight: "700" },
  optDesc: { marginTop: 2, fontSize: 13, color: C.muted },
  soon: { backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: 8, paddingVertical: 4 },
  soonLabel: { fontSize: 11, fontWeight: "600", color: C.muted },
  autoHint: { textAlign: "center", fontSize: 13, color: C.muted },
  resultBtn: { height: 52, borderRadius: R.lg, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  resultLabel: { fontSize: 16, fontWeight: "700", color: C.white },
});
