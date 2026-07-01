import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronRightIcon, LocationIcon, UserIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";

const MENU = [
  { label: "내 동네 관리", desc: "망원동 외 1곳" },
  { label: "알림 설정", desc: "새 기회 · 마감 임박" },
  { label: "설정", desc: "계정 · 개인정보" },
];

/** D1 · 마이 (간단 버전) */
export default function MyPage() {
  return (
    <MobileScreen>
      <div className="flex flex-1 flex-col bg-bg">
        <SafeTop />

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
          <h1 className="pt-1 text-[24px] font-extrabold text-ink">마이</h1>

          {/* 프로필 카드 */}
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card">
            <span className="grid size-12 place-items-center rounded-full bg-tint text-primary">
              <UserIcon size={26} />
            </span>
            <div className="flex-1">
              <p className="text-[16px] font-bold text-ink">도윤님</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                <LocationIcon size={14} className="text-primary" /> 망원동 기준 · 활동형
              </p>
            </div>
            <Link
              href="/diagnosis"
              className="rounded-pill bg-primary px-3.5 py-2 text-[13px] font-bold text-white"
            >
              재진단
            </Link>
          </div>

          {/* 메뉴 */}
          <div className="mt-4 divide-y divide-line-alt rounded-xl bg-surface shadow-card">
            {MENU.map((m) => (
              <button
                key={m.label}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{m.label}</span>
                  <span className="block text-[13px] text-muted">{m.desc}</span>
                </span>
                <ChevronRightIcon size={20} className="text-faint" />
              </button>
            ))}
          </div>
        </div>

        <BottomNav active="my" />
        <SafeBottom />
      </div>
    </MobileScreen>
  );
}
