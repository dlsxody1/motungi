/**
 * 걷기길 코스 안내 — 두루누비 데이터가 두 형태로 와서 그대로 두 형태로 보여준다.
 *
 *  - 서해랑길류: 시점·교통편·종점이 있다 → "어디서 시작해 어떻게 가는지"
 *  - DMZ 평화의 길류: 시점 대신 주의사항(민통선 신분증·촬영금지·매점 없음) → "알아두세요"
 *
 * 두루누비엔 코스 사진이 아예 없어(courseList 16개 필드에 image 계열 0개) 이 안내가
 * 사진 자리를 대신한다. 값이 없으면 아무것도 렌더하지 않는다 — trail 아닌 활동엔 영향 없음.
 */
import { memo } from "react";
import type { MockOpportunity } from "@/data/opportunities";

/**
 * memo인 이유: 상세 페이지는 `savedIds`를 구독한다 — 북마크를 누를 때마다 페이지 전체가
 * 다시 렌더된다. 코스 안내는 저장 여부와 아무 상관이 없는데도 매번 따라 그려졌고,
 * `md:hidden`은 CSS라 모바일·데스크톱 트리에서 두 번씩 돌았다.
 * props가 전부 안정 참조(활동 객체·문자열)라 memo가 그대로 걸린다.
 */
export const CourseGuide = memo(function CourseGuide({
  opportunity: o,
  className = "",
}: {
  opportunity: MockOpportunity;
  className?: string;
}) {
  const hasRoute = !!o.courseStart;
  const notes = o.courseNotes ?? [];
  if (!hasRoute && notes.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="mb-3 text-[17px] font-bold text-ink">
        {hasRoute ? "코스 안내" : "알아두세요"}
      </h2>

      {hasRoute ? (
        <dl className="space-y-3 rounded-xl bg-surface p-4 shadow-card">
          <div>
            <dt className="text-[12px] font-semibold text-primary-deep">시점</dt>
            <dd className="mt-0.5 text-[14px] leading-relaxed text-label">{o.courseStart}</dd>
          </div>
          {o.courseEnd && (
            <div>
              <dt className="text-[12px] font-semibold text-primary-deep">종점</dt>
              <dd className="mt-0.5 text-[14px] leading-relaxed text-label">{o.courseEnd}</dd>
            </div>
          )}
          {o.isLoop === false && (
            <p className="text-[12px] text-muted">
              비순환형이라 종점에서 출발지로 돌아오는 길을 따로 계획해야 해요.
            </p>
          )}
        </dl>
      ) : (
        <ul className="space-y-2 rounded-xl bg-surface p-4 shadow-card">
          {notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-label">
              <span aria-hidden className="text-muted">
                ·
              </span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
