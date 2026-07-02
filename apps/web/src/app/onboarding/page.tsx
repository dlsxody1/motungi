import { redirect } from "next/navigation";

/** A1 온보딩은 홈(/)으로 통합됨 — 반응형 랜딩/히어로가 홈에서 함께 렌더된다. */
export default function OnboardingPage() {
  redirect("/");
}
