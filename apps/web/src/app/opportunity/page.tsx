import Link from "next/link";
import {
  ChevronLeftIcon,
  ExternalLinkIcon,
  LocationIcon,
  ShareIcon,
} from "@/components/icons";
import { BookmarkIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop, Tag } from "@/components/ui";
import { ONE_PICK } from "@/data/opportunities";

/** A6 · 기회 상세 */
export default function OpportunityPage() {
  const o = ONE_PICK;
  return (
    <MobileScreen>
      <div className="flex flex-1 flex-col bg-bg">
        <SafeTop />

        {/* 상단 바 */}
        <div className="flex items-center justify-between px-5 py-1">
          <Link href="/report" className="tap-safe -ml-2 flex w-11 items-center text-ink">
            <ChevronLeftIcon size={24} />
          </Link>
          <button className="tap-safe flex w-11 items-center justify-end text-ink">
            <ShareIcon size={22} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
          <div>
            <Tag>{o.categoryLabel}</Tag>
          </div>
          <h1 className="mt-3 text-[23px] font-extrabold leading-snug tracking-[-0.01em] text-ink">
            주말 오전, 동네 카페
            <br />
            오픈 바리스타 파트
          </h1>
          <p className="mt-2 flex items-center gap-1 text-[14px] text-muted">
            <LocationIcon size={16} className="text-primary" />
            망원동 · 집에서 도보 8분 반경
          </p>

          {/* 수입 카드 */}
          <div className="mt-4 rounded-xl bg-tint/60 p-4">
            <p className="text-[12px] font-semibold text-primary-deep/70">예상 월 수입</p>
            <p className="text-[30px] font-extrabold leading-tight text-primary-deep">
              {o.incomeLabel} <span className="text-[15px] font-bold text-muted">/ 월</span>
            </p>
            <div className="mt-2 h-px bg-primary/15" />
            <p className="mt-2 text-[13px] text-muted">
              시급 12,000원 × 주 8시간 × 4.3주 기준
            </p>
          </div>

          {/* 메타 3칸 */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {o.meta.map((m) => (
              <div
                key={m.label}
                className="rounded-xl bg-surface px-2 py-3 text-center shadow-card"
              >
                <p className="text-[11px] text-muted">{m.label}</p>
                <p className="mt-1 text-[15px] font-bold text-ink">{m.value}</p>
              </div>
            ))}
          </div>

          {/* 시작 방법 */}
          <h2 className="mb-3 mt-6 text-[17px] font-bold text-ink">시작 방법</h2>
          <ol className="space-y-4">
            {o.steps?.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-[14px] leading-relaxed text-label">{s}</span>
              </li>
            ))}
          </ol>

          <p className="mt-6 rounded-lg bg-surface-alt px-3.5 py-3 text-[12px] leading-relaxed text-muted">
            시작하기를 누르면 제휴 채널로 이동해요. 모퉁이는 중개·소개만 하며 근로계약의
            당사자가 아니에요.
          </p>
        </div>

        {/* 하단 액션 */}
        <div className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-2">
          <button className="tap-safe grid size-[52px] shrink-0 place-items-center rounded-xl border border-line bg-surface text-label">
            <BookmarkIcon size={22} />
          </button>
          <a
            href={o.ctaUrl}
            className="tap-safe flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-[16px] font-bold text-white"
          >
            시작하기
            <ExternalLinkIcon size={18} />
          </a>
        </div>
        <SafeBottom />
      </div>
    </MobileScreen>
  );
}
