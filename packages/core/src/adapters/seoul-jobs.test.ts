import { describe, expect, it } from "vitest";
import {
  classifyEmployment,
  isAfterWorkShift,
  normalizeSeoulJob,
  normalizeSeoulJobs,
  parseShiftHours,
  parseWorkRegion,
  parseWageKrw,
  type RawSeoulJob,
} from "./seoul-jobs";

/**
 * 아래 픽스처는 전부 실제 API 응답(GetJobInfo)에서 그대로 가져온 문자열이다.
 * 추정으로 쓰지 마라 — 표기가 여러 갈래라 실물 없이는 파서가 조용히 빗나간다.
 */
describe("parseShiftHours", () => {
  it("'(근무시간) (오후) 2시 00분 ~ (오후) 5시 00분' → 14~17", () => {
    expect(parseShiftHours("(근무시간) (오후) 2시 00분 ~ (오후) 5시 00분")).toEqual({
      start: 14,
      end: 17,
    });
  });

  it("'(오전) 9시 00분 ~ (정오) 12시 00분' → 9~12 (정오=12)", () => {
    expect(parseShiftHours("(근무시간) (오전) 9시 00분 ~ (정오) 12시 00분")).toEqual({
      start: 9,
      end: 12,
    });
  });

  it("HH:MM 표기 '월~금 : 15:00 ~ 18:00' → 15~18", () => {
    expect(parseShiftHours("월~금 : 15:00 ~ 18:00 (3시간)/주5일근무")).toEqual({
      start: 15,
      end: 18,
    });
  });

  it("'(오후) 3시 00분 ~ (오후) 10시 00분' → 15~22", () => {
    expect(parseShiftHours("(근무시간) (오후) 3시 00분 ~ (오후) 10시 00분")).toEqual({
      start: 15,
      end: 22,
    });
  });

  it("종료시각을 못 읽으면 undefined", () => {
    expect(parseShiftHours("협의 후 결정")).toBeUndefined();
    expect(parseShiftHours("")).toBeUndefined();
    expect(parseShiftHours(undefined)).toBeUndefined();
  });
});

describe("parseWorkRegion", () => {
  // 실응답 WORK_PARAR_BASS_ADRES_CN은 시군구 뒤에 상세주소가 그대로 붙어 온다.
  // 이걸 안 자르면 normalizeGu가 "구리시대림어린이집"을 뱉어 지역 필터에 영원히 안 걸린다.
  it("시군구 뒤 상세주소를 잘라낸다", () => {
    expect(parseWorkRegion("경기 구리시대림어린이집")).toBe("경기 구리시");
    expect(parseWorkRegion("경기 하남시489")).toBe("경기 하남시");
    expect(parseWorkRegion("서울 도봉구802호")).toBe("서울 도봉구");
    expect(parseWorkRegion("경기 김포시인근 지역")).toBe("경기 김포시");
  });

  it("끝의 마침표·공백을 정리한다", () => {
    expect(parseWorkRegion("서울 서대문구.")).toBe("서울 서대문구");
    expect(parseWorkRegion("  서울 강남구  ")).toBe("서울 강남구");
  });

  it("이미 깨끗하면 그대로", () => {
    expect(parseWorkRegion("서울 송파구")).toBe("서울 송파구");
    expect(parseWorkRegion("인천 연수구")).toBe("인천 연수구");
  });

  it("구/시/군을 못 찾으면 시도까지만", () => {
    expect(parseWorkRegion("서울")).toBe("서울");
    expect(parseWorkRegion("경기 어딘가")).toBe("경기");
  });

  it("빈 값은 undefined", () => {
    expect(parseWorkRegion("")).toBeUndefined();
    expect(parseWorkRegion(undefined)).toBeUndefined();
  });
});

describe("isAfterWorkShift", () => {
  // 컷을 19시로 잡은 근거: 전량 스캔 결과 종료시각이 12시(1,967건)·16시(766)·17시(597)에
  // 몰려 있고 19시부터 급감한다. 18시 종료는 "퇴근 후"가 아니라 정시퇴근이라 제외한다.
  it("종료 19시 이상이면 퇴근 후", () => {
    expect(isAfterWorkShift("(근무시간) (오후) 4시 00분 ~ (오후) 7시 00분")).toBe(true);
    expect(isAfterWorkShift("(근무시간) (오후) 5시 00분 ~ (오후) 8시 00분")).toBe(true);
  });

  it("18시 종료는 퇴근 후가 아니다(정시퇴근)", () => {
    expect(isAfterWorkShift("월~금 : 15:00 ~ 18:00")).toBe(false);
  });

  it("낮 근무는 제외", () => {
    expect(isAfterWorkShift("(근무시간) (오전) 9시 00분 ~ (정오) 12시 00분")).toBe(false);
    expect(isAfterWorkShift("(근무시간) (오후) 1시 00분 ~ (오후) 4시 00분")).toBe(false);
  });

  it("시간 미상은 제외 — 모르는 걸 퇴근 후라고 우기지 않는다", () => {
    expect(isAfterWorkShift("협의")).toBe(false);
    expect(isAfterWorkShift(undefined)).toBe(false);
  });
});

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
  it("일용/단기 → side_job", () => {
    expect(classifyEmployment("일용직")).toBe("side_job");
    expect(classifyEmployment("단기")).toBe("side_job");
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
    expect(o.costKrw).toBe(12_000);
    expect(o.ctaUrl).toContain("job.seoul.go.kr");
    expect(o.deadline).toBe("2026-07-31");
    expect(o.location?.dongName).toBe("망원동");
    expect(o.summary).toContain("망원동 카페");
  });

  it("풀타임은 제외(null)", () => {
    expect(normalizeSeoulJob({ ...RAW, employmentType: "정규직" })).toBeNull();
  });

  // M-016: region이 없고 address만 있으면 dongName을 address로 폴백(과거엔 undefined 버그).
  it("region 없이 address만 있으면 dongName은 address로 폴백", () => {
    const o = normalizeSeoulJob({ ...RAW, region: undefined, address: "서울 마포구 월드컵로 100" })!;
    expect(o.location?.dongName).toBe("서울 마포구 월드컵로 100");
  });

  it("region·address 둘 다 없으면 location 생략", () => {
    const o = normalizeSeoulJob({ ...RAW, region: undefined, address: undefined })!;
    expect(o.location).toBeUndefined();
  });

  it("배열 정규화 시 부적합 레코드 제거", () => {
    const out = normalizeSeoulJobs([RAW, { ...RAW, jobId: "x", employmentType: "정규직" }]);
    expect(out).toHaveLength(1);
  });
});
