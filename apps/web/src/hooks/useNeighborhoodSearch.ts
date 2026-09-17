"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchNeighborhoods, type NeighborhoodSearchResult } from "@/lib/geo";
import { queryKeys } from "@/lib/query";

/** 검색어 최소 길이 — 한 음절(조합 중)로는 검색하지 않아 요청을 줄인다. */
export const MIN_QUERY_LEN = 2;

/** 디바운스 간격(ms). */
const DEBOUNCE_MS = 300;

/**
 * 조합이 안 끝나도 이만큼 입력이 없으면 "타이핑이 멎었다"로 보고 보류를 푼다.
 * 자모는 이보다 훨씬 빠르게 들어오므로 조합 중 폭주는 여전히 막힌다.
 */
const COMPOSING_GRACE_MS = 400;

export interface NeighborhoodSearchView {
  /** 입력 중인 검색어(제어 컴포넌트용). */
  query: string;
  setQuery: (q: string) => void;
  results: NeighborhoodSearchResult[];
  searching: boolean;
  /** 결과 드롭다운을 띄울 만큼 쳤는지. */
  showDropdown: boolean;
  /** 검색어·결과를 비운다(선택 완료·닫기 시). */
  reset: () => void;
  /** 조합 시작 — 확정되거나 타이핑이 멎을 때까진 요청을 보류한다. */
  onCompositionStart: () => void;
  /**
   * 조합이 끝나면 확정된 값으로 query를 다시 세팅하고 보류를 푼다.
   * 일부 IME에서 조합 확정 값이 마지막 onChange와 어긋나는 걸 보정한다.
   */
  onCompositionEnd: (e: { currentTarget: { value: string } }) => void;
}

/**
 * 동네 검색(디바운스 + IME 보류 + TanStack Query 캐시/취소).
 *
 * **단일 진실의 원천**: 예전엔 이 로직이 `app/location/page.tsx`와
 * `components/neighborhood-menu.tsx`에 통째로 복붙돼 있었다 — `MIN_QUERY_LEN` 상수까지
 * 각자 선언했다. 한쪽만 고치면 두 화면의 검색 동작이 조용히 갈라지는 구조였다.
 *
 * **한글 IME는 양쪽으로 함정이 있다.** 조합 중(자모 단위)에도 onChange가 뜨므로 그대로 두면
 * "ㅁ→마→망→망ㅇ→망원"마다 요청이 나간다(M-047). 그렇다고 compositionend까지 무작정
 * 보류하면 반대 함정에 빠진다 — IME는 스페이스·엔터를 치기 전까진 마지막 글자를 조합 상태로
 * 들고 있어서 "화곡동"을 다 쳐도 compositionend가 오지 않고, 결과가 영영 안 뜬다.
 *
 * 그래서 보류에 **시간 상한**을 둔다. `composing`이 true인 동안 debouncedQuery는 갱신되지
 * 않고, 별도 유예 effect가 마지막 입력 후 COMPOSING_GRACE_MS 동안 조용하면 보류를 푼다.
 * 자모 단위 폭주는 막히고(자모는 이 간격보다 빠르게 들어온다), 다 쳐놓고 멈춘 사용자는
 * 결과를 본다.
 *
 * ⚠️ 보류 해제를 디바운스 effect 안에서 처리하려 하지 마라. 조합 플래그가 그대로면 재실행마다
 *    다시 건너뛰어 무한 루프가 된다 — 유예는 반드시 플래그를 **푸는** 쪽이어야 한다.
 *
 * **query(입력 상태) vs debouncedQuery(서버 상태 키)**: query는 매 키입력마다 바뀌는 제어
 * 컴포넌트 상태라 queryKey에 넣지 않는다. debouncedQuery만 DEBOUNCE_MS 뒤(비조합 시)에
 * 갱신되고, 이게 유일하게 `queryKeys.neighborhoodSearch`에 들어가는 값이다 — 같은 값이
 * 반복되면(예: 지웠다 같은 걸 다시 입력) TanStack Query 캐시가 재요청을 막아준다.
 *
 * **디바운스 타이머가 fetchQuery를 직접 기다린 뒤 debouncedQuery를 세팅**한다(먼저
 * debouncedQuery를 세팅하고 useQuery가 알아서 조회하게 두지 않는다). 순서를 바꾸면 조회가
 * useQuery의 마운트 effect로 넘어가 버려 "디바운스 한 번 = 캐시 채움 한 번"이 깨지고,
 * queryKey가 늘 새 debouncedQuery로 렌더되는 시점엔 캐시가 이미 채워져 있어 useQuery는
 * 즉시(동기적으로) 그 값을 읽기만 한다 — 화면이 빈 결과를 한 프레임 보여줬다 채워지는 깜빡임이
 * 없다.
 *
 * @param enabled false면 조회하지 않는다(예: 메뉴가 목록 모드일 때).
 */
export function useNeighborhoodSearch(enabled = true): NeighborhoodSearchView {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const queryClient = useQueryClient();

  // 조합 중 타이핑이 멎으면 보류를 푼다. query가 바뀔 때마다 타이머가 다시 시작되므로
  // 자모가 계속 들어오는 동안엔 절대 발화하지 않는다.
  useEffect(() => {
    if (!composing) return;
    const t = setTimeout(() => setComposing(false), COMPOSING_GRACE_MS);
    return () => clearTimeout(t);
  }, [composing, query]);

  // 디바운스: query → debouncedQuery. 조합 중엔 갱신하지 않는다(M-047) — 위 유예 effect가
  // 풀어주면 composing 변화로 이 effect가 재실행되면서 확정값을 반영한다.
  // fetchQuery로 캐시를 먼저 채우고 나서 debouncedQuery를 세팅한다(위 docstring 참조) —
  // TanStack Query 캐시가 staleTime 안이면 queryFn을 다시 부르지 않으므로 이게 곧
  // "같은 검색어 재입력 시 재요청 없음"이다.
  useEffect(() => {
    if (composing) return;
    const t = setTimeout(() => {
      const q = query.trim();
      if (!enabled || q.length < MIN_QUERY_LEN) {
        setDebouncedQuery(q);
        return;
      }
      void queryClient
        .fetchQuery({
          queryKey: queryKeys.neighborhoodSearch(q),
          queryFn: ({ signal }) => searchNeighborhoods(q, signal),
        })
        .catch(() => undefined) // 실패는 useQuery의 isError 경로가 노출한다 — 여기선 무시.
        .finally(() => setDebouncedQuery(q));
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, composing, enabled, queryClient]);

  const trimmed = debouncedQuery;
  const queryEnabled = enabled && !composing && trimmed.length >= MIN_QUERY_LEN;

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.neighborhoodSearch(trimmed),
    queryFn: ({ signal }) => searchNeighborhoods(trimmed, signal),
    enabled: queryEnabled,
  });

  const searching = queryEnabled ? isFetching : query.trim().length >= MIN_QUERY_LEN && composing;

  return {
    query,
    setQuery,
    results: queryEnabled ? (data ?? []) : [],
    searching,
    showDropdown: query.trim().length >= MIN_QUERY_LEN,
    reset: () => {
      setQuery("");
      setDebouncedQuery("");
      setComposing(false);
    },
    onCompositionStart: () => setComposing(true),
    onCompositionEnd: (e) => {
      setComposing(false);
      setQuery(e.currentTarget.value);
    },
  };
}
