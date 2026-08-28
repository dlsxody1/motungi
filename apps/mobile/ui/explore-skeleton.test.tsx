/**
 * ExploreRowSkeleton(RN) 렌더 스모크(M-054).
 *
 * 스켈레톤엔 텍스트가 없어(thumbnail.test.tsx처럼 getByText로 검증 불가) testID→data-testid
 * 매핑(react-native-web)으로 행 개수를 센다. explore.tsx는 이 컴포넌트를
 * Array.from({ length: 6 })으로 호출하므로, 임의 개수를 렌더해도 그 수만큼 나오는지만 본다.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExploreRowSkeleton } from "./explore-skeleton";

describe("ExploreRowSkeleton", () => {
  it("한 번 렌더하면 행 하나가 나온다", () => {
    const { container } = render(<ExploreRowSkeleton />);

    expect(container.querySelectorAll('[data-testid="explore-row-skeleton"]')).toHaveLength(1);
  });

  it("explore.tsx와 동일하게 6개를 렌더하면 행 6개가 나온다", () => {
    const { container } = render(
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <ExploreRowSkeleton key={i} />
        ))}
      </>,
    );

    expect(container.querySelectorAll('[data-testid="explore-row-skeleton"]')).toHaveLength(6);
  });
});
