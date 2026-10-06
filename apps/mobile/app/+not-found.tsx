/**
 * 404 — 매칭되지 않는 딥링크(옛 공유 URL 등)가 떨어지는 화면. 웹 not-found.tsx와 같은 카피.
 * 없으면 expo-router 기본 영문 화면이 뜬다.
 */
import { useRouter } from "expo-router";
import { ErrorScreen } from "@/ui/error-state";

export default function NotFound() {
  const router = useRouter();
  return (
    <ErrorScreen
      title="페이지를 찾을 수 없어요"
      desc="주소가 바뀌었거나 사라진 페이지예요. 홈에서 다시 시작해보세요."
      action={{ label: "홈으로", onPress: () => router.replace("/") }}
      secondary={{ label: "탐색 둘러보기", onPress: () => router.replace("/explore") }}
    />
  );
}
