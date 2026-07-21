"use client";

import { useEffect, useState } from "react";
import type { CatalogStatus, MockOpportunity } from "@/data/opportunities";
import { fetchOpportunityById } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

/** 단건 상세 로드 상태. idle/loading은 스피너, error/empty는 "없음" 화면. */
export type OpportunityLoadStatus = "idle" | "loading" | "ok" | "empty" | "error" | "unconfigured";

export interface OpportunityView {
  opportunity: MockOpportunity | null;
  status: OpportunityLoadStatus;
}

/**
 * 상세 페이지용 단건 로드. 카탈로그 전량을 받지 않는다.
 *
 * 1) 이미 스토어 카탈로그에 있으면(탐색/보관함에서 넘어온 경우) 그걸 즉시 재사용 — 재조회 없음.
 * 2) 없으면(새로고침·공유링크로 직접 진입) id로 딱 1건만 서버에서 조회.
 *
 * 이렇게 하면 "상세 하나 보려고 300건을 다 받는" 낭비가 사라진다. 크로스셀(탐색 더보기)은
 * 카탈로그가 있으면 그대로 쓰고, 없으면 상세엔 굳이 필요 없으니 안 받는다.
 */
export function useOpportunity(id: string | null): OpportunityView {
  const catalog = useAppStore((s) => s.catalog);
  const cached = id ? catalog.find((x) => x.id === id) ?? null : null;

  const [fetched, setFetched] = useState<MockOpportunity | null>(null);
  const [status, setStatus] = useState<OpportunityLoadStatus>("idle");

  useEffect(() => {
    if (cached) {
      // 스토어에 이미 있음 → 조회 없이 그대로.
      setStatus("idle");
      setFetched(null);
      return;
    }
    if (!id) {
      // id가 아예 없으면 조회할 대상이 없다 → "없음"으로.
      setStatus("empty");
      setFetched(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      const { data, status: s } = await fetchOpportunityById(id);
      if (cancelled) return;
      setFetched(data);
      setStatus(mapStatus(s, data));
    })();
    return () => {
      cancelled = true;
    };
  }, [id, cached]);

  if (cached) return { opportunity: cached, status: "ok" };
  return { opportunity: fetched, status };
}

/** core CatalogStatus + 데이터 유무 → 화면용 상태. ok인데 데이터 없으면 empty로 정규화. */
function mapStatus(s: CatalogStatus, data: MockOpportunity | null): OpportunityLoadStatus {
  if (s === "ok") return data ? "ok" : "empty";
  return s;
}
