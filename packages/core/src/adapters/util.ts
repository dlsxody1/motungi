/**
 * 소스 어댑터 공통 파서 (순수 함수).
 * 여러 공공 API가 제각각인 요금/시간/날짜 표기를 core 형식으로 정규화한다.
 */

/**
 * 요금 문자열 → 원 단위 number.
 * - "무료" 포함 → 0
 * - "전석 15,000원", "3만원", "10000" → 숫자
 * - 여러 금액이면 가장 싼 값(최소) — 좌석 등급 중 최저가 기준.
 * - 파싱 불가/빈값 → undefined
 */
export function parseFeeKrw(fee?: string | number): number | undefined {
  if (fee == null) return undefined;
  if (typeof fee === "number") return Number.isFinite(fee) ? fee : undefined;

  const s = fee.trim();
  if (!s) return undefined;
  if (s.includes("무료")) return 0;

  const amounts: number[] = [];

  // "3만" 단위 우선 수집.
  for (const m of s.matchAll(/([\d,.]+)\s*만/g)) {
    const n = Number(m[1]!.replace(/,/g, ""));
    if (Number.isFinite(n)) amounts.push(Math.round(n * 10_000));
  }

  // 만 단위가 없을 때만 일반 숫자(원) 수집 — "3만원"을 3으로 이중집계 방지.
  if (amounts.length === 0) {
    for (const m of s.matchAll(/([\d,]{3,})/g)) {
      const n = Number(m[1]!.replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) amounts.push(n);
    }
  }

  if (amounts.length === 0) return undefined;
  return Math.min(...amounts);
}

/**
 * 시간 문자열 → 시작 시(hour, 0~23). 스코어링 time 축 진입값.
 * - "수요일 11:00", "19:30" → 11, 19
 * - "오후 7시" → 19, "오전 10시" → 10
 * - 추출 불가 → undefined
 */
export function parseHour(time?: string): number | undefined {
  if (!time) return undefined;
  const s = time.trim();

  // HH:MM 우선.
  const hm = s.match(/(\d{1,2}):(\d{2})/);
  if (hm) {
    const h = Number(hm[1]);
    if (h >= 0 && h <= 24) return h % 24;
  }

  // "오전/오후 N시".
  const kor = s.match(/(오전|오후)?\s*(\d{1,2})\s*시/);
  if (kor) {
    let h = Number(kor[2]);
    if (h >= 0 && h <= 24) {
      if (kor[1] === "오후" && h < 12) h += 12;
      if (kor[1] === "오전" && h === 12) h = 0;
      return h % 24;
    }
  }

  return undefined;
}

/**
 * 다양한 날짜 표기 → ISO date (YYYY-MM-DD).
 * - "20260729" → "2026-07-29"
 * - "2026-10-28 00:00:00.0" → "2026-10-28"
 * - "2026-07-31" → 그대로
 * - 파싱 불가 → undefined
 */
export function toIsoDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;

  // YYYYMMDD (8자리 숫자)
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  // 앞부분의 YYYY-MM-DD(구분자 -, /, .)
  const dash = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (dash) {
    const mm = dash[2]!.padStart(2, "0");
    const dd = dash[3]!.padStart(2, "0");
    return `${dash[1]}-${mm}-${dd}`;
  }

  return undefined;
}
