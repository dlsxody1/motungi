"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import {
  BookmarkIcon,
  LocationIcon,
  UserIcon,
} from "@/components/icons";
import { Thumbnail } from "@/components/thumbnail";
import { MobileScreen, SafeBottom, SafeTop, Skeleton } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { useSavedOpportunities } from "@/hooks/useSavedOpportunities";
import { useAppStore } from "@/store/useAppStore";

/** A7 · 보관함 / 홈 — 반응형 */
export default function SavedPage() {
  const router = useRouter();
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const savedIds = useAppStore((s) => s.savedIds);
  const user = useAppStore((s) => s.user);
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "우리 동네";

  // 저장 id를 id 조회로 해소한다 — 300건 창 밖이라고 사라지지 않는다(useSavedOpportunities 주석).
  // status를 버리면 **조회 실패가 "저장한 게 없어요"로 보인다** — 사용자에게 틀린 정보다.
  const { items, status, retry } = useSavedOpportunities();
  const failed = status === "error";
  const openDetail = (id: string) => router.push(`/opportunity/${id}`);

  /**
   * 로딩 중 자리표시자 개수 = 저장했지만 아직 해소 안 된 건수.
   * 훅이 부분 결과를 주므로(받은 건 진짜 카드, 못 받은 건 스켈레톤) 개수가 정확히 맞고,
   * 도착할 때마다 스켈레톤이 하나씩 카드로 바뀐다.
   */
  const pendingCount = status === "loading" ? savedIds.length - items.length : 0;

  // 실패했을 땐 개수를 못 세므로 숫자를 숨긴다(0개라고 단언하면 그 자체가 거짓말).
  // 로딩 중엔 저장 id 수가 곧 최종 개수다 — items.length는 아직 차는 중이라 숫자가 튄다.
  const countLabel = failed ? "" : `${status === "loading" ? savedIds.length : items.length}개`;

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden" data-testid="saved-mobile">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-4">
              <div className="flex items-start justify-between pt-1">
                <div>
                  <h1 className="text-[22px] font-extrabold text-ink">
                    보관함
                  </h1>
                  <p className="mt-1 flex items-center gap-1 text-[14px] text-muted">
                    <LocationIcon size={15} className="text-primary" />
                    {dongName} 기준
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-surface-alt text-muted">
                  <UserIcon size={22} />
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-line-alt bg-surface p-4 shadow-card">
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-ink">
                    이번 주 동네 다시 보기
                  </p>
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

              <div className="mb-1 mt-6 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-ink">저장한 활동</h2>
                <span className="text-[13px] text-muted">{countLabel}</span>
              </div>

              {failed ? (
                <div className="py-12" role="alert">
                  <p className="text-center text-[16px] font-bold text-ink">
                    저장한 활동을 불러오지 못했어요
                  </p>
                  <p className="mt-1 text-center text-[13px] text-muted">
                    저장한 목록은 그대로예요. 잠시 후 다시 시도해 주세요.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={retry}
                      className="tap-safe flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-[14px] font-bold text-white"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : items.length === 0 && pendingCount === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <BookmarkIcon size={28} className="text-faint" />
                  <p className="mt-1 text-[16px] font-bold text-ink">
                    아직 저장한 활동이 없어요
                  </p>
                  <p className="text-[13px] text-muted">
                    마음에 드는 활동의 북마크를 눌러 담아두세요.
                  </p>
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
                    <div
                      key={s.id}
                      className="flex w-full items-center gap-3 py-4"
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(s.id)}
                        aria-label={`${s.title} 상세 보기`}
                        className="flex flex-1 items-start gap-3 text-left"
                      >
                        <div className="flex-1">
                          <p
                            className={`text-[12px] font-bold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}
                          >
                            {s.categoryLabel}
                          </p>
                          <p className="mt-1 text-[16px] font-bold text-ink">
                            {s.title}
                          </p>
                          <p className="mt-0.5 text-[13px] text-muted">
                            {s.location?.dongName ?? ""}
                          </p>
                        </div>
                        <p
                          className={`text-[15px] font-extrabold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}
                        >
                          {s.costLabel}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSaved(s.id)}
                        aria-label="저장 취소"
                        aria-pressed={true}
                        className="shrink-0"
                      >
                        <BookmarkIcon
                          size={20}
                          filled
                          className="text-primary"
                        />
                      </button>
                    </div>
                  ))}
                  {/* 아직 못 받은 저장 항목 자리 — 도착하는 대로 하나씩 카드로 바뀐다. */}
                  {pendingCount > 0 && (
                    <div aria-busy="true" aria-live="polite">
                      <span className="sr-only">저장한 활동을 불러오는 중</span>
                      {Array.from({ length: pendingCount }, (_, i) => (
                        <div key={i} className="flex w-full items-start gap-3 py-4">
                          <div className="flex-1">
                            <Skeleton className="h-3.5 w-20" />
                            <Skeleton className="mt-2 h-4 w-[80%]" />
                            <Skeleton className="mt-2 h-3 w-1/3" />
                          </div>
                          <Skeleton className="mt-1 h-4 w-14 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <BottomNav active="saved" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <div data-testid="saved-desktop">
        <DesktopShell
          active="saved"
          dongName={dongName}
          userName={user?.displayName}
        >
          <WebContainer className="py-9">
            <div className="mx-auto max-w-[860px]">
              {/* 인사 헤더 */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-ink">
                    보관함
                  </h1>
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
              <div className="mt-6 flex items-center gap-4 rounded-[18px] border border-line-alt bg-surface p-6 shadow-web">
                <div className="flex-1">
                  <p className="text-[17px] font-bold text-ink">
                    이번 주 동네 다시 보기
                  </p>
                  <p className="mt-1 text-[14px] text-muted">
                    상황이 바뀌었나요? 60초면 재진단해요.
                  </p>
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
                <span className="text-[14px] text-muted">{countLabel}</span>
              </div>

              {failed ? (
                // 상태 박스는 흰 surface — tint/로즈 배경은 경고처럼 읽힌다(DESIGN.md).
                <div
                  className="flex flex-col items-center gap-2 rounded-[18px] bg-surface py-16 text-center shadow-web"
                  role="alert"
                >
                  <p className="text-[17px] font-bold text-ink">저장한 활동을 불러오지 못했어요</p>
                  <p className="text-[14px] text-muted">
                    저장한 목록은 그대로예요. 잠시 후 다시 시도해 주세요.
                  </p>
                  <button
                    type="button"
                    onClick={retry}
                    className="tap-safe mt-3 flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-[14px] font-bold text-white hover:bg-primary-deep"
                  >
                    다시 시도
                  </button>
                </div>
              ) : items.length === 0 && pendingCount === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-[18px] bg-surface py-16 text-center shadow-web">
                  <BookmarkIcon size={30} className="text-faint" />
                  <p className="mt-1 text-[17px] font-bold text-ink">
                    아직 저장한 활동이 없어요
                  </p>
                  <p className="text-[14px] text-muted">
                    마음에 드는 활동의 북마크를 눌러 담아두세요.
                  </p>
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
                    <div
                      key={s.id}
                      className="wcard-hover relative flex flex-col rounded-[18px] bg-surface p-5 shadow-web"
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(s.id)}
                        aria-label={`${s.title} 상세 보기`}
                        className="flex flex-1 flex-col text-left"
                      >
                        <Thumbnail
                          src={s.imageUrl}
                          tone={s.tone === "mint" ? "mint" : "brand"}
                          sizeClass="size-12"
                        />
                        <p
                          className={`mt-3 text-[12px] font-bold ${s.tone === "mint" ? "text-mint" : "text-primary"}`}
                        >
                          {s.categoryLabel}
                        </p>
                        <p className="mt-1 flex-1 text-[17px] font-bold text-ink">
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {s.location?.dongName ?? ""}
                        </p>
                        <p
                          className={`mt-3 border-t border-line-alt pt-3 text-[18px] font-extrabold ${
                            s.tone === "mint" ? "text-mint" : "text-primary"
                          }`}
                        >
                          {s.costLabel}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSaved(s.id)}
                        aria-label="저장 취소"
                        aria-pressed={true}
                        className="absolute right-5 top-5"
                      >
                        <BookmarkIcon
                          size={20}
                          filled
                          className="text-primary"
                        />
                      </button>
                    </div>
                  ))}
                  {/* 그리드 자식으로 둬야 실제 카드와 같은 열에 흐른다(별도 래퍼로 감싸면 한 칸을 통째로 먹는다). */}
                  {pendingCount > 0 &&
                    Array.from({ length: pendingCount }, (_, i) => (
                      <div
                        key={`sk-${i}`}
                        className="flex flex-col rounded-[18px] bg-surface p-5 shadow-web"
                        aria-busy="true"
                      >
                        <Skeleton className="size-12 rounded-xl" />
                        <Skeleton className="mt-3 h-3.5 w-20" />
                        <Skeleton className="mt-2 h-5 w-[85%]" />
                        <Skeleton className="mt-2 h-3 w-1/3" />
                        <div className="mt-3 border-t border-line-alt pt-3">
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </WebContainer>
        </DesktopShell>
      </div>
    </>
  );
}
