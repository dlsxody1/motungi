/**
 * 전체 화면 에러·404 본문 — 웹 error.tsx / not-found.tsx / ErrorState와 같은 카피·구성.
 *
 * 라우트 에러 경계(ErrorBoundary)와 +not-found가 공유한다. 레이아웃이 던진 경우에도
 * 떠야 하므로 스토어·훅 의존 없이 props만 받는다. 404는 경보가 아니라 내비게이션 결과라
 * `alert`를 끈다(웹과 동일 — 로드 시 낭독은 소음).
 */
import { StyleSheet, View } from "react-native";
import { Screen, Button, Txt } from "./components";
import { C, S } from "./theme";

export interface ErrorScreenAction {
  label: string;
  onPress: () => void;
}

export function ErrorScreen({
  title,
  desc,
  action,
  secondary,
  alert = false,
}: {
  title: string;
  desc: string;
  action?: ErrorScreenAction;
  secondary?: ErrorScreenAction;
  alert?: boolean;
}) {
  return (
    <Screen>
      <View style={styles.body} accessibilityRole={alert ? "alert" : undefined}>
        <Txt preset="h2" style={styles.center}>
          {title}
        </Txt>
        <Txt preset="body" color={C.muted} style={styles.desc}>
          {desc}
        </Txt>
        {(action || secondary) && (
          <View style={styles.actions}>
            {action && <Button label={action.label} onPress={action.onPress} />}
            {secondary && <Button label={secondary.label} onPress={secondary.onPress} variant="ghost" />}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: S["3xl"] },
  center: { textAlign: "center" },
  desc: { textAlign: "center", marginTop: S.sm, maxWidth: 320 },
  actions: { marginTop: S["2xl"], alignSelf: "stretch", gap: S.md },
});
