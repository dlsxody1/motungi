"use client";

import { useEffect, useState } from "react";
import type { MockOpportunity } from "@/data/opportunities";
import { fetchOpportunityById } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** 보관함 로드 상태. loading은 스켈레톤, error는 재시도 안내. */
export type SavedLoadStatus = "loading" | "ok" | "empty" | "error";

export interface SavedView {
  items: MockOpportunity[];
  status: SavedLoadStatus;
}

/**
 * 보관함 항목을 저장 id로 직접 해소한다.
 *
 * 이전에는 useEnsureCatalog(300건 무필터)를 받아 `savedIds.map(id => catalog.find(...))`로
 * 훑었다. 그 결과 **저장해둔 활동이 300건 창 밖이면 보관함에서 조용히 사라졌다**
 * (실측: live 507건 중 207건이 실종 대상). 성능이 아니라 정합성 버그였다.
 *
 * 그래서 목록 조회 대신 id 조회를 쓴다:
 * 1) 스토어 카탈로그에 이미 있으면(탐색에서 넘어온 경우) 재조회 없이 재사용
 * 2) 없으면 fetchOpportunityById로 그 id만 조회 — 창 밖이어도 반드시 나온다
 *
 * 마감이 지난 활동도 그대로 보여준다. fetchOpportunityById는 마감 필터가 없고,
 * 저장 목록에서 "지난 것 숨김"은 오히려 혼란이다(catalog.ts 단건조회 주석과 동일한 판단).
 */
export function useSavedOpportunities(): SavedView {
  const savedIds = useAppStore((s) => s.savedIds);
  const catalog = useAppStore((s) => s.catalog);

  const [resolved, setResolved] = useState<Record<string, MockOpportunity>>({});
  const [failed, setFailed] = useState(false);

  // 조회 대상: 저장됐지만 스토어에도, 이미 받아둔 것에도 없는 id.
  const missing = savedIds.filter((id) => !catalog.some((o) => o.id === id) && !resolved[id]);
  // effect 의존성용 — 배열 identity가 아니라 내용으로 비교하려고 문자열로 만든다.
  const missingKey = missing.join(",");

  useEffect(() => {
    if (missingKey === "") return;
    let cancelled = false;
    setFailed(false);
    void (async () => {
      const ids = missingKey.split(",");
      // ponytail: 저장 건수만큼 요청. 수십 건을 넘기면 .in("id", ids) 단일 조회로 승격.
      const results = await Promise.all(ids.map((id) => fetchOpportunityById(id)));
      if (cancelled) return;
      const next: Record<string, MockOpportunity> = {};
      let anyError = false;
      results.forEach((r, i) => {
        const id = ids[i];
        // 조회 실패는 에러로, "없음"(삭제된 활동)은 조용히 건너뛴다.
        if (r.status === "error" || r.status === "unconfigured") anyError = true;
        if (id && r.data) next[id] = r.data;
      });
      setResolved((prev) => ({ ...prev, ...next }));
      setFailed(anyError);
    })();
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  // 저장 순서를 유지한 채 해소한다. 아직 못 받은 id는 자리를 비워둔다(로딩 중).
  const items = savedIds
    .map((id) => catalog.find((o) => o.id === id) ?? resolved[id])
    .filter((o): o is MockOpportunity => !!o);

  if (savedIds.length === 0) return { items, status: "empty" };
  if (items.length < savedIds.length) {
    // 아직 다 못 받았다 — 실패했으면 error, 아니면 로딩 중.
    return { items, status: failed ? "error" : "loading" };
  }
  return { items, status: "ok" };
}
