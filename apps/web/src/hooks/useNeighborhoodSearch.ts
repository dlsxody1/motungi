"use client";

import { useEffect, useRef, useState } from "react";
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
  /** IME 조합 상태를 알린다 — input의 onCompositionStart/End에 그대로 연결한다. */
  onCompositionStart: () => void;
  /**
   * 조합이 끝나면 확정된 값으로 query를 다시 세팅한다.
   * 이게 없으면 조합 중 건너뛴 마지막 글자가 영영 검색되지 않는다
   * ("망원동"을 다 쳤는데 결과가 "망원"에 머무는 증상).
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
 * 왜 디바운스만으로 부족한가: 한글은 조합 중(자모 단위)에도 onChange가 뜬다.
 * 그래서 타이머가 끝나도 **아직 조합 중이면 이번 틱을 건너뛴다** — 다음 확정 입력이
 * 다시 트리거한다. 디바운스만 걸고 이걸 빼면 "ㅁ→마→만→망"마다 요청이 나간다.
 *
 * @param enabled false면 조회하지 않는다(예: 메뉴가 목록 모드일 때).
 */
export function useNeighborhoodSearch(enabled = true): NeighborhoodSearchView {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NeighborhoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  // IME(한글) 조합 중에는 요청을 보류 — 자모 단위 onChange로 요청이 쏟아지는 걸 막는다.
  const composingRef = useRef(false);

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
      // 아직 조합 중이면(마지막 글자 미확정) 이번 틱은 건너뛴다 — 다음 확정 입력이 다시 트리거.
      if (composingRef.current) {
        setSearching(false);
        return;
      }
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
    onCompositionStart: () => {
      composingRef.current = true;
    },
    onCompositionEnd: (e) => {
      composingRef.current = false;
      // 조합이 끝난 확정 값으로 다시 세팅 — 건너뛴 마지막 글자를 여기서 검색에 태운다.
      setQuery(e.currentTarget.value);
    },
  };
}
