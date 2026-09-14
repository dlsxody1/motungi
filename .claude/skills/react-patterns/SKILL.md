---
name: react-patterns
description: >
  모퉁이(motungi) 웹앱(apps/web)의 React 컴포넌트 스킬. React 18/19 훅 규율, 서버/클라이언트
  컴포넌트 경계, Suspense·에러 바운더리, form actions, 데이터 페칭, 상태 관리 결정 트리,
  접근성 우선 조합. Next.js App Router의 .tsx 컴포넌트를 작성·리뷰할 때 사용.
  (모바일은 frontend-patterns 참고 — React Native와 구분)
origin: ECC
---

# React Patterns

Idiomatic React 18/19 patterns for building robust, accessible, performant component trees.

## When to Activate

- Writing or modifying React function components, custom hooks, or component trees
- Reviewing JSX/TSX files
- Designing state shape or component composition
- Migrating class components or older `forwardRef`/`useEffect`-heavy code
- Choosing between local state, lifted state, context, and external stores
- Working with Server Components / Client Components (Next.js App Router, RSC)
- Implementing forms with React 19 actions or controlled inputs
- Wiring data fetching with TanStack Query / SWR / RSC

## Core Principles

### 1. Render is a Pure Function of Props and State

```tsx
// Good: derive during render
function Cart({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return <span>{formatMoney(total)}</span>;
}

// Bad: derived state stored separately
function Cart({ items }: { items: CartItem[] }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0));
  }, [items]);
  return <span>{formatMoney(total)}</span>;
}
```

Derived state in `useEffect` adds a render cycle, can desync, and obscures the data flow.

### 2. Side Effects Outside Render

Effects, mutations, network calls, and subscriptions live in event handlers or `useEffect` — never in the render body.

### 3. Composition Over Inheritance

React has no inheritance model for components. Compose with `children`, render props, or component props.

## Hooks Discipline

See [rules/react/hooks.md](../../rules/react/hooks.md) for the full ruleset. Highlights:

- Top-level only, never conditional
- Cleanup every subscription, interval, listener
- Functional updater (`setX(prev => prev + 1)`) when new state depends on old
- Default position: do not memoize — add `useMemo`/`useCallback` only when a profiler or a dependency chain proves it matters
- Extract a custom hook only when the same hook sequence appears in 2+ components

## State Location Decision Tree

```
Used by one component?
  -> useState inside it

Used by parent + a few descendants?
  -> lift to nearest common ancestor

Used across distant branches AND low-frequency reads (theme, auth, locale)?
  -> React Context

High-frequency updates shared across the tree?
  -> external store (Zustand, Jotai, Redux Toolkit)

Derived from a server?
  -> server-state library (TanStack Query, SWR, RSC fetch)
```

Most pages do not need context or a global store. Resist abstraction until duplicated lifting becomes painful.

## 레이어 분리 결정 트리 (모퉁이 고유 · 기계가 강제함)

위 트리가 **상태를 어디 둘지**라면, 이건 **코드를 어느 파일에 둘지**다. 새 코드 한 덩어리를
쓰기 전에 반드시 통과시킨다.

```
이 덩어리가 React를 쓰나? (훅·JSX·컴포넌트 API)
├─ 아니오 → 순수 함수다
│   ├─ web·mobile이 함께 쓸 도메인 로직? → packages/core/src/
│   └─ web 전용?                        → apps/web/src/lib/
│       (둘 다 *.test.ts 필수 — gate.sh가 검사한다)
│
└─ 예
    ├─ JSX를 반환하지 않는다 (상태·효과·구독만) → apps/web/src/hooks/
    └─ JSX를 반환한다                          → apps/web/src/components/
```

### import 방향은 단방향이다 — 아래는 위를 모른다

```
app/         라우트          (무엇이든 import 가능)
components/  UI              ↛ app/
hooks/       상태·효과        ↛ components/ · app/
store/       전역 상태
lib/ · core/ 순수 함수        ↛ react · store/ · hooks/ · components/ · app/
```

`apps/web/.eslintrc.json`의 `import/no-restricted-paths`가 이걸 **Error로 막는다**.
`components/ → hooks/`는 **허용**이다 — "상태는 쓰는 컴포넌트가 소유한다"(헌법)가
바로 그 방향을 요구한다.

### 컴포넌트 안에 두면 안 되는 것

정렬 · 필터링 · 집계(그룹·카운트) · 문자열 정규화 · 거리/점수 계산 · 포맷팅.

**`useMemo`로 감쌌다고 컴포넌트 소유가 되는 게 아니다.** `useMemo`는 *언제* 다시
계산할지를 정할 뿐, *무엇을* 계산하는지는 여전히 도메인 로직이다. 계산은 `lib/`에 두고
컴포넌트는 호출만 한다:

```tsx
// ✗ 계산이 컴포넌트에 산다 — 테스트하려면 렌더해야 한다
const list = useMemo(() => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return source.filter((o) => terms.every((t) => haystack(o).includes(t)));
}, [source, query]);

// ✓ 계산은 순수 함수, 컴포넌트는 언제 부를지만 정한다
const list = useMemo(() => filterByTerms(source, query), [source, query]);
```

오른쪽은 `filterByTerms`를 렌더 없이 단언할 수 있고, mobile도 같은 함수를 쓴다.

선례 — [`app/explore/(list)/page.tsx`](apps/web/src/app/explore/(list)/page.tsx)는 이
규율이 없던 시절의 결과다: 스코어링·거리정렬·haystack·필터·집계가 JSX와 한 파일에 있어
`complexity 31`이 나온다. 반대 예는 [`hooks/useNeighborhoodSearch.ts`](apps/web/src/hooks/useNeighborhoodSearch.ts)
— 디바운스·IME 보류라는 **효과만** 들고 실제 검색은 `lib/geo`에 위임한다.

### 제출 전 자가 체크리스트

기계가 잡아주는 것 (`pnpm lint` · `bash scripts/gate.sh`):
1. 레이어 역방향 import → `import/no-restricted-paths` Error
2. `lib/`에서 React·store 사용 → `no-restricted-imports` Error
3. `lib/`·`core/`에 테스트 누락 → `check-pure-tests.sh` 실패
4. 300줄/150줄/복잡도 15 초과 → warn (신규 코드에서 나오면 쪼개라)

기계가 **못** 잡는 것 — 직접 확인한다:
5. 컴포넌트 안의 `useMemo`가 도메인 계산을 품고 있지 않은가? 있으면 `lib/`로 내린다.

## Server / Client Components (RSC)

```tsx
// Server Component - default, async, never ships JS for itself
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();
  return <ProductView product={product} />;
}

// Client Component - opt in with "use client"
"use client";
export function AddToCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => addToCart(productId))}
    >
      {pending ? "Adding..." : "Add to cart"}
    </button>
  );
}
```

Boundaries:

- Server -> Client: pass serializable props or `children`
- Client -> Server: invoke Server Actions via `<form action={...}>` or imperatively from event handlers
- Never `import` a Server Component from a Client Component file — compose them via `children` instead

## Suspense + Error Boundaries

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<UserSkeleton />}>
    <UserDetail id={id} />
  </Suspense>
</ErrorBoundary>
```

- Place Suspense boundaries close to the data, not at the route root — progressively reveal content
- Error Boundary remains a class API; use `react-error-boundary` for a hook-friendly wrapper
- A boundary catches errors thrown during render, lifecycle, and constructors of its children — NOT in event handlers or async code

## Forms

### React 19 form actions (preferred for new code)

> **React 19+**: This example uses `useActionState`. For React 18, use `useFormState` from `react-dom` instead.

```tsx
"use client";
import { useActionState } from "react";

const initial = { error: null as string | null };

async function updateUserAction(_prev: typeof initial, formData: FormData) {
  "use server";
  const parsed = UserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input" };
  await db.user.update({ where: { id: parsed.data.id }, data: parsed.data });
  return { error: null };
}

export function UserForm() {
  const [state, formAction, pending] = useActionState(updateUserAction, initial);
  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit" disabled={pending}>Save</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

### Controlled inputs

Use controlled when the value drives other UI, formats on every keystroke, or implements real-time validation.

### Complex forms

For multi-step forms, dynamic field arrays, or cross-field validation: use a library (React Hook Form, TanStack Form). Roll-your-own state management for forms past trivial complexity is a maintenance trap.

## Data Fetching Decision Matrix

| Need | Tool |
|---|---|
| Per-request data in Next.js App Router | RSC `await fetch()` |
| Client-side cache + mutations + invalidation | TanStack Query |
| Lightweight client cache + revalidation | SWR |
| Real-time subscriptions | Server-Sent Events, WebSockets, or the lib's subscription API |
| One-off fire-and-forget | `fetch()` in an event handler |

Avoid `useEffect` + `fetch` for application data — race conditions, no cache, no retry, no Suspense integration.

## Composition Recipes

### Slot via `children`

```tsx
<Layout>
  <Header />
  <Main>{content}</Main>
</Layout>
```

### Named slots

```tsx
<Page header={<Nav />} sidebar={<Filters />}>
  <Results />
</Page>
```

### Compound components (shared state via Context)

```tsx
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="profile"><Profile /></Tabs.Panel>
  <Tabs.Panel value="settings"><Settings /></Tabs.Panel>
</Tabs>
```

### Render prop / function-as-child

Useful when the parent needs to pass parameters to the rendered output:

```tsx
<DataLoader id={id}>
  {({ data, isLoading }) => isLoading ? <Spinner /> : <UserCard user={data} />}
</DataLoader>
```

Modern alternative: a hook (`useData(id)`) returning the same shape — usually cleaner.

## Performance

### When `React.memo` Actually Helps

Wrap a component in `React.memo` only when:

1. It re-renders frequently
2. Its props are usually the same between renders
3. Its render is measurably expensive

`React.memo` adds an equality check on every render. If props differ on most renders, the check is pure overhead.

### Avoiding Render Cascades

- Lift state down rather than up where possible
- Split context: one context per concern, so a change to `themeContext` does not re-render auth consumers
- Use `useSyncExternalStore` for external state libraries — required for safe concurrent rendering

### Lists

- Provide stable `key` props (database id, not array index)
- Virtualize long lists with `@tanstack/react-virtual` or `react-window` once visible item count exceeds ~50 with non-trivial rows

## Accessibility-First Composition

- Always render semantic HTML (`<button>`, `<a>`, `<nav>`, `<main>`) before reaching for `role` attributes
- Every interactive element must be reachable by keyboard
- Form inputs need labels — `<label htmlFor>` or `aria-label` if visually labeled by an icon
- Manage focus on route changes and modal open/close
- Run `axe` in component tests (see [skills/react-testing](../react-testing/SKILL.md))
- Cross-link: [skills/accessibility/SKILL.md](../accessibility/SKILL.md) covers WCAG criteria and pattern libraries

## Routing

This skill is router-agnostic. The patterns above work with React Router, TanStack Router, Next.js App Router, Remix Router. Router-specific patterns (loaders, actions, nested layouts) follow the router's documentation — those are framework concerns layered on top of React core.

## Out of Scope (Pointer Sections)

- **Next.js specifics**: App Router data loading, Route Handlers, Middleware, Parallel Routes — separate concern, use Next.js docs
- **React Native**: Platform-specific patterns differ enough to warrant a separate `react-native-patterns` skill (not present yet)
- **Remix**: Loader/action conventions overlap with RSC but follow Remix docs

## Related

- Rules: [rules/react/](../../rules/react/) — coding-style, hooks, patterns, security, testing
- Skills: [react-performance](../react-performance/SKILL.md) for the Vercel-derived performance ruleset, [frontend-patterns](../frontend-patterns/SKILL.md) for cross-framework UI concerns, [accessibility](../accessibility/SKILL.md), [angular-developer](../angular-developer/SKILL.md) for framework comparison
- Agents: `react-reviewer` for code review, `react-build-resolver` for build/bundler errors
- Commands: `/react-review`, `/react-build`, `/react-test`

## Examples

### Custom hook for debounced search

```tsx
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SearchBox() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi(debounced),
    enabled: debounced.length > 0,
  });
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Results items={data ?? []} />
    </>
  );
}
```

### Optimistic UI with React 19 `useOptimistic`

```tsx
"use client";
import { useOptimistic } from "react";

export function MessageList({ messages }: { messages: Message[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, newMessage],
  );

  async function send(formData: FormData) {
    const text = String(formData.get("text"));
    addOptimistic({ id: "pending", text, sender: "me" });
    await saveMessage(text);
  }

  return (
    <>
      <ul>{optimistic.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
      <form action={send}>
        <input name="text" />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

### Splitting context to avoid render cascades

```tsx
// Two contexts: one rarely changes, one frequently
const ThemeContext = createContext<Theme>("light");
const NotificationsContext = createContext<Notification[]>([]);

// A component that only consumes ThemeContext does NOT re-render when notifications change
```
