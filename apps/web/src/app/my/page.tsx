"use client";

import type { Energy } from "@motungi/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronRightIcon, LocationIcon, UserIcon } from "@/components/icons";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { signInWithKakao, signOut } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";

const ENERGY_LABEL: Record<Energy, string> = {
  drained: "방전형",
  moderate: "보통",
  active: "활동형",
};

/** D1 · 마이 (간단 버전) */
export default function MyPage() {
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "동네 미설정";
  const energy = useAppStore((s) => s.answers?.energy);
  const savedCount = useAppStore((s) => s.savedIds.length);
  const user = useAppStore((s) => s.user);
  const [busy, setBusy] = useState(false);

  const metaText = energy ? `${dongName} 기준 · ${ENERGY_LABEL[energy]}` : `${dongName} 기준`;
  const displayName = user?.displayName ?? (user ? "회원" : "게스트");

  const login = async () => {
    setBusy(true);
    const { error } = await signInWithKakao();
    // 성공 시 카카오로 리다이렉트되므로 이 아래는 실패 시에만 도달.
    setBusy(false);
    if (error) window.alert(`로그인: ${error}`);
  };
  const logout = () => {
    if (window.confirm("로그아웃할까요?")) void signOut();
  };

  const soon = () => window.alert("준비 중이에요. 곧 만나요!");
  const MENU = [
    { label: "내 동네 관리", desc: dongName, onClick: () => router.push("/location") },
    { label: "알림 설정", desc: "새 기회 · 마감 임박", onClick: soon },
    ...(user
      ? [{ label: "로그아웃", desc: `저장 ${savedCount}개 · 계정 연결됨`, onClick: logout }]
      : [{ label: "설정", desc: `저장 ${savedCount}개 · 로그인 안 됨`, onClick: soon }]),
  ];

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

          {/* 카카오 로그인 (비로그인 시) */}
          {!user && (
            <button
              type="button"
              onClick={login}
              disabled={busy}
              className="mt-3 flex h-[50px] w-full items-center justify-center rounded-lg bg-[#FEE500] text-[15px] font-bold text-[#191600] disabled:opacity-60"
            >
              {busy ? "연결 중…" : "카카오로 로그인하고 저장 동기화"}
            </button>
          )}

          {/* 메뉴 */}
          <div className="mt-4 divide-y divide-line-alt rounded-xl bg-surface shadow-card">
            {MENU.map((m) => (
              <button
                key={m.label}
                onClick={m.onClick}
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
