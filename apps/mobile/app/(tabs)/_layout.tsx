import { Tabs } from "expo-router";
import { Bookmark, Compass, Home, User } from "@/ui/icons";
import { C } from "@/ui/theme";

/** 하단 탭바 — 홈(리포트) · 탐색 · 보관함 · 마이 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.lineAlt,
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="report"
        options={{ title: "홈", tabBarIcon: ({ color }) => <Home size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "탐색", tabBarIcon: ({ color }) => <Compass size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="saved"
        options={{ title: "보관함", tabBarIcon: ({ color }) => <Bookmark size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="my"
        options={{ title: "마이", tabBarIcon: ({ color }) => <User size={24} color={color} /> }}
      />
    </Tabs>
  );
}
