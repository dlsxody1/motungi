/**
 * CourseGuide 렌더 테스트 (M-082). 이전엔 대응 테스트 파일 자체가 없었다(ls로 직접 확인).
 * 두루누비 데이터는 courseStart 있음(서해랑길류) / courseNotes만 있음(DMZ 평화의 길류) /
 * 둘 다 없음(trail 아닌 활동) 세 형태로 온다 — 컴포넌트도 그 세 갈래로 분기한다.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MockOpportunity } from "@/data/opportunities";
import { CourseGuide } from "./course-guide";

function pick(overrides: Partial<MockOpportunity> = {}): MockOpportunity {
  return {
    id: "op-1",
    source: "trail",
    category: "active",
    title: "망원 한강 걷기길",
    summary: "망원동",
    costKrw: 0,
    difficulty: 0.2,
    categoryLabel: "운동·산책",
    costLabel: "무료",
    costUnit: "1인",
    costHeading: "참가비",
    matchScore: 0,
    meta: [],
    tone: "brand",
    ...overrides,
  } as unknown as MockOpportunity;
}

afterEach(() => cleanup());

describe("CourseGuide", () => {
  it("courseStart가 있으면 '코스 안내'로 시점을 렌더한다", () => {
    render(<CourseGuide opportunity={pick({ courseStart: "망원한강공원 입구" })} />);
    expect(screen.getByText("코스 안내")).toBeInTheDocument();
    expect(screen.getByText("시점")).toBeInTheDocument();
    expect(screen.getByText("망원한강공원 입구")).toBeInTheDocument();
    expect(screen.queryByText("종점")).not.toBeInTheDocument();
  });

  it("courseEnd·isLoop=false가 있으면 종점과 비순환 안내를 함께 렌더한다", () => {
    render(
      <CourseGuide
        opportunity={pick({
          courseStart: "망원한강공원 입구",
          courseEnd: "난지한강공원",
          isLoop: false,
        })}
      />,
    );
    expect(screen.getByText("종점")).toBeInTheDocument();
    expect(screen.getByText("난지한강공원")).toBeInTheDocument();
    expect(screen.getByText(/비순환형이라/)).toBeInTheDocument();
  });

  it("courseNotes만 있으면(courseStart 없음) '알아두세요'로 주의사항 목록을 렌더한다", () => {
    render(
      <CourseGuide
        opportunity={pick({
          source: "trail",
          courseStart: undefined,
          courseNotes: ["민통선 내 신분증 지참", "촬영 금지 구역 있음"],
        })}
      />,
    );
    expect(screen.getByText("알아두세요")).toBeInTheDocument();
    expect(screen.getByText("민통선 내 신분증 지참")).toBeInTheDocument();
    expect(screen.getByText("촬영 금지 구역 있음")).toBeInTheDocument();
    expect(screen.queryByText("코스 안내")).not.toBeInTheDocument();
  });

  it("courseStart·courseNotes 둘 다 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <CourseGuide opportunity={pick({ source: "seoul_culture", courseStart: undefined })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
