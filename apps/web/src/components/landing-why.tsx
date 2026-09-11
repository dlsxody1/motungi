import { LandingPhoto } from "@/components/landing-photo";
import { WebContainer } from "@/components/web-shell";
import type { MockOpportunity } from "@/data/opportunities";

/**
 * 랜딩 2번째 섹션 — "왜 모퉁이" 물감 벤토.
 *
 * 이전: 큰 사진 1 + 흰 카드 2(큰 숫자 + 문단). 흰 배경 위 흰 카드라 죽어 있었다.
 * 지금: 각 칸이 서로 다른 물감 면을 갖는다(사진 / 로즈 워시 / 민트 워시).
 * 칸 수 = 콘텐츠 수 = 3. 빈 칸 없음.
 */
export function LandingWhy({ featured }: { featured?: MockOpportunity }) {
  return (
    <section className="paint-paper bg-surface pt-[52px] pb-[76px]">
      <WebContainer>
        <div className="reveal max-w-[640px]">
          <h2 className="break-keep text-[30px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink text-balance">
            찾아보지 않아도 되고,{" "}
            <span className="paint-underline">찾고 싶으면</span> 찾을 수 있어요.
          </h2>
          <p className="mt-3 text-[16px] leading-[1.65] text-label">
            흩어진 동네 정보를 모아 하나로 좁혀드려요. 오늘은 정해주는 대로, 다음엔 직접 골라도 되게.
          </p>
        </div>

        <div className="reveal-depth mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
          {/* 주인공 — 실제 활동 포스터. 물감 카드 형태로 잘라 다른 칸과 형태를 맞춘다.
              featured가 있으면 진짜 데이터, 없으면 톤 그라데이션 폴백. */}
          <LandingPhoto
            src={featured?.imageUrl}
            alt={featured ? `오늘의 원픽 — ${featured.title}` : "오늘의 원픽 활동"}
            tone="dusk"
            sizes="(min-width: 1024px) 56vw, 100vw"
            // 이 셀이 LCP 후보다(첫 화면 바로 아래 큰 이미지) → priority로 미리 받는다.
            priority
            // 포스터 위에 카피를 얹으므로 살짝만 눌러 대비를 확보한다. 블러는 걸지 않는다 —
            // 포스터는 작품이라 흐리면 고장난 것처럼 보인다(가독성은 scrim이 담당).
            imgClassName="opacity-80"
            className="paint-card wcard-hover flex min-h-[430px] flex-col justify-end p-9 lg:row-span-2"
            scrim
          >
            <div className="relative max-w-[30rem]">
              <h3 className="text-[30px] font-extrabold leading-[1.2] tracking-[-0.015em] text-white text-balance">
                오늘 딱 하나.
                <br />
                원픽으로 끝냅니다.
              </h3>
              <p className="mt-3 text-[15px] leading-[1.6] text-white/90">
                관심사·동네·시간에 규칙 기반으로 맞춘 활동 1~3개. 왜 이걸 골랐는지 근거까지 함께 보여드려요.
              </p>
            </div>
          </LandingPhoto>

          {/* 아래 민트 칸과 형태를 맞춘다 — 물감 얼룩은 모서리에, 텍스트는 왼쪽 정렬.
              3D를 걷어낸 자리: 덩어리 하나 보여주자고 WebGL 청크를 받을 이유가 없었다. */}
          <article className="paint-card paint-wash wcard-hover relative flex min-h-[205px] flex-col justify-center overflow-hidden p-7">
            <span
              aria-hidden
              className="paint-blob-a paint-drift pointer-events-none absolute -top-8 -right-10 h-[150px] w-[150px] opacity-30"
              style={{ background: "radial-gradient(circle at 38% 34%, var(--color-sun), var(--color-primary))" }}
            />
            <div className="relative">
              <p className="text-[15px] font-bold text-primary-deep">고민하는 시간</p>
              <p className="mt-1.5 text-[38px] font-extrabold leading-none tracking-[-0.02em] text-ink">
                60<span className="text-[21px] font-bold text-muted">초</span>
              </p>
              <p className="mt-2.5 text-[14px] leading-[1.6] text-label">
                검색하고 고민할 필요 없이, 3문항 진단으로 오늘 할 것만 골라드려요.
              </p>
            </div>
          </article>

          {/* 하이퍼로컬 — 민트 워시. 위 칸과 다른 색면이라 "같은 카드 반복"이 아니다.
              실적재된 활동 수는 heroPicks로 증명되지 않으므로 숫자를 지어내지 않는다. */}
          <article
            className="paint-card paint-wash wcard-hover relative flex min-h-[205px] flex-col justify-center overflow-hidden p-7"
            style={{ ["--wash" as string]: "var(--color-mint-tint)", ["--wash-2" as string]: "#cfe8e0" }}
          >
            {/* 걸어서 닿는 거리 = 반경. 물감 원 두 개가 겹친 자국으로 집·회사 2축을 암시한다. */}
            <span
              aria-hidden
              className="paint-blob-b pointer-events-none absolute -top-8 -right-10 h-[150px] w-[150px] opacity-30"
              style={{ background: "radial-gradient(circle at 38% 34%, #7fc9b8, #1e6e64)" }}
            />
            <p className="relative text-[15px] font-bold text-mint">하이퍼로컬</p>
            <p className="relative mt-1.5 text-[34px] font-extrabold leading-none tracking-[-0.02em] text-ink">
              걸어서<span className="ml-1.5 text-[21px] font-bold text-muted">닿는 거리</span>
            </p>
            <p className="relative mt-2.5 max-w-[22rem] text-[14px] leading-[1.6] text-label">
              집과 회사 두 곳을 기준으로 거리를 재요. 퇴근길에 들를 수 있는 것만 남겨드려요.
            </p>
          </article>
        </div>
      </WebContainer>
    </section>
  );
}
