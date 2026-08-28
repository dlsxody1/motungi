"use client";

import { useEffect, useState } from "react";
import { searchNeighborhoods, type NeighborhoodSearchResult } from "@/lib/geo";

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
 * 동네 검색(디바운스 + IME 보류 + 이전 요청 취소).
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
 * 그래서 보류에 **시간 상한**을 둔다. `composing`이 true인 동안 검색 effect는 아무것도 하지
 * 않고, 별도 유예 effect가 마지막 입력 후 COMPOSING_GRACE_MS 동안 조용하면 보류를 푼다.
 * 자모 단위 폭주는 막히고(자모는 이 간격보다 빠르게 들어온다), 다 쳐놓고 멈춘 사용자는
 * 결과를 본다.
 *
 * ⚠️ 보류 해제를 검색 effect 안에서 처리하려 하지 마라. 조합 플래그가 그대로면 재실행마다
 *    다시 건너뛰어 무한 루프가 된다 — 유예는 반드시 플래그를 **푸는** 쪽이어야 한다.
 *
 * @param enabled false면 조회하지 않는다(예: 메뉴가 목록 모드일 때).
 */
export function useNeighborhoodSearch(enabled = true): NeighborhoodSearchView {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NeighborhoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [composing, setComposing] = useState(false);

  // 조합 중 타이핑이 멎으면 보류를 푼다. query가 바뀔 때마다 타이머가 다시 시작되므로
  // 자모가 계속 들어오는 동안엔 절대 발화하지 않는다.
  useEffect(() => {
    if (!composing) return;
    const t = setTimeout(() => setComposing(false), COMPOSING_GRACE_MS);
    return () => clearTimeout(t);
  }, [composing, query]);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_QUERY_LEN) {
      setResults([]);
      setSearching(false);
      return;
    }
    // 조합 중엔 요청하지 않는다(M-047). 위 유예 effect가 곧 풀어주고, 그때 이 effect가
    // composing 변화로 재실행되면서 검색한다.
    if (composing) {
      setSearching(true);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const items = await searchNeighborhoods(q, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setResults(items);
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, enabled, composing]);

  return {
    query,
    setQuery,
    results,
    searching,
    showDropdown: query.trim().length >= MIN_QUERY_LEN,
    reset: () => {
      setQuery("");
      setResults([]);
      setSearching(false);
      setComposing(false);
    },
    onCompositionStart: () => setComposing(true),
    onCompositionEnd: (e) => {
      setComposing(false);
      setQuery(e.currentTarget.value);
    },
  };
}
