/**
 * 마감 임박도 배지. D-day에 따라 톤이 달라진다:
 * 지남=회색, 임박(≤3일)=강조, 여유=은은. `deadlineLabel` 결과를 그대로 받는다.
 *
 * 상세(opportunity-detail)와 리포트(app/report/page.tsx)에 **같은 구현이 복붙돼 있었다.**
 * 한쪽 톤 기준만 고치면 두 화면의 마감 표시가 조용히 갈라지므로 파일로 뽑았다.
 * (mobile app/opportunity.tsx에도 같은 규칙이 있지만 RN이라 마크업을 공유할 수 없다 —
 * 톤 기준을 바꿀 땐 그쪽도 함께 고쳐야 한다.)
 */
export function DdayPill({ deadline }: { deadline: { dday: number; past: boolean } }) {
  const { dday, past } = deadline;
  const text = past ? "마감" : dday === 0 ? "오늘 마감" : `D-${dday}`;
  const tone = past
    ? "bg-gray-100 text-muted"
    : dday <= 3
      ? "bg-primary text-white"
      : "bg-tint text-primary-deep";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{text}</span>;
}
