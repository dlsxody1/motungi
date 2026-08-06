"use client";

/**
 * 히어로 3D — 실제 활동 포스터가 원통형으로 늘어서 천천히 도는 WebGL 씬.
 *
 * 왜 3D인가(motion motivated): 이 제품의 가치는 "동네에 이렇게 많은 게 열리고 있다"는
 * 물량감이다. 캐러셀은 한 번에 한 장만 보여줘 그 물량감을 전달하지 못한다. 링은 여러
 * 장을 동시에 보여주면서 깊이로 우선순위를 만든다(앞=선명·큼, 뒤=흐림·작음).
 *
 * 인터랙션(플랫폼별로 다르다 — DOM 이벤트만 쓰고 스크롤은 건드리지 않는다):
 *  - desktop: 카드 클릭 → 회전 정지 + 그 카드가 정면으로 확대. 부모가 선택 UI를 띄운다.
 *  - mobile:  핀치줌(두 손가락) → 잡고 있는 동안 앞 카드 확대 + 회전 정지, 떼면 복귀.
 *             탭 → 선택(부모가 시트를 띄운다).
 *
 * 자산: DB의 실제 image_url(culture.seoul/culture.go.kr 포스터). 손으로 그린 도형 없음.
 * 원본은 http도 섞여 있고 CORS 헤더가 없어 WebGL 텍스처로 직접 못 쓴다 →
 * next/image 최적화 엔드포인트(/_next/image, same-origin)를 거쳐 받는다.
 *
 * 성능·안전:
 *  - 이 파일은 next/dynamic(ssr:false)으로만 로드된다 → three가 초기 번들에 안 들어간다.
 *  - prefers-reduced-motion: 회전 정지(정적 배치로 렌더). 확대 인터랙션은 그대로 동작.
 *  - WebGL 미지원/컨텍스트 실패: onFail로 알려 부모가 2D 폴백을 그린다.
 *  - 탭이 백그라운드거나 화면 밖이면 rAF 정지(모바일 배터리).
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** 링에 세울 포스터 최대 장수. 늘리면 텍스처 다운로드가 그만큼 늘어난다. */
const MAX_CARDS = 12;
/** 첫 화면에서 실제로 보이는(정면 근처) 장수 — 이만큼만 즉시 받고 나머지는 유휴 시간에. */
const EAGER_CARDS = 4;
/** 링 반지름(월드 단위). 카드 폭 대비 충분히 커야 서로 안 겹친다.
 *  12장 기준 이웃 간격(2π·R/12)이 카드 폭보다 커야 앞뒤가 뭉치지 않는다. */
const RADIUS = 4.6;
const CARD_W = 2.0;
const CARD_H = 2.83;
/** 1초당 회전 라디안. 느릴수록 고급스럽다. */
const SPIN = 0.14;
/** 선택된 카드의 배율. 카메라가 함께 물러나므로(focusedCamZ) 크게 잡아도 잘리지 않는다. */
const FOCUS_SCALE = 1.85;
/** 선택된 카드가 링에서 카메라 쪽으로 튀어나오는 거리(월드 단위).
 *  이웃 카드가 앞을 스치지 못할 만큼 확실히 빼낸다(깜빡임 방지). */
const FOCUS_LIFT = 3.2;
/** 던지기 최대 속도(라디안/초). 약 반 바퀴/초 — 이보다 빠르면 뭐가 지나갔는지 안 보인다. */
const MAX_FLING = 3.2;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export type PosterRingItem = { id: string; title: string; imageUrl: string };

/** 원본 이미지를 same-origin next/image 프록시 URL로 바꾼다(CORS + 최적화 동시 해결).
 *  링에서 카드는 화면의 1/3도 안 차지한다 — 256이면 충분하고, 384 대비 원본 fetch·인코딩이
 *  절반 이하다(느린 공공데이터 원본이 병목이라 장수당 대기가 그대로 줄어든다). */
function proxied(url: string, width = 256) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=60`;
}

/** 텍스처가 도착하기 전에 깔아둘 브랜드 톤 단색 — 링이 검게 비어 보이지 않게. */
const PLACEHOLDER = new THREE.Color("#7c3f57");

export function PosterRing({
  items,
  maxCards = MAX_CARDS,
  onFail,
  onSelect,
}: {
  items: PosterRingItem[];
  /** 링에 세울 장수. 모바일은 줄여서 텍스처 다운로드·GPU 부하를 낮춘다. */
  maxCards?: number;
  onFail?: () => void;
  /** 카드가 선택됐을 때(desktop 클릭 / mobile 탭). null이면 선택 해제. */
  onSelect?: (item: PosterRingItem | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // 콜백을 effect 의존성에서 빼기 위해 ref로 고정(부모가 인라인 함수를 넘겨도 씬이 재생성되지 않게).
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const cards = items.slice(0, Math.max(1, maxCards));
    if (cards.length === 0) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      onFailRef.current?.();
      return;
    }
    // WebGL 컨텍스트 생성은 성공해도 손실될 수 있다(모바일 메모리 압박).
    const canvas = renderer.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      onFailRef.current?.();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    // devicePixelRatio를 2로 캡 — 레티나에서 픽셀 수가 4배가 되면 모바일 GPU가 죽는다.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    // 좌우로 끌 수 있다는 신호. 세로 스크롤은 막지 않는다(pan-y) —
    // 가로 드래그만 우리가 가로채고 세로는 페이지에 넘긴다.
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "pan-y";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      34,
      host.clientWidth / Math.max(host.clientHeight, 1),
      0.1,
      100,
    );

    // 링 전체를 담는 그룹. 회전은 이 그룹만 돌린다(카드는 각자 바깥을 향해 고정).
    const ring = new THREE.Group();
    // 링 자체를 약간 기울여 정면 대칭을 깬다(DESIGN_VARIANCE).
    ring.rotation.z = 0.045;
    scene.add(ring);

    /**
     * 카메라 거리 — "앞 카드가 주인공"이 되도록 앞쪽 카드 기준으로 맞춘다.
     * 링 전체(지름)를 담으려 하면 앞 카드가 작아진다 → 앞면 반원만 기준으로 삼고,
     * 양옆 카드는 화면 밖으로 살짝 잘려나가며 "계속 이어짐"을 암시한다.
     */
    /** 평상시 카메라 z(링 둘러보기용). resize마다 다시 계산된다. */
    let baseCamZ = 12;

    const fitCamera = () => {
      const vFov = (camera.fov * Math.PI) / 180;
      // 세로: 카드 높이가 화면의 약 68%를 차지하게(위아래 숨 쉴 공간).
      const distV = (CARD_H / 0.68 / 2) / Math.tan(vFov / 2);
      // 가로: 앞 카드 + 좌우 이웃이 온전히 보이도록 카드폭의 2.9배를 담는다.
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const distH = (CARD_W * 2.9) / 2 / Math.tan(hFov / 2);
      // 앞 카드는 카메라 쪽으로 RADIUS만큼 나와 있으므로 그만큼 더 뒤에서 본다.
      baseCamZ = Math.max(distV, distH) + RADIUS;
      camera.position.set(0, 0.55, baseCamZ);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    fitCamera();

    /**
     * 선택된 카드가 화면에 꽉 차도록, 그 카드까지의 거리를 역산한다.
     * 카드를 앞으로 끌어내는 것만으로는 프레임 밖으로 나가버리므로
     * 카메라도 함께 뒤로 물러나 "확대해서 들여다보는" 구도를 만든다.
     */
    const focusedCamZ = () => {
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      // 확대된 카드가 세로 82% / 가로 78%를 차지하는 거리(둘 중 더 먼 쪽).
      const needV = (CARD_H * FOCUS_SCALE) / 0.82 / 2 / Math.tan(vFov / 2);
      const needH = (CARD_W * FOCUS_SCALE) / 0.78 / 2 / Math.tan(hFov / 2);
      // 카드는 z = RADIUS + FOCUS_LIFT 에 떠 있다.
      return RADIUS + FOCUS_LIFT + Math.max(needV, needH);
    };

    const loader = new THREE.TextureLoader();
    // next/image는 same-origin이지만, 캔버스 오염 방지를 위해 명시적으로 CORS 모드를 켠다.
    loader.setCrossOrigin("anonymous");

    const disposables: { dispose(): void }[] = [];
    const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
    disposables.push(geometry);

    /** 각 카드의 메시 + 원본 각도 + 현재 확대 진행도(0~1). */
    type Card = { mesh: THREE.Mesh; angle: number; item: PosterRingItem; grow: number };
    const built: Card[] = [];
    /** 뒤쪽 카드의 텍스처 로드 — 앞 카드가 끝난 뒤 유휴 시간에 실행한다. */
    const deferred: (() => void)[] = [];

    cards.forEach((item, i) => {
      const angle = (i / cards.length) * Math.PI * 2;
      const material = new THREE.MeshBasicMaterial({
        color: PLACEHOLDER,
        side: THREE.DoubleSide,
        transparent: true,
      });
      disposables.push(material);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
      // 각 카드가 링 바깥(=카메라 쪽을 지날 때 정면)을 보도록.
      mesh.rotation.y = angle;
      ring.add(mesh);
      built.push({ mesh, angle, item, grow: 0 });

      const load = () =>
        loader.load(
          proxied(item.imageUrl),
          (texture) => {
            // three r152+ 기본은 Linear — 포스터가 물 빠져 보인다. sRGB로 명시.
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            material.map = texture;
            material.color.set("#ffffff");
            material.needsUpdate = true;
            disposables.push(texture);
          },
          undefined,
          // 개별 포스터 404는 치명적이지 않다 — 그 카드만 톤 단색으로 남는다.
          () => {},
        );

      // 앞쪽 4장(정면 근처)만 즉시, 나머지는 그 뒤에 받는다.
      // 12장을 한꺼번에 요청하면 브라우저 커넥션 6개를 두고 경쟁해 "보이는 카드"가
      // 뒤쪽 카드 뒤에 줄 서 있게 된다 — 체감 대기가 그대로 늘어난다.
      // 링은 어차피 천천히 돌아 뒤 카드는 몇 초 뒤에나 정면에 온다.
      if (i < EAGER_CARDS) load();
      else deferred.push(load);
    });

    // 앞 카드가 다 뜬 뒤(또는 브라우저가 한가할 때) 나머지를 채운다.
    const idle: (cb: () => void) => number =
      window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 600));
    const idleId = idle(() => {
      for (const load of deferred) load();
    });

    // ── 상호작용 상태 ──
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    /** desktop: 클릭으로 고정된 카드. mobile: 핀치 중 앞 카드. null이면 자유 회전. */
    let focused: Card | null = null;
    /** 핀치 중인지(모바일). 손을 떼면 false → 복귀. */
    let pinching = false;
    /** 핀치가 임시로 집어든 카드 — 탭 선택이 아니면 손을 뗄 때 놓아준다. */
    let pinchedCard: Card | null = null;
    /** 목표 회전각 — 고정 시 그 카드를 정면(각도 0)으로 데려온다. */
    let targetRotation: number | null = null;
    /** 선택 상태 진행도(0~1) — 선택 안 된 카드를 흐리게 만드는 정도. */
    let dimAmount = 0;
    /** 카메라가 바라보는 z — 선택 시 앞으로 나온 카드를 따라간다. */
    let lookAtZ = 0;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    /** 화면 좌표 → 그 지점의 카드. 없으면 null. */
    const pick = (clientX: number, clientY: number): Card | null => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      // 매 프레임 position/rotation을 바꾸므로 월드 행렬이 낡아 있을 수 있다.
      // 갱신하지 않으면 레이가 옛 위치의 카드를 노려 아무것도 맞지 않는다.
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(built.map((c) => c.mesh), false)[0];
      if (!hit) return null;
      return built.find((c) => c.mesh === hit.object) ?? null;
    };

    /** 지금 카메라 정면에 가장 가까운 카드(핀치 확대 대상). */
    const frontCard = (): Card | null => {
      let best: Card | null = null;
      let bestZ = -Infinity;
      const v = new THREE.Vector3();
      for (const c of built) {
        c.mesh.getWorldPosition(v);
        if (v.z > bestZ) {
          bestZ = v.z;
          best = c;
        }
      }
      return best;
    };

    /** 카드를 정면으로 데려오기 위한 링 회전각. */
    const rotationFor = (card: Card) => {
      // 카드는 ring.rotation.y + card.angle 위치에 있다 → 그 합이 0(정면)이 되게.
      const current = ring.rotation.y;
      const raw = -card.angle;
      // 가장 가까운 등가 각도로 이동(한 바퀴 돌지 않게).
      const diff = ((raw - current + Math.PI) % (Math.PI * 2)) - Math.PI;
      return current + diff;
    };

    const focus = (card: Card | null) => {
      focused = card;
      targetRotation = card ? rotationFor(card) : null;
      onSelectRef.current?.(card ? card.item : null);
    };

    // ── 포인터 입력 ──
    // 탭과 드래그를 구분하기 위한 시작점. 스크롤 중 오탭을 막는다.
    let downAt: { x: number; y: number; t: number } | null = null;
    const activePointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    /** 핀치로 벌린 정도(0~1). 손을 떼면 0으로 돌아간다. */
    let pinchAmount = 0;
    /** 한 손가락으로 좌우 드래그 중인가(= 사용자가 링을 직접 돌리는 중). */
    let dragging = false;
    /** 마지막 드래그 지점 — 프레임 간 이동량으로 회전각을 만든다. */
    let dragLastX = 0;
    /** 마지막 드래그 시각 — 이동량을 시간으로 나눠 실제 속도를 구한다. */
    let dragLastT = 0;
    /** 손을 뗀 뒤 남는 관성 속도(라디안/초). 0으로 감쇠하며 기본 회전으로 돌아간다. */
    let velocity = 0;
    /** 드래그 픽셀 → 회전 라디안 환산.
     *  0.0035 ≈ 화면을 가로로 한 번 훑으면 링이 약 1/4 바퀴 — 손과 링이 붙어 움직이는 감각. */
    const DRAG_TO_RAD = 0.0035;

    const onPointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2) {
        // 두 손가락 → 핀치 시작. 앞 카드를 확대하고 회전을 멈춘다.
        const [a, b] = [...activePointers.values()];
        if (a && b) pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
        pinching = true;
        dragging = false; // 핀치가 시작되면 드래그 회전은 중단.
        // 이미 탭으로 고른 카드가 있으면 그걸 유지하고, 없으면 앞 카드를 집는다.
        // 핀치는 "들여다보기"라 시트를 띄우지 않는다 → focus()가 아니라 직접 대입.
        // pinchedCard가 null이면 = 탭 선택이 이미 있었다 → 손을 떼도 풀지 않는다.
        pinchedCard = focused ? null : frontCard();
        focused = focused ?? pinchedCard;
        targetRotation = null; // 핀치 중엔 정렬하지 않고 그 자리에서 커지기만.
        downAt = null; // 핀치가 시작되면 탭으로 치지 않는다.
      } else {
        downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
        dragLastX = e.clientX;
        dragLastT = performance.now();
        velocity = 0; // 새로 잡으면 관성은 즉시 멈춘다(손으로 잡은 느낌).
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      const prev = activePointers.get(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinching && activePointers.size === 2) {
        const [a, b] = [...activePointers.values()];
        if (a && b && pinchStartDist > 0) {
          // 벌린 정도를 0~1로 환산해 확대 진행도로 쓴다(오므리면 0으로).
          const ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinchStartDist;
          pinchAmount = Math.min(1, Math.max(0, (ratio - 1) / 0.6));
        }
        return;
      }

      // 한 손가락: 가로로 충분히 움직이면 드래그 회전으로 전환한다.
      if (activePointers.size !== 1 || !downAt || !prev) return;
      const dxTotal = e.clientX - downAt.x;
      const dyTotal = e.clientY - downAt.y;
      if (!dragging) {
        // 세로가 더 크면 페이지 스크롤 의도 → 회전을 가로채지 않는다.
        if (Math.abs(dxTotal) > 8 && Math.abs(dxTotal) > Math.abs(dyTotal)) {
          dragging = true;
          canvas.style.cursor = "grabbing";
          // 선택된 카드가 있으면 풀어준다(사용자가 다시 둘러보려는 것).
          if (focused && !pinching) focus(null);
        } else {
          return;
        }
      }
      const now = performance.now();
      const dx = e.clientX - dragLastX;
      const dtMove = Math.max(8, now - dragLastT); // 0 나눗셈·튐 방지
      dragLastX = e.clientX;
      dragLastT = now;
      ring.rotation.y += dx * DRAG_TO_RAD;
      // 순간 속도(라디안/초)를 지수 평활 — 마지막 한 프레임의 튐에 좌우되지 않게.
      // 상한을 두지 않으면 빠른 스와이프 한 번에 두세 바퀴가 돌아 방향 감각을 잃는다.
      const instant = (dx * DRAG_TO_RAD) / (dtMove / 1000);
      velocity = clamp(velocity * 0.7 + instant * 0.3, -MAX_FLING, MAX_FLING);
    };

    const endPointer = (e: PointerEvent) => {
      const start = downAt;
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2 && pinching) {
        // 손을 떼면 원래 크기로 복귀 + 회전 재개.
        // 단, 탭으로 고른 카드였다면(=선택 상태) 그대로 둔다 — 핀치가 잠깐 들여다본 것뿐.
        pinching = false;
        pinchAmount = 0;
        if (pinchedCard) focused = null; // 핀치가 집어든 것이면 놓아준다
        pinchedCard = null;
      }
      if (!start || activePointers.size > 0) return;
      downAt = null;
      // 링을 돌린 것이면 선택이 아니다 — 관성만 남기고 끝낸다.
      if (dragging) {
        dragging = false;
        canvas.style.cursor = "grab";
        return;
      }
      // 드래그(스크롤)로 판정되면 탭이 아니다.
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > 12 || performance.now() - start.t > 700) return;

      // 데스크탑·모바일 동일: 카드를 누르면 정면으로 나오며 확대되고, 빈 곳을 누르면 해제.
      // (모바일에서 탭이 확대 없이 시트만 띄우면 "뭘 고른 건지" 알 수 없다.)
      const hit = pick(e.clientX, e.clientY);
      focus(hit && hit !== focused ? hit : null);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endPointer);
    const onPointerCancel = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      pinching = false;
      pinchAmount = 0;
      dragging = false;
      canvas.style.cursor = "grab";
      // 핀치가 임시로 집어든 카드만 놓는다(탭으로 고른 선택은 유지).
      if (pinchedCard) {
        focused = null;
        pinchedCard = null;
      }
    };
    canvas.addEventListener("pointercancel", onPointerCancel);

    // 부모가 외부에서 선택을 해제할 수 있게 한다(시트 닫기 등).
    const onClearFocus = () => focus(null);
    host.addEventListener("posterring:clear", onClearFocus);

    // ── 렌더 루프: 보일 때만 돈다 ──
    let visible = true;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); // 탭 복귀 시 점프 방지
      last = now;

      /**
       * 회전 우선순위: 정렬(선택) > 드래그 > 관성 > 기본 자동 회전.
       * 선택 중에는 정렬만 회전을 건드린다 — 자동회전·관성이 같이 돌면 카드가
       * 앞뒤로 스치며 깜빡인다(이전 버그).
       */
      if (targetRotation !== null) {
        // 선택된 카드를 정면으로. 다른 회전원은 전부 끈다.
        velocity = 0;
        const diff = targetRotation - ring.rotation.y;
        ring.rotation.y += diff * Math.min(1, dt * 7);
      } else if (dragging) {
        // 드래그 중엔 onPointerMove가 직접 각도를 옮긴다 — 여기선 아무것도 더하지 않는다.
      } else if (Math.abs(velocity) > SPIN) {
        // 관성: 던진 속도로 한동안 미끄러지다가 기본 회전 속도로 수렴한다.
        ring.rotation.y += velocity * dt;
        velocity *= Math.exp(-2.6 * dt);
      } else if (!reduceMq.matches && focused === null) {
        // 관성이 잦아들면 기본 자동 회전으로. 손으로 돌린 방향은 유지한다.
        velocity = 0;
        ring.rotation.y += SPIN * dt;
      }

      // 카드별 확대 진행도를 목표값으로 부드럽게 수렴시킨다.
      for (const c of built) {
        // 탭/클릭으로 고른 카드는 1(완전 확대). 핀치 중에는 벌린 만큼만 따라간다.
        let want = 0;
        if (c === focused) want = pinching ? pinchAmount : 1;
        c.grow += (want - c.grow) * Math.min(1, dt * 7);

        /**
         * 선택된 카드는 링 위 제자리에서 "카메라 쪽(월드 +z)"으로 빠져나온다.
         *
         * 주의: mesh는 회전하는 ring의 자식이라 로컬 축이 함께 돈다. 반지름 방향으로
         * 밀면(sin/cos * out) 카드가 자기 각도 쪽으로 나가버려, 뒤쪽 카드는 오히려
         * 더 멀어진다. 그래서 ring 회전을 상쇄한 로컬 벡터로 월드 +z를 만들어 민다.
         */
        const lift = c.grow * FOCUS_LIFT;
        // 월드 +z 방향을 ring 로컬 좌표로 되돌린 벡터(ring.rotation.y 역회전).
        const ry = ring.rotation.y;
        c.mesh.position.set(
          Math.sin(c.angle) * RADIUS + lift * Math.sin(-ry),
          0,
          Math.cos(c.angle) * RADIUS + lift * Math.cos(-ry),
        );
        c.mesh.scale.setScalar(1 + (FOCUS_SCALE - 1) * c.grow);
        // 앞으로 끌려나온 카드는 링을 등지지 않고 카메라를 정면으로 본다.
        c.mesh.rotation.y = c.angle - c.angle * c.grow - ry * c.grow;

        // 선택된 카드를 나중에 그려 반투명 정렬이 뒤집히지 않게 한다.
        // (거리로 이미 앞서 있으므로 depthTest는 건드리지 않는다.)
        c.mesh.renderOrder = c.grow > 0.01 ? 1 : 0;
        // 나머지 카드는 뒤로 물러난 느낌으로 흐려 선택된 것에 시선을 몬다.
        const mat = c.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = c === focused ? 1 : 1 - 0.6 * dimAmount;
      }
      // 선택 상태 진입/해제를 부드럽게 — 나머지 카드가 툭 어두워지지 않게.
      dimAmount += ((focused ? 1 : 0) - dimAmount) * Math.min(1, dt * 7);

      // 카메라 돌리: 선택 중엔 뒤로 물러나 확대된 카드를 프레임에 담는다.
      // (카드만 키우면 화면 밖으로 잘린다 — 거리와 크기를 함께 움직여야 한다.)
      const wantZ = focused ? focusedCamZ() : baseCamZ;
      const wantY = focused ? 0 : 0.55; // 선택 중엔 눈높이를 카드 중앙으로.
      camera.position.z += (wantZ - camera.position.z) * Math.min(1, dt * 5);
      camera.position.y += (wantY - camera.position.y) * Math.min(1, dt * 5);
      // 시선도 함께 옮긴다 — 원점을 계속 보면 앞으로 나온 카드가 화면 위로 치우친다.
      lookAtZ += ((focused ? RADIUS + FOCUS_LIFT : 0) - lookAtZ) * Math.min(1, dt * 5);
      camera.lookAt(0, 0, lookAtZ);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // 뷰포트 밖이면 GPU를 쉬게 한다.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible && !document.hidden) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // reduced-motion을 켜면 회전만 멈추되, 정지 화면 한 장은 남아야 한다.
    const onReduceChange = () => {
      renderer.render(scene, camera);
    };
    reduceMq.addEventListener("change", onReduceChange);

    const resize = new ResizeObserver(() => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // 회전(가로↔세로)이나 브레이크포인트 변화에도 링이 잘리지 않게 거리를 다시 맞춘다.
      fitCamera();
      renderer.render(scene, camera);
    });
    resize.observe(host);

    start();

    return () => {
      stop();
      (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
      io.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMq.removeEventListener("change", onReduceChange);
      host.removeEventListener("posterring:clear", onClearFocus);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [items, maxCards]);

  // 씬 자체는 장식이다 — 같은 활동이 아래 목록에 텍스트로도 있으므로 스크린리더에서 숨긴다.
  // (선택된 카드의 실제 링크·제목은 부모가 접근 가능한 DOM으로 렌더한다.)
  return <div ref={hostRef} aria-hidden className="size-full" />;
}
