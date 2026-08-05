import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initAuthListener } from "@/lib/auth";
import { Splash } from "@/ui/splash";
import { C } from "@/ui/theme";

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
