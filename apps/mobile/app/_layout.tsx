import { router, Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initAuthListener } from "@/lib/auth";
import { ErrorScreen } from "@/ui/error-state";
import { Splash } from "@/ui/splash";
import { C } from "@/ui/theme";

/**
 * 라우트 에러 경계 — 렌더 중 던져진 예외를 받는다(expo-router가 이 export를 자동 인식).
 * 웹 error.tsx와 같은 카피. 레이아웃 자체가 던질 수 있어 훅(useRouter) 대신 전역 router를 쓴다.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ErrorScreen
      alert
      title="문제가 생겼어요"
      desc="잠시 후 다시 시도해 주세요. 계속 이러면 잠깐 뒤에 다시 들러주세요."
      action={{ label: "다시 시도", onPress: () => void retry() }}
      secondary={{ label: "홈으로", onPress: () => router.replace("/") }}
    />
  );
}

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  useEffect(() => initAuthListener(), []);
  const done = useCallback(() => setBooted(true), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!booted && <Splash onDone={done} />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: "slide_from_right",
        }}
      />
    </SafeAreaProvider>
  );
}
