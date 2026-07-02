import { describe, expect, it } from "vitest";
import {
  classifyEmployment,
  normalizeSeoulJob,
  normalizeSeoulJobs,
  parseWageKrw,
  type RawSeoulJob,
} from "./seoul-jobs";

describe("parseWageKrw", () => {
  it("숫자는 그대로", () => {
    expect(parseWageKrw(1_200_000)).toBe(1_200_000);
  });
  it("'만' 단위 파싱", () => {
    expect(parseWageKrw("120만")).toBe(1_200_000);
  });
  it("콤마·원 표기 파싱", () => {
    expect(parseWageKrw("1,200,000원")).toBe(1_200_000);
  });
  it("파싱 불가 시 undefined", () => {
    expect(parseWageKrw("협의")).toBeUndefined();
    expect(parseWageKrw(undefined)).toBeUndefined();
  });
});

describe("classifyEmployment", () => {
  it("파트/시간제 → side_job", () => {
    expect(classifyEmployment("파트타임")).toBe("side_job");
    expect(classifyEmployment("시간제")).toBe("side_job");
  });
  it("일용/단기 → gig_deal", () => {
    expect(classifyEmployment("일용직")).toBe("gig_deal");
    expect(classifyEmployment("단기")).toBe("gig_deal");
  });
  it("정규직 등 풀타임 → null(카드 제외)", () => {
    expect(classifyEmployment("정규직")).toBeNull();
    expect(classifyEmployment("기간의 정함이 없는 근로계약")).toBeNull();
  });
  it("미상 → side_job(폭넓게)", () => {
    expect(classifyEmployment(undefined)).toBe("side_job");
  });
});

const RAW: RawSeoulJob = {
  jobId: "SJ-2026-0001",
  companyName: "망원동 카페",
  title: "주말 오전 바리스타 파트",
  region: "망원동",
  wageType: "시급",
  wage: "12,000원",
  employmentType: "파트타임",
  detailUrl: "https://job.seoul.go.kr/detail/SJ-2026-0001",
  deadline: "2026-07-31",
  registeredAt: "2026-07-01T00:00:00Z",
};

describe("normalizeSeoulJob", () => {
  it("Opportunity로 정규화", () => {
    const o = normalizeSeoulJob(RAW)!;
    expect(o.id).toBe("seoul-job:SJ-2026-0001");
    expect(o.source).toBe("seoul_jobs");
    expect(o.category).toBe("side_job");
    expect(o.estimatedIncomeKrw).toBe(12_000);
    expect(o.ctaUrl).toContain("job.seoul.go.kr");
    expect(o.deadline).toBe("2026-07-31");
    expect(o.location?.dongName).toBe("망원동");
    expect(o.summary).toContain("망원동 카페");
  });

  it("풀타임은 제외(null)", () => {
    expect(normalizeSeoulJob({ ...RAW, employmentType: "정규직" })).toBeNull();
  });

  it("배열 정규화 시 부적합 레코드 제거", () => {
    const out = normalizeSeoulJobs([RAW, { ...RAW, jobId: "x", employmentType: "정규직" }]);
    expect(out).toHaveLength(1);
  });
});
