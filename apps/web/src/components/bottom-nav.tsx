/**
 * 하단 탭바 — 홈 · 탐색 · 보관함 · 마이 (A5·A7·B1 등에서 사용).
 */
import Link from "next/link";
import { BookmarkIcon, CompassIcon, HomeIcon, UserIcon } from "./icons";

type TabKey = "home" | "explore" | "saved" | "my";

const TABS: { key: TabKey; label: string; href: string; Icon: typeof HomeIcon }[] = [
  { key: "home", label: "홈", href: "/report", Icon: HomeIcon },
  { key: "explore", label: "탐색", href: "/explore", Icon: CompassIcon },
  { key: "saved", label: "보관함", href: "/saved", Icon: BookmarkIcon },
  { key: "my", label: "마이", href: "/my", Icon: UserIcon },
];

export function BottomNav({ active }: { active: TabKey }) {
  return (
    <nav className="flex shrink-0 items-stretch border-t border-line-alt bg-surface px-2 pt-2">
      {TABS.map(({ key, label, href, Icon }) => {
        const on = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 pb-1 pt-0.5 ${
              on ? "text-primary" : "text-muted"
            }`}
          >
            <Icon size={24} strokeWidth={on ? 2.2 : 1.8} />
            <span className={`text-[11px] ${on ? "font-bold" : "font-medium"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
