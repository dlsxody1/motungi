/**
 * 3스텝 미니어처 — 각 걸음의 실제 화면을 축소해서 보여준다.
 *
 * 왜: 카피만 있는 3열은 어느 서비스에나 붙는 문장이라 "일반적"으로 읽힌다.
 *   1차 시도는 회색 바로 실루엣만 잡았는데 그건 와이어프레임이지 화면이 아니었다 —
 *   "라이브한 화면"으로 읽히려면 진짜 글자가 있어야 한다. 그래서 여기 텍스트는
 *   전부 실제 화면에 있는 문자열이다(동네 칩·Q1 문항·원픽 카드).
 *
 * 왜 스크린샷이 아닌가: 화면이 바뀌면 이미지는 즉시 거짓말이 된다. 여기는 DOM이라
 *   토큰(색·radius·shadow)을 그대로 따라가고, 다크모드·팔레트 변경에도 안 깨진다.
 *
 * 크기: 폭 200 기준으로 만들고 실제로는 컨테이너에 맞춰 늘어난다. 글자는 9~11px —
 *   읽히라고 있는 게 아니라 "글이 있는 화면"으로 보이라고 있다(장식).
 * 모션: 그룹 호버 시 각 화면이 다음 상태로 진행한다(칩 선택 → 진행바 완료 → 원픽 확정).
 *   순수 CSS transition. reduced-motion이면 transition만 꺼진다(globals.css, .step-preview).
 * 접근성: 순수 장식(aria-hidden). 의미는 옆의 h3/p가 갖는다. 호버 없이도 완성된 화면이다.
 */

/** 리포트 미니어처가 쓰는 최소 필드만. MockOpportunity를 그대로 받으면 결합이 커진다. */
export type PreviewPick = {
  id: string;
  title: string;
  categoryLabel: string;
  costLabel: string;
  tone?: string;
};

/**
 * 미니어처 공통 액자 — 폰 화면처럼 위가 잘린 형태.
 * 면은 흰색: 섹션이 베이지(bg)라 액자까지 베이지면 경계가 사라진다.
 *
 * 높이: 고정 aspect를 쓰지 않는다(콘텐츠보다 커서 아래가 비었다). 대신 flex-1로
 * 부모 li의 남는 높이를 먹는다 — 세 미니어처 내용 길이가 달라도 액자 밑변이 한 선에 맞고,
 * 그래야 아래 01/02/03·제목이 세 열에서 같은 높이에 놓인다.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="step-preview relative flex-1 overflow-hidden rounded-xl bg-surface px-3.5 pt-3.5 pb-4 shadow-web transition-shadow duration-300 group-hover:shadow-web-lift"
    >
      {children}
    </div>
  );
}

/* 호버 시 순서대로 반응하는 요소. delay는 인라인(임의값 클래스 남발보다 짧다). */
const step = (i: number) => ({ transitionDelay: `${i * 60}ms` });

/** ① 내 동네 설정 — 실제 /location 화면: 제목 + 동네 칩 + 위치 카드 + 검색 + CTA. */
export function PreviewLocation() {
  return (
    <Frame>
      <p className="text-[11px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
        어느 동네 기준으로
        <br />
        찾아드릴까요?
      </p>

      <p className="mt-2 text-[8px] font-semibold text-label">최근 · 인기 동네</p>
      {/* 칩 — 호버하면 성수동이 선택된다(동네를 고르는 행위 그 자체). */}
      <div className="mt-1 flex flex-wrap gap-1">
        {["망원동", "성수동", "연남동", "판교동"].map((dong, i) => (
          <span
            key={dong}
            style={step(i)}
            className={`rounded-full px-1.5 py-[3px] text-[8px] font-semibold ring-1 transition-colors duration-300 ${
              i === 1
                ? "bg-surface text-label ring-line group-hover:bg-primary group-hover:text-white group-hover:ring-primary"
                : "bg-surface text-label ring-line"
            }`}
          >
            {dong}
          </span>
        ))}
      </div>

      {/* 위치 카드 — 원형 아이콘이 호버 시 채워진다(= 현재 위치를 잡았다). */}
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface p-1.5 ring-1 ring-line-alt">
        <span
          style={step(2)}
          className="grid size-5 shrink-0 place-items-center rounded-full bg-tint transition-colors duration-300 group-hover:bg-primary"
        >
          <span className="size-1.5 rounded-full bg-primary transition-colors duration-300 group-hover:bg-white" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[8.5px] font-bold text-ink">현재 위치로 찾기</span>
          <span className="block text-[7.5px] text-muted">GPS로 내 동네를 잡아요</span>
        </span>
      </div>

      <div className="my-1.5 flex items-center gap-1.5">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[7px] text-muted">또는 직접 선택</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-surface px-2 py-1.5 ring-1 ring-line-alt">
        <span className="size-2 shrink-0 rounded-full ring-1 ring-faint" />
        <span className="text-[7.5px] text-muted">동네 또는 구 검색</span>
      </div>

      {/* CTA — 호버 시 로즈로 채워진다. */}
      <div
        style={step(3)}
        className="mt-2 rounded-lg bg-primary/20 py-1.5 text-center text-[8.5px] font-bold text-primary-deep transition-colors duration-300 group-hover:bg-primary group-hover:text-white"
      >
        성수동으로 시작하기
      </div>
    </Frame>
  );
}

/** ② 60초 진단 — 실제 Q1 화면: 진행바 + 문항 + 선택지 카드. */
export function PreviewDiagnosis() {
  return (
    <Frame>
      {/* 진행바 — 호버하면 1/3에서 끝까지 간다. 60초에 끝난다는 약속을 형태로. */}
      <div className="flex items-center gap-1.5">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-track">
          <span className="block h-full w-1/3 rounded-full bg-primary transition-[width] duration-500 ease-out group-hover:w-full" />
        </span>
        <span className="text-[7px] font-semibold text-muted">1 / 3</span>
      </div>

      <p className="mt-2 text-[8px] font-bold text-primary">Q1. 관심사</p>
      <p className="mt-0.5 text-[11px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
        퇴근하고 뭐 하고
        <br />
        싶으세요?
      </p>

      {/* 선택지 — 호버 시 "운동·산책"이 선택된다. */}
      <div className="mt-2 space-y-1">
        {[
          { title: "문화·공연", desc: "전시 · 공연 · 영화" },
          { title: "운동·산책", desc: "러닝 · 걷기길" },
          { title: "먹거리·마켓", desc: "맛집 · 플리마켓" },
        ].map((o, i) => (
          <div
            key={o.title}
            style={step(i)}
            className={`flex items-center justify-between rounded-lg bg-surface px-2 py-1.5 ring-1 transition-colors duration-300 ${
              i === 1 ? "ring-line-alt group-hover:ring-primary" : "ring-line-alt"
            }`}
          >
            <span className="min-w-0">
              <span className="block text-[8.5px] font-bold text-ink">{o.title}</span>
              <span className="block text-[7px] text-muted">{o.desc}</span>
            </span>
            {i === 1 && (
              <span className="size-2.5 shrink-0 rounded-full bg-line-alt transition-colors duration-300 group-hover:bg-primary" />
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}

/**
 * ③ 동네 리포트 — 실제 /report 화면: 원픽 카드 + 함께 보면 좋아요 행.
 *
 * 활동명·비용은 DB에서 온 실제 레코드다(picks). 지어낸 활동명을 쓰면 안 되는 이유:
 * 같은 페이지 4번 섹션이 진짜 적재 데이터를 렌더한다 — 그 위에 그럴듯한 가짜 공연명을
 * 얹으면 방문자는 둘을 구분할 수 없다. 데이터가 없으면(로컬·빈 DB) 이름 없는
 * 플레이스홀더 바로 내려간다. 없는 활동을 광고하느니 형태만 보여주는 게 낫다.
 */
export function PreviewReport({ picks = [] }: { picks?: PreviewPick[] }) {
  const [onePick, ...rest] = picks;
  const related = rest.slice(0, 2);
  return (
    <Frame>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-extrabold text-ink">내 동네 기준</span>
        <span className="rounded-full px-1.5 py-[2px] text-[7px] font-semibold text-muted ring-1 ring-line">
          재진단
        </span>
      </div>

      <p className="mt-1.5 text-[8px] font-bold text-primary">오늘의 원픽</p>

      {/* 원픽 카드 — 호버 시 로즈 링이 들어온다(오늘의 1픽이 확정되는 순간). */}
      <div
        style={step(0)}
        className="mt-1 overflow-hidden rounded-lg bg-surface ring-1 ring-line-alt transition-colors duration-300 group-hover:ring-primary/45"
      >
        <div
          className="h-9 w-full"
          style={{ background: "linear-gradient(135deg, var(--color-sun), var(--color-primary))" }}
        />
        <div className="bg-tint/50 p-2">
          {onePick ? (
            <>
              <span className="inline-block rounded-sm bg-primary px-1 py-[1px] text-[6.5px] font-bold text-white">
                {onePick.categoryLabel}
              </span>
              <p className="mt-1 line-clamp-1 text-[9.5px] font-extrabold leading-tight text-ink">
                {onePick.title}
              </p>
            </>
          ) : (
            <>
              <span className="block h-2 w-5 rounded-sm bg-primary/70" />
              <span className="mt-1.5 block h-1.5 w-20 rounded-full bg-ink/35" />
            </>
          )}
          <div className="mt-1.5 flex items-end justify-between rounded-md bg-tint px-1.5 py-1">
            {onePick ? (
              <span className="text-[10px] font-extrabold leading-none text-primary-deep">
                {onePick.costLabel}
              </span>
            ) : (
              <span className="block h-2 w-6 rounded-full bg-primary-deep/40" />
            )}
          </div>
        </div>
      </div>

      {/* 함께 보면 좋아요 — 썸네일 행. 실제 레코드가 있을 때만 이름을 쓴다. */}
      <p className="mt-2 text-[7.5px] font-bold text-label">함께 보면 좋아요</p>
      <div className="mt-1 space-y-1">
        {(related.length > 0 ? related : [null, null]).map((r, i) => (
          <div key={r?.id ?? i} style={step(i + 1)} className="flex items-center gap-1.5">
            <span className="size-5 shrink-0 rounded-md bg-gray-100" />
            <span className="min-w-0 flex-1">
              {r ? (
                <span className="block line-clamp-1 text-[8px] font-bold text-ink">{r.title}</span>
              ) : (
                <span className="block h-1.5 w-14 rounded-full bg-ink/25" />
              )}
            </span>
            {r ? (
              <span
                className={`shrink-0 text-[7.5px] font-bold ${
                  r.tone === "mint" ? "text-mint" : "text-primary"
                }`}
              >
                {r.costLabel}
              </span>
            ) : (
              <span className="h-1.5 w-4 shrink-0 rounded-full bg-primary/40" />
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}
