"use client";

import { useEffect, useState } from "react";
import { searchNeighborhoods, type NeighborhoodSearchResult } from "@/lib/geo";

/** 검색어 최소 길이 — 한 음절(조합 중)로는 검색하지 않아 요청을 줄인다. */
export const MIN_QUERY_LEN = 2;

/** 디바운스 간격(ms). */
const DEBOUNCE_MS = 300;

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
  /**
   * 조합이 끝나면 확정된 값으로 query를 다시 세팅한다.
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
 * 한글은 조합 중(자모 단위)에도 onChange가 뜨지만, 그렇다고 조합 중 검색을 보류하면 안 된다.
 * IME는 사용자가 스페이스·엔터를 치기 전까진 마지막 글자를 조합 상태로 들고 있어서
 * "화곡동"을 다 쳐도 compositionend가 오지 않는다 — 보류하면 결과가 영영 안 뜬다.
 * 자모 단위 요청은 디바운스(300ms) + 최소 길이로 충분히 막힌다.
 *
 * @param enabled false면 조회하지 않는다(예: 메뉴가 목록 모드일 때).
 */
export function useNeighborhoodSearch(enabled = true): NeighborhoodSearchView {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NeighborhoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_QUERY_LEN) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      // 조합 중이어도 그냥 검색한다. 한글은 마지막 글자가 조합 상태로 남아 있는 게 정상이라
      // (스페이스·엔터를 치기 전까진 compositionend가 안 온다) 여기서 건너뛰면
      // "화곡동"을 다 쳐놓고도 영영 결과가 안 나온다. 요청 폭주는 디바운스가 막는다.
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
  }, [query, enabled]);

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
    },
    onCompositionEnd: (e) => setQuery(e.currentTarget.value),
  };
}
