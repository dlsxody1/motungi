"use client";

import { displayNameOf, ENERGY_LABEL } from "@motungi/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronRightIcon, LocationIcon, UserIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { signInWithKakao, signOut } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";

interface MenuItem {
  label: string;
  desc: string;
  onClick: () => void;
  soon?: boolean;
}

/** D1 · 마이 — 반응형 */
export default function MyPage() {
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "동네 미설정";
  const energy = useAppStore((s) => s.answers?.energy);
  const savedCount = useAppStore((s) => s.savedIds.length);
  const user = useAppStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const metaText = energy ? `${dongName} 기준 · ${ENERGY_LABEL[energy]}` : `${dongName} 기준`;
  const displayName = displayNameOf(user);

  const login = async () => {
    setBusy(true);
    setLoginError(null);
    const { error } = await signInWithKakao();
    // 성공 시 카카오로 리다이렉트되므로 이 아래는 실패 시에만 도달.
    setBusy(false);
    if (error) setLoginError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
  };
  const logout = () => {
    if (window.confirm("로그아웃하면 이 기기에서 계정 연결이 풀려요. 진행할까요?")) void signOut();
  };

  // soon 항목은 탭해도 아무 일도 일어나지 않게 하고(alert 금지), "출시 예정" 배지로만 안내.
  const MENU: MenuItem[] = [
    { label: "내 동네 관리", desc: dongName, onClick: () => router.push("/location") },
    { label: "알림 설정", desc: "새 활동 · 마감 임박 알림", onClick: () => {}, soon: true },
    ...(user
      ? [{ label: "로그아웃", desc: `저장 ${savedCount}개 · 계정 연결됨`, onClick: logout }]
      : [{ label: "설정", desc: `저장 ${savedCount}개 · 로그인 안 됨`, onClick: () => {}, soon: true }]),
  ];

  const KakaoButton = (
    <div>
      <button
        type="button"
        onClick={login}
        disabled={busy}
        className="flex h-[50px] w-full items-center justify-center rounded-lg bg-[#FEE500] text-[15px] font-bold text-[#191600] disabled:opacity-60"
      >
        {busy ? "연결 중…" : "카카오로 로그인하고 저장 동기화"}
      </button>
      {loginError && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-primary-deep">
          {loginError}
        </p>
      )}
    </div>
  );

  const MenuList = (
    <div className="divide-y divide-line-alt rounded-xl bg-surface shadow-card">
      {MENU.map((m) => (
        <button
          key={m.label}
          onClick={m.onClick}
          disabled={m.soon}
          aria-disabled={m.soon}
          className="flex w-full items-center gap-3 p-4 text-left disabled:cursor-default"
        >
          <span className="flex-1">
            <span className={`block text-[15px] font-semibold ${m.soon ? "text-muted" : "text-ink"}`}>
              {m.label}
            </span>
            <span className="block text-[13px] text-muted">{m.desc}</span>
          </span>
          {m.soon ? (
            <span className="rounded-pill bg-bg px-2.5 py-1 text-[11px] font-semibold text-muted">
              출시 예정
            </span>
          ) : (
            <ChevronRightIcon size={20} className="text-faint" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
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
                  <p className="text-[16px] font-bold text-ink">{displayName}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
                    <LocationIcon size={14} className="text-primary" /> {metaText}
                  </p>
                </div>
                <Link
                  href="/diagnosis"
                  className="rounded-pill bg-primary px-3.5 py-2 text-[13px] font-bold text-white"
                >
                  재진단
                </Link>
              </div>

              {!user && <div className="mt-3">{KakaoButton}</div>}
              <div className="mt-4">{MenuList}</div>
            </div>

            <BottomNav active="my" />
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="my" dongName={dongName} userName={user?.displayName}>
        <WebContainer className="py-12">
          <div className="mx-auto max-w-[640px]">
            <h1 className="text-[32px] font-extrabold tracking-[-0.02em] text-ink">마이</h1>

            <div className="mt-6 flex items-center gap-4 rounded-[18px] bg-surface p-6 shadow-web">
              <span className="grid size-16 place-items-center rounded-full bg-tint text-primary">
                <UserIcon size={34} />
              </span>
              <div className="flex-1">
                <p className="text-[20px] font-bold text-ink">{displayName}</p>
                <p className="mt-1 flex items-center gap-1 text-[14px] text-muted">
                  <LocationIcon size={15} className="text-primary" /> {metaText}
                </p>
              </div>
              <Link
                href="/diagnosis"
                className="rounded-pill bg-primary px-4 py-2.5 text-[14px] font-bold text-white hover:bg-primary-deep"
              >
                재진단
              </Link>
            </div>

            {!user && <div className="mt-4">{KakaoButton}</div>}
            <div className="mt-5">{MenuList}</div>
            <Link
              href="/saved"
              className="mt-4 flex items-center justify-between rounded-[18px] bg-surface p-5 shadow-web hover:shadow-web-lift"
            >
              <span className="text-[15px] font-semibold text-ink">보관함 {savedCount}개 보기</span>
              <ChevronRightIcon size={20} className="text-faint" />
            </Link>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
