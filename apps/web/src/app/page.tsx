import { DIAGNOSIS_STEPS } from "@motungi/core";

/**
 * 스캐폴딩 확인용 플레이스홀더. 디자인/UI는 다음 단계에서.
 * 공용 패키지(@motungi/core) import가 웹에서 동작하는지만 증명한다.
 */
export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>모퉁이 Corner</h1>
      <p>내 동네 모퉁이에, 기회가 있다.</p>
      <p style={{ color: "#888" }}>
        프로젝트 스캐폴딩 완료 · 진단 {DIAGNOSIS_STEPS.length}문항 준비됨
      </p>
    </main>
  );
}
