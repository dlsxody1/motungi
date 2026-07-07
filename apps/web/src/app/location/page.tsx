"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LocationIcon,
  SearchIcon,
} from "@/components/icons";
import { Button, Chip, MobileScreen, SafeBottom, SafeTop } from "@/components/ui";
import { DesktopShell, WebContainer } from "@/components/web-shell";
import { NEIGHBORHOOD_POINTS } from "@/data/opportunities";
import { useAppStore } from "@/store/useAppStore";

const NEIGHBORHOODS = ["망원동", "성수동", "연남동", "판교동", "합정동"];

/** A2 · 위치 / 동네 설정 — 반응형 */
export default function LocationPage() {
  const router = useRouter();
  const setAnchor = useAppStore((s) => s.setAnchor);
  const [selected, setSelected] = useState("망원동");
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);

  const filtered = useMemo(
    () => NEIGHBORHOODS.filter((n) => n.includes(query.trim())),
    [query],
  );

  const start = () => {
    // 선택 동네를 집 앵커로 저장(좌표 주입). 리포트/스코어링의 distance 기준점.
    setAnchor("home", { dongName: selected, point: NEIGHBORHOOD_POINTS[selected] });
    router.push("/diagnosis");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      window.alert("위치를 가져오지 못했어요. 동네를 직접 선택해 주세요.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // 행정동 변환(Kakao)은 Phase 2. 우선 좌표만 앵커에 저장.
        setAnchor("home", {
          dongName: selected,
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
        setLocating(false);
        router.push("/diagnosis");
      },
      () => {
        setLocating(false);
        window.alert("위치를 가져오지 못했어요. 동네를 직접 선택해 주세요.");
      },
    );
  };

  return (
    <>
      {/* ── 모바일 ── */}
      <div className="md:hidden">
        <MobileScreen>
          <div className="flex flex-1 flex-col bg-bg">
            <SafeTop />
            <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4">
              <Link href="/" className="tap-safe -ml-2 flex w-11 items-center text-ink">
                <ChevronLeftIcon size={24} />
              </Link>

              <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
                어느 동네 기준으로
                <br />
                찾아드릴까요?
              </h1>
              <p className="mt-2 text-[15px] text-muted">설정한 동네가 추천의 기준이 돼요.</p>

              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="mt-6 flex items-center gap-3 rounded-xl bg-surface p-4 text-left shadow-card disabled:opacity-60"
              >
                <span className="grid size-11 place-items-center rounded-full bg-tint text-primary">
                  <LocationIcon size={22} />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-bold text-ink">
                    {locating ? "위치 확인 중…" : "현재 위치로 찾기"}
                  </span>
                  <span className="block text-[13px] text-muted">위치 권한 → 행정동 자동 설정</span>
                </span>
                <ChevronRightIcon size={20} className="text-faint" />
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[12px] text-muted">또는 직접 선택</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="flex h-[52px] items-center gap-2 rounded-xl bg-surface px-4 shadow-card">
                <SearchIcon size={20} className="text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                  placeholder="동네 이름 검색 (예: 망원동)"
                />
              </div>

              <p className="mb-2.5 mt-5 text-[13px] font-semibold text-label">최근 · 인기 동네</p>
              {filtered.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filtered.map((n) => (
                    <Chip key={n} active={selected === n} onClick={() => setSelected(n)}>
                      {selected === n && <LocationIcon size={14} />}
                      {n}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-muted">검색 결과가 없어요. 곧 더 많은 동네를 추가할게요.</p>
              )}

              <div className="mt-5 flex items-center gap-2 rounded-lg bg-tint/60 px-3.5 py-3 text-[14px] text-primary-deep">
                <CheckCircleIcon size={18} className="text-primary" />
                <span>
                  서울 마포구 <b>{selected}</b> 선택됨
                </span>
              </div>
            </div>

            <div className="shrink-0 px-6 pb-2 pt-2">
              <Button onClick={start}>{selected}으로 시작하기</Button>
            </div>
            <SafeBottom />
          </div>
        </MobileScreen>
      </div>

      {/* ── 데스크탑 ── */}
      <DesktopShell active="home" variant="marketing" footer={false}>
        <WebContainer className="py-14">
          <div className="mx-auto max-w-[560px]">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-muted hover:text-ink"
            >
              <ChevronLeftIcon size={18} /> 홈으로
            </Link>
            <h1 className="mt-4 text-[40px] font-extrabold leading-[1.2] tracking-[-0.025em] text-ink">
              어느 동네 기준으로
              <br />
              찾아드릴까요?
            </h1>
            <p className="mt-3 text-[17px] text-muted">설정한 동네가 모든 추천의 기준이 돼요.</p>

            <button
              onClick={useCurrentLocation}
              disabled={locating}
              className="mt-8 flex w-full items-center gap-4 rounded-[18px] bg-surface p-5 text-left shadow-web transition-shadow hover:shadow-web-lift disabled:opacity-60"
            >
              <span className="grid size-12 place-items-center rounded-full bg-tint text-primary">
                <LocationIcon size={24} />
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-bold text-ink">
                  {locating ? "위치 확인 중…" : "현재 위치로 찾기"}
                </span>
                <span className="block text-[13px] text-muted">위치 권한 → 행정동 자동 설정</span>
              </span>
              <ChevronRightIcon size={22} className="text-faint" />
            </button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[13px] text-muted">또는 직접 선택</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex h-14 items-center gap-2.5 rounded-[14px] bg-surface px-4 shadow-web">
              <SearchIcon size={20} className="text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
                placeholder="동네 이름 검색 (예: 망원동)"
              />
            </div>

            <p className="mb-3 mt-6 text-[14px] font-semibold text-label">최근 · 인기 동네</p>
            {filtered.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {filtered.map((n) => (
                  <Chip key={n} active={selected === n} onClick={() => setSelected(n)}>
                    {selected === n && <LocationIcon size={15} />}
                    {n}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-muted">검색 결과가 없어요. 곧 더 많은 동네를 추가할게요.</p>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-xl bg-tint/60 px-4 py-3.5 text-[15px] text-primary-deep">
              <CheckCircleIcon size={20} className="text-primary" />
              <span>
                서울 마포구 <b>{selected}</b> 선택됨
              </span>
            </div>

            <button
              onClick={start}
              className="tap-safe mt-8 flex h-[56px] w-full items-center justify-center rounded-xl bg-primary text-[17px] font-bold text-white transition-colors hover:bg-primary-deep"
            >
              {selected}으로 시작하기
            </button>
          </div>
        </WebContainer>
      </DesktopShell>
    </>
  );
}
