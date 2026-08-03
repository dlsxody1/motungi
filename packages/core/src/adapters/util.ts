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

/**
 * 공공데이터 산문 필드의 HTML 태그를 걷어낸다.
 *
 * 두루누비 crsSummary/crsContents/crsTourInfo는 `<br>`을 줄바꿈으로 쓴다 —
 * 그냥 태그를 지우면 "…이어지는 코스- 부산의 유명 관광지들을…"처럼 문장이 붙어버린다.
 * 그래서 `<br>`류는 먼저 개행으로 바꾼 뒤 나머지 태그를 제거한다.
 *
 * 순수 텍스트엔 무영향(멱등). 표시가 아니라 색인·LLM 입력용 정규화다.
 */
export function stripHtml(raw?: string): string | undefined {
  if (!raw) return undefined;
  const text = raw
    // <br>, <br/>, <br />, <BR> 전부 개행으로.
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    // 공백류 정리: 줄 끝 공백 제거 → 3줄 이상 연속 개행은 2줄로.
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || undefined;
}

/**
 * 여러 산문 조각을 하나의 description으로 합친다.
 *
 * 조각마다 채움률이 다르고(두루누비는 4필드 100%, 서울시 PROGRAM은 14%),
 * 같은 문장이 중복되는 경우가 있어(crsSummary ⊂ crsContents인 코스가 흔하다)
 * **정확히 같은 조각은 한 번만** 넣는다. 전부 비면 undefined(= DB null).
 */
export function joinDescription(parts: (string | undefined)[]): string | undefined {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const p of parts) {
    const t = stripHtml(p);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    kept.push(t);
  }
  return kept.length ? kept.join("\n\n") : undefined;
}

/**
 * 결정적 문자열 해시(djb2). 여러 어댑터의 external_id 생성에 공용으로 쓴다.
 * Edge(Deno)/브라우저/Node 어디서나 동일 결과.
 */
export function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * 위도/경도 문자열 → { lat, lng } | undefined.
 * - 파싱 불가/NaN/Infinity → undefined
 * - (0, 0)만 → undefined (미기재 좌표를 0,0으로 채워 보내는 소스가 있어 방어)
 * - 한쪽만 0이고 다른 쪽이 유효한 값이면 유효한 point로 반환.
 */
export function parsePoint(lat?: string, lng?: string): { lat: number; lng: number } | undefined {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || (la === 0 && lo === 0)) return undefined;
  return { lat: la, lng: lo };
}

/**
 * 두루누비 travelerinfo 파싱 결과.
 * 소스가 이 필드를 두 가지 용도로 쓴다(실측: 수도권 19건 중 7/11/1):
 *  - 서해랑길류 → "- 시점: … <br>교통편) … <br>- 종점: …"  (코스 안내)
 *  - DMZ 평화의 길류 → "- 민통선이므로 신분증 지참" 같은 주의사항 나열
 *  - 드물게 "<br>"만 있는 빈 값
 * 형태를 구분해 돌려주고, 어느 쪽도 아니면 전부 undefined다.
 */
export interface TrailGuide {
  /** 시점 + 교통편(있으면 한 줄로 합침). */
  start?: string;
  /** 종점. */
  end?: string;
  /** 시점/종점 형식이 아닐 때의 주의사항 목록. */
  notes?: string[];
}

/** `<br>`·태그 제거 후 줄 단위로. 공백/빈 줄은 버린다. */
function toLines(raw: string): string[] {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * 두루누비 travelerinfo → 코스 안내.
 * 시점이 있으면 코스 안내로, 없으면 주의사항 목록으로 해석한다.
 * 빈 문자열·태그뿐이면 {}.
 */
export function parseTrailGuide(raw?: string): TrailGuide {
  const lines = toLines(raw ?? "");
  if (lines.length === 0) return {};

  const pick = (re: RegExp): string | undefined => {
    for (const l of lines) {
      const m = re.exec(l);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    return undefined;
  };

  const start = pick(/^-?\s*시\s*점\s*[:：]\s*(.+)$/);
  const end = pick(/^-?\s*종\s*점\s*[:：]\s*(.+)$/);
  const transit = pick(/^교통편\s*\)\s*(.+)$/);

  // 시점이 없으면 코스 안내가 아니다 → 남은 줄을 주의사항으로.
  if (!start) {
    const notes = lines
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter((l) => l.length > 5);
    return notes.length > 0 ? { notes } : {};
  }

  return {
    start: transit ? `${start} (${transit})` : start,
    ...(end ? { end } : {}),
  };
}

/**
 * GPX XML → 좌표 배열. trkpt(트랙) 우선, 없으면 rtept/wpt.
 *
 * 두루누비 GPX는 코스당 1500포인트/460KB 수준이라 그대로 클라이언트에 보내면 안 된다.
 * maxPoints로 균등 샘플링해 줄인다(200점이면 14km 코스에서 약 70m 간격 — 육안 차이 없음).
 * 시작·끝 포인트는 항상 보존한다(코스 시종점이 잘리면 경로가 짧아 보인다).
 *
 * ponytail: 균등 샘플링(O(n)). 곡률 손실이 눈에 띄면 Douglas-Peucker로 교체.
 */
export function parseGpxPoints(xml: string, maxPoints = 200): [number, number][] {
  const pts: [number, number][] = [];
  // lat/lon 속성 순서가 소스마다 다를 수 있어 태그를 먼저 잡고 속성을 따로 뽑는다.
  for (const m of xml.matchAll(/<(?:trkpt|rtept|wpt)\b[^>]*>/g)) {
    const tag = m[0];
    const lat = Number(/\blat="([^"]+)"/.exec(tag)?.[1]);
    const lng = Number(/\blon="([^"]+)"/.exec(tag)?.[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng]);
  }
  if (pts.length <= maxPoints) return pts;

  const step = (pts.length - 1) / (maxPoints - 1);
  const out: [number, number][] = [];
  for (let i = 0; i < maxPoints; i++) out.push(pts[Math.round(i * step)]!);
  return out;
}
