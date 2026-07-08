import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initAuthListener } from "@/lib/auth";
import { C } from "@/ui/theme";

export default function RootLayout() {
  useEffect(() => initAuthListener(), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
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
