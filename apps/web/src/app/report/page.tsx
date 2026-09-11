"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { ReportDesktop } from "@/components/report-desktop";
import { ReportEmpty } from "@/components/report-empty";
import { ReportMobile } from "@/components/report-mobile";
import { ReportSkeleton } from "@/components/report-skeleton";
import { deadlineLabel, diagnosisSummaryChips, displayNameOf } from "@motungi/core";
import { useReportFallback } from "@/hooks/useReportFallback";
import { shareContent } from "@/lib/kakao";
import { SITE_URL } from "@/lib/seo";
import { useAppStore } from "@/store/useAppStore";

/**
 * A5 · 동네 리포트 (원픽 히어로) — 반응형.
 *
 * **이 파일은 컨테이너다** — 훅·파생값·콜백만 들고 마크업은 두 자식이 그린다.
 * `md:hidden`은 CSS라 모바일·데스크톱 트리가 **둘 다 마운트**되므로, 경계가 없으면
 * 한쪽만 바뀌어야 하는 변화에도 양쪽이 함께 다시 그려지고 비용도 두 배다
 * (`components/opportunity-detail.tsx`·`explore-list.tsx`가 같은 이유로 나뉜 선례).
 */
export default function ReportPage() {
  // 정상 경로에선 results가 이미 차 있어 조회 없음. 직접 진입 시에만 6건 fallback.
  const { items: fallbackItems, status: catalogStatus } = useReportFallback();
  const router = useRouter();
  const results = useAppStore((s) => s.results);
  const answers = useAppStore((s) => s.answers);
  const user = useAppStore((s) => s.user);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";

  /**
   * 원픽 id를 훅보다 **위에서** 구한다. 아래 early return이 있어서 여기서 못 구하면
   * 저장 여부 구독이 return 뒤로 밀리고 훅 순서가 깨진다.
   */
  const list = results.length > 0 ? results : fallbackItems;
  const onePick = list[0];

  /**
   * `s.savedIds`(배열)를 통째로 구독하지 마라. `toggleSaved`는 매번 새 배열을 만들므로
   * **아무 활동이나** 저장하는 순간 참조가 바뀌어 리포트 전체가 다시 렌더됐다.
   * 실제로 쓰는 건 아래 두 값뿐이고, 둘 다 원시값이라 내용이 같으면 리렌더가 없다.
   * (선례: components/opportunity-detail.tsx가 처음부터 boolean만 구독한다.)
   * 회귀는 `render-isolation.test.tsx`가 Thumbnail 렌더 수로 실측한다.
   */
  const savedCount = useAppStore((s) => s.savedIds.length);
  const onePickSaved = useAppStore((s) => (onePick ? s.savedIds.includes(onePick.id) : false));

  /**
   * memo된 자식에게 넘기는 콜백은 **영원히 같은 참조**여야 한다.
   * `useCallback([router])`로 두면 useRouter()가 새 객체를 주는 순간 콜백이 새로
   * 만들어지고, 그 하나 때문에 두 트리의 memo가 통째로 무너진다(explore에서 실측).
   * 훅이므로 아래 early return보다 위에 있어야 한다.
   */
  const routerRef = useRef(router);
  routerRef.current = router;
  const openDetail = useCallback((id: string) => routerRef.current.push(`/opportunity/${id}`), []);
  const onBack = useCallback(() => routerRef.current.back(), []);

  const pickRef = useRef(onePick);
  pickRef.current = onePick;
  const onToggleSaved = useCallback(() => {
    const cur = pickRef.current;
    if (cur) toggleSaved(cur.id);
  }, [toggleSaved]);
  const onShare = useCallback(() => {
    const cur = pickRef.current;
    if (!cur) return;
    void shareContent({
      title: cur.title,
      description: "모퉁이에서 발견한 우리 동네 활동",
      url: `${SITE_URL}/opportunity/${cur.id}`,
    });
  }, []);

  /**
   * `deadlineLabel`은 호출할 때마다 **새 객체**를 돌려준다. 그대로 넘기면 얕은 비교가
   * 매 렌더 깨져 두 트리의 memo가 아무것도 막지 못한다(상세 분할 때 실측으로 발견).
   * 내용이 같으면 같은 참조를 유지한다. 훅이므로 early return보다 위에 있어야 한다.
   */
  const today = new Date().toISOString().slice(0, 10);
  const rawDeadline = onePick?.deadline ? deadlineLabel(onePick.deadline, today) : null;
  const deadlineKey = rawDeadline
    ? `${rawDeadline.date}|${rawDeadline.dday}|${rawDeadline.past}`
    : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 내용(deadlineKey)으로 비교한다
  const deadline = useMemo(() => rawDeadline, [deadlineKey]);

  /**
   * `related`(slice)와 `summaryChips`(diagnosisSummaryChips)도 매 렌더 **새 배열**이다.
   * deadline과 같은 이유로 내용 기준으로 고정한다 — 안 그러면 memo 경계가 무력해진다.
   */
  const related = useMemo(() => list.slice(1), [list]);
  const rawChips = diagnosisSummaryChips(answers, onePick);
  const chipsKey = rawChips.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 내용(chipsKey)으로 비교한다
  const summaryChips = useMemo(() => rawChips, [chipsKey]);

  // 데이터가 없으면 원픽을 그릴 수 없다. 다만 "아직 안 불러옴"과 "없음"은 다른 사실이다 —
  // idle(=fallback 조회 중)에 "추천할 활동이 없어요"를 띄우는 건 거짓말이었다.
  const isError = catalogStatus === "error" || catalogStatus === "unconfigured";
  if (!onePick) {
    if (catalogStatus === "idle") return <ReportSkeleton dongName={dongName} />;
    return (
      <ReportEmpty
        status={catalogStatus}
        onRetry={() => router.push(isError ? "/loading" : "/diagnosis")}
        onExplore={() => router.push("/explore")}
      />
    );
  }

  const displayName = displayNameOf(user);

  return (
    <>
      <ReportMobile
        onePick={onePick}
        related={related}
        listCount={list.length}
        dongName={dongName}
        deadline={deadline}
        onBack={onBack}
        onOpenDetail={openDetail}
      />
      <ReportDesktop
        onePick={onePick}
        related={related}
        listCount={list.length}
        dongName={dongName}
        displayName={displayName}
        userName={user?.displayName}
        summaryChips={summaryChips}
        deadline={deadline}
        savedCount={savedCount}
        onePickSaved={onePickSaved}
        onShare={onShare}
        onToggleSaved={onToggleSaved}
        onOpenDetail={openDetail}
      />
    </>
  );
}
