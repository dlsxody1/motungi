import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { BookmarkIcon, LocationIcon, UserIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";

const SAVED = [
  {
    id: "cafe-barista",
    categoryLabel: "동네 기반 부업",
    title: "주말 오전 카페 바리스타 파트",
    meta: "망원동 · 도보 8분",
    income: "+48만/월",
    tone: "brand" as const,
  },
  {
    id: "youth-rent",
    categoryLabel: "내게 맞는 지원금",
    title: "청년 월세 한시 특별지원",
    meta: "마포구 · 만 19~34세",
    income: "연 240만",
    tone: "mint" as const,
  },
];

/** A7 · 보관함 / 홈 */
export default function SavedPage() {
  return (
    <MobileScreen>
      <div className="flex flex-1 flex-col bg-bg">
        <SafeTop />

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
          {/* 헤더 */}
          <div className="flex items-start justify-between pt-1">
            <div>
              <h1 className="text-[22px] font-extrabold text-ink">도윤님, 안녕하세요</h1>
              <p className="mt-1 flex items-center gap-1 text-[14px] text-muted">
                <LocationIcon size={15} className="text-primary" />
                망원동 기준
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-surface-alt text-muted">
              <UserIcon size={22} />
            </span>
          </div>

          {/* 재진단 배너 */}
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-tint/60 p-4">
            <div className="flex-1">
              <p className="text-[15px] font-bold text-ink">이번 주 동네 기회 다시 보기</p>
              <p className="mt-0.5 text-[13px] text-muted">
                상황이 바뀌었나요? 60초면 재진단해요.
              </p>
            </div>
            <Link
              href="/diagnosis"
              className="tap-safe flex items-center rounded-pill bg-primary px-4 text-[14px] font-bold text-white"
            >
              재진단
            </Link>
          </div>

          {/* 저장한 기회 */}
          <div className="mb-1 mt-6 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-ink">저장한 기회</h2>
            <span className="text-[13px] text-muted">{SAVED.length}개</span>
          </div>

          <div className="divide-y divide-line-alt">
            {SAVED.map((s) => (
              <Link key={s.id} href="/opportunity" className="flex items-start gap-3 py-4">
                <div className="flex-1">
                  <p
                    className={`text-[12px] font-bold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}
                  >
                    {s.categoryLabel}
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{s.meta}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p
                    className={`text-[15px] font-extrabold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}
                  >
                    {s.income}
                  </p>
                  <BookmarkIcon size={20} filled className="text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <BottomNav active="saved" />
        <SafeBottom />
      </div>
    </MobileScreen>
  );
}
