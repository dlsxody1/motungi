/**
 * A5 · 동네 리포트 로딩 경계 — 라우트 전환 중(서버 컴포넌트 로드) 잠깐 비는 화면을 막는다.
 *
 * page.tsx도 조회 중(catalogStatus === "idle")엔 같은 ReportSkeleton을 그리지만,
 * 그건 클라이언트 컴포넌트가 이미 마운트된 뒤의 이야기다. 이 loading.tsx는 그보다
 * 앞선 라우트 전환 순간을 메운다. 실제 동네 이름은 아직 몰라(서버 컴포넌트라 스토어에
 * 접근 못 함) ReportSkeleton의 기본값("우리 동네")을 그대로 쓴다.
 */
import { ReportSkeleton } from "@/components/report-skeleton";

export default function ReportLoading() {
  return <ReportSkeleton />;
}
