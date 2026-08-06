"use client";

import { displayNameOf, ENERGY_LABEL } from "@motungi/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronRightIcon, LocationIcon, UserIcon } from "@/components/icons";
import { MyMenuList, type MenuItem } from "@/components/my-menu-list";
import { MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { signOut } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";

/** D1 · 마이 — 반응형 */
export default function MyPage() {
  const router = useRouter();
  const dongName = useAppStore((s) => s.anchors.home?.dongName) ?? "동네 미설정";
  const energy = useAppStore((s) => s.answers?.energy);
  const savedCount = useAppStore((s) => s.savedIds.length);
  const user = useAppStore((s) => s.user);

  const metaText = energy ? `${dongName} 기준 · ${ENERGY_LABEL[energy]}` : `${dongName} 기준`;
  const displayName = displayNameOf(user);

  /**
   * soon 항목은 탭해도 아무 일도 일어나지 않게 하고(alert 금지), "출시 예정" 배지로만 안내.
   *
   * memo된 MyMenuList가 걸리려면 이 배열이 매 렌더 새로 만들어지면 안 된다.
   * router는 참조가 흔들리므로 ref로 고정한다(useCallback([router])는 무너진다).
   */
  const routerRef = useRef(router);
  routerRef.current = router;
  const MENU: MenuItem[] = useMemo(
    () => [
      {
        label: "내 동네 관리",
        desc: dongName,
        onClick: () => routerRef.current.push("/location"),
      },
      { label: "알림 설정", desc: "새 활동 · 마감 임박 알림", onClick: () => {}, soon: true },
      ...(user
        ? [
            {
              label: "로그아웃",
              desc: "이 기기에서 계정 연결 해제",
              onClick: () => {
                if (window.confirm("로그아웃하면 이 기기에서 계정 연결이 풀려요. 진행할까요?"))
                  void signOut();
              },
            },
          ]
        : []),
    ],
    [dongName, user],
  );

  const MenuList = <MyMenuList items={MENU} />;

  /**
   * 로그인 진입 — 실제 로그인은 /login 전용 화면이 한다.
   * 예전엔 이 자리에 카카오 노란 버튼이 그대로 박혀 있었다. 마이 메뉴 사이에 낀
   * 큰 노란 배너라 화면에서 가장 시끄러운 요소가 되고, 왜 로그인해야 하는지
   * 설명할 자리도 없었다. 여기선 이유만 말하고 결정은 전용 화면에서 받는다.
   */
  const LoginPrompt = (variant: "mobile" | "desktop") => (
    <Link
      href="/login"
      className={
        variant === "mobile"
          ? "flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card"
          : "flex items-center gap-3 rounded-[18px] bg-surface p-5 shadow-web hover:shadow-web-lift"
      }
    >
      <span className="flex-1">
        <span className="block text-[15px] font-semibold text-ink">로그인</span>
        <span className="block text-[13px] text-muted">
          저장한 활동을 다른 기기에서도 이어보기
        </span>
      </span>
      <ChevronRightIcon size={20} className="text-faint" />
    </Link>
  );

  /**
   * 보관함 진입 — 저장 개수를 실제로 갈 수 있는 곳에 붙인다.
   * 예전엔 "설정 · 저장 N개" 라는 비활성("출시 예정") 메뉴가 개수만 들고 있어서
   * 숫자를 봐도 갈 데가 없었다. 데스크톱엔 하단 내비가 없으므로 특히 필요.
   */
  const SavedLink = (variant: "mobile" | "desktop") => (
    <Link
      href="/saved"
      className={
        variant === "mobile"
          ? "flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card"
          : "flex items-center gap-3 rounded-[18px] bg-surface p-5 shadow-web hover:shadow-web-lift"
      }
    >
      <span className="flex-1">
        <span className="block text-[15px] font-semibold text-ink">보관함</span>
        <span className="block text-[13px] text-muted">
          {savedCount > 0 ? `저장한 활동 ${savedCount}개` : "마음에 드는 활동을 저장해 두세요"}
        </span>
      </span>
      <ChevronRightIcon size={20} className="text-faint" />
    </Link>
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

              {!user && <div className="mt-4">{LoginPrompt("mobile")}</div>}
              <div className="mt-3">{SavedLink("mobile")}</div>
              <div className="mt-3">{MenuList}</div>
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

            {!user && <div className="mt-5">{LoginPrompt("desktop")}</div>}
            <div className="mt-4">{SavedLink("desktop")}</div>
            <div className="mt-4">{MenuList}</div>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
