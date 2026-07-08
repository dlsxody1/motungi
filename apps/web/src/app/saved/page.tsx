"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { BookmarkIcon, LocationIcon, SavingsIcon, UserIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { findOpportunity } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** A7 · 보관함 / 홈 — 반응형 */
export default function SavedPage() {
  const router = useRouter();
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const catalog = useAppStore((s) => s.catalog);
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";

  const items = savedIds
    .map((id) => catalog.find((o) => o.id === id) ?? findOpportunity(id))
    .filter((o): o is NonNullable<typeof o> => !!o);
  const openDetail = (id: string) => router.push(`/opportunity?id=${id}`);

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
              <div className="flex items-start justify-between pt-1">
                <div>
                  <h1 className="text-[22px] font-extrabold text-ink">보관함</h1>
                  <p className="mt-1 flex items-center gap-1 text-[14px] text-muted">
                    <LocationIcon size={15} className="text-primary" />
                    {dongName} 기준
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-surface-alt text-muted">
                  <UserIcon size={22} />
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-tint/60 p-4">
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-ink">이번 주 동네 다시 보기</p>
                  <p className="mt-0.5 text-[13px] text-muted">상황이 바뀌었나요? 60초면 재진단해요.</p>
                </div>
                <Link
                  href="/diagnosis"
                  className="tap-safe flex items-center rounded-pill bg-primary px-4 text-[14px] font-bold text-white"
                >
                  재진단
                </Link>
              </div>

              <div className="mb-1 mt-6 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-ink">저장한 활동</h2>
                <span className="text-[13px] text-muted">{items.length}개</span>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <BookmarkIcon size={28} className="text-faint" />
                  <p className="mt-1 text-[16px] font-bold text-ink">아직 저장한 활동이 없어요</p>
                  <p className="text-[13px] text-muted">마음에 드는 활동의 북마크를 눌러 담아두세요.</p>
                  <Link
                    href="/explore"
                    className="mt-3 flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-[14px] font-bold text-white"
                  >
                    둘러보기
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-line-alt">
                  {items.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openDetail(s.id)}
                      className="flex w-full items-start gap-3 py-4 text-left"
                    >
                      <div className="flex-1">
                        <p className={`text-[12px] font-bold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}>
                          {s.categoryLabel}
                        </p>
                        <p className="mt-1 text-[16px] font-bold text-ink">{s.title}</p>
                        <p className="mt-0.5 text-[13px] text-muted">{s.location?.dongName ?? ""}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className={`text-[15px] font-extrabold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}>
                          {s.costLabel}
                        </p>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaved(s.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              toggleSaved(s.id);
                            }
                          }}
                        >
                          <BookmarkIcon size={20} filled className="text-primary" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <BottomNav active="saved" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="explore">
        <WebContainer className="py-9">
          <div className="mx-auto max-w-[860px]">
            {/* 인사 헤더 */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-ink">보관함</h1>
                <p className="mt-1.5 flex items-center gap-1 text-[15px] text-muted">
                  <LocationIcon size={16} className="text-primary" />
                  {dongName} 기준
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-full bg-tint text-muted">
                <UserIcon size={24} />
              </span>
            </div>

            {/* 재진단 배너 */}
            <div className="mt-6 flex items-center gap-4 rounded-[18px] bg-tint/60 p-6">
              <div className="flex-1">
                <p className="text-[17px] font-bold text-ink">이번 주 동네 다시 보기</p>
                <p className="mt-1 text-[14px] text-muted">상황이 바뀌었나요? 60초면 재진단해요.</p>
              </div>
              <Link
                href="/diagnosis"
                className="flex h-11 items-center rounded-pill bg-primary px-6 text-[15px] font-bold text-white hover:bg-primary-deep"
              >
                재진단
              </Link>
            </div>

            {/* 저장한 활동 */}
            <div className="mb-3 mt-9 flex items-center justify-between">
              <h2 className="text-[19px] font-bold text-ink">저장한 활동</h2>
              <span className="text-[14px] text-muted">{items.length}개</span>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-[18px] bg-surface py-16 text-center shadow-web">
                <BookmarkIcon size={30} className="text-faint" />
                <p className="mt-1 text-[17px] font-bold text-ink">아직 저장한 활동이 없어요</p>
                <p className="text-[14px] text-muted">마음에 드는 활동의 북마크를 눌러 담아두세요.</p>
                <Link
                  href="/explore"
                  className="mt-3 flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-[14px] font-bold text-white hover:bg-primary-deep"
                >
                  둘러보기
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openDetail(s.id)}
                    className="wcard-hover flex flex-col rounded-[18px] bg-surface p-5 text-left shadow-web"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`grid size-10 place-items-center rounded-xl ${
                          s.tone === "mint" ? "bg-mint-tint text-mint" : "bg-tint text-primary"
                        }`}
                      >
                        <SavingsIcon size={20} />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaved(s.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            toggleSaved(s.id);
                          }
                        }}
                      >
                        <BookmarkIcon size={20} filled className="text-primary" />
                      </span>
                    </div>
                    <p className={`mt-3 text-[12px] font-bold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}>
                      {s.categoryLabel}
                    </p>
                    <p className="mt-1 flex-1 text-[17px] font-bold text-ink">{s.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted">{s.location?.dongName ?? ""}</p>
                    <p
                      className={`mt-3 border-t border-line-alt pt-3 text-[18px] font-extrabold ${
                        s.tone === "mint" ? "text-mint" : "text-primary"
                      }`}
                    >
                      {s.costLabel}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
