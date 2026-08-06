"use client";

import { memo, useEffect, useRef } from "react";
import { SearchIcon } from "@/components/icons";

/**
 * 탐색 검색 입력.
 *
 * 목적은 **키 입력이 목록을 다시 그리지 않게** 하는 것이다. 예전엔 페이지가 `query`를 들고
 * 있어서 한 글자마다 페이지 전체(사이드바·칩·정렬 select·양쪽 virtualizer)가 다시 렌더됐다.
 * 목록 재계산은 150ms 디바운스로 미뤄져 있었지만 **렌더 자체는 매 자모마다** 돌았다.
 *
 * 그래서 확정 검색어(`debouncedQuery`)와 입력 중인 값(`query`)을 분리한다. 이 컴포넌트는
 * `query`를 부모에게 돌려주되(모바일·데스크톱 입력이 CSS로 동시에 마운트돼 서로 동기화돼야
 * 한다), 목록이 의존하는 건 디바운스된 값뿐이라 page는 150ms에 한 번만 무거운 렌더를 한다.
 *
 * IME 주의: 한글 조합 중 onChange는 자모마다 뜨지만, 그게 목록까지 가지는 않는다.
 */
export const ExploreSearch = memo(function ExploreSearch({
  query,
  onQueryChange,
  onDebouncedChange,
  className,
  inputClassName,
  iconSize = 20,
}: {
  /** 입력 중인 값. 모바일·데스크톱 두 입력이 같은 값을 보여야 해서 부모가 소유한다. */
  query: string;
  onQueryChange: (q: string) => void;
  /** 디바운스가 끝난 확정 검색어. 목록은 이것만 본다. */
  onDebouncedChange: (q: string) => void;
  className?: string;
  inputClassName?: string;
  iconSize?: number;
}) {
  // 콜백을 effect 의존성에서 빼기 위한 최신값 보관 — 부모가 인라인 함수를 넘겨도
  // 타이머가 매 렌더 재설정되지 않는다(그러면 디바운스가 영원히 안 끝난다).
  const onDebouncedRef = useRef(onDebouncedChange);
  onDebouncedRef.current = onDebouncedChange;

  // 한글 입력 중(IME 조합)에도 매 자모마다 목록이 다시 걸러지지 않도록 150ms 미룬다.
  useEffect(() => {
    const t = window.setTimeout(() => onDebouncedRef.current(query), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <div className={className}>
      <SearchIcon size={iconSize} className="text-faint" />
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="활동 좁히기"
        className={inputClassName}
        placeholder="동네·활동 이름으로 좁히기"
      />
    </div>
  );
});
