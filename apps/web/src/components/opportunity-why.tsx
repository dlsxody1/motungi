"use client";

import { memo } from "react";
import { CheckCircleIcon, InsightsIcon } from "@/components/icons";

/**
 * "왜 ○○님께 맞을까요?" 블록.
 *
 * 상세의 모바일·데스크톱 트리에서 **구조가 실제로 같고 치수만 다른 유일한 블록**이라
 * variant prop으로 합친다(배너·제목·참가비·meta 격자는 마크업 자체가 달라서 합치면
 * 블록마다 삼항이 생긴다 — 그쪽은 파일을 나눴다).
 *
 * memo인 이유: `useWhyReasons`는 규칙기반 근거를 즉시 주고 가능하면 LLM 산문으로
 * **나중에 교체**한다(M-044). 그 교체 한 번에 상세 트리 전체가 두 번(모바일·데스크톱)
 * 다시 그려지던 것을 이 경계에서 막는다. 지도·코스안내는 영향받지 않아야 한다.
 */
export const OpportunityWhy = memo(function OpportunityWhy({
  reasons,
  displayName,
  variant,
}: {
  reasons: string[];
  displayName: string;
  variant: "mobile" | "desktop";
}) {
  const mobile = variant === "mobile";
  return (
    <div
      className={
        mobile ? "mt-5 rounded-xl bg-surface p-4 shadow-card" : "mt-6 rounded-[18px] bg-surface p-6 shadow-web"
      }
    >
      <p className={`flex items-center gap-2 font-bold text-ink ${mobile ? "text-[15px]" : "text-[17px]"}`}>
        <InsightsIcon size={mobile ? 18 : 20} className="text-primary" />왜 {displayName}님께 맞을까요?
      </p>
      <ul className={mobile ? "mt-3 space-y-2.5" : "mt-4 space-y-3"}>
        {reasons.map((w) => (
          <li
            key={w}
            className={`flex items-start leading-relaxed text-label ${
              mobile ? "gap-2 text-[13px]" : "gap-2.5 text-[14px]"
            }`}
          >
            <CheckCircleIcon size={mobile ? 16 : 18} className="mt-0.5 shrink-0 text-primary" />
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
});
