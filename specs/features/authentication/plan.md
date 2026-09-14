# Implementation Plan — Authentication (Frontend)

> **Derived from:** [spec.md](./spec.md) — approved
> **Counterpart:** [../../../../backend/specs/features/authentication/plan.md](../../../../backend/specs/features/authentication/plan.md)
> **Status:** Ready for review
> **Blocked by:** backend implementation **and a seeded database**. Verification here is entirely manual, so **no criterion can be signed off until the backend is running and seeded** — and with no account-creation UI, a developer cannot get past `/login` at all without a seeded account. The UI can be built against the contract in the meantime.

**Deliberately not built:** `app/(app)/team/page.tsx` · `CreateInterviewerForm.tsx` · `InterviewerList.tsx` · `RequireRole.tsx` · `ui/skeleton.tsx` · a `createInterviewerSchema` · any `/api/users` wrapper. The app has no account-creation surface (spec FR-6), and no route is role-gated (spec FR-5.2).

**Built, and easy to mistake for dead code:** `app/forbidden/page.tsx`. No guard routes to it, but it is the required rendering for a `403` from any API call (spec FE-7.4). Do not drop it alongside `RequireRole`.

Net: the client calls four endpoints — `login`, `refresh`, `me`, `logout` — and defines one schema and one query key.

---

## Architecture Impact

This feature turns a single-page demo scaffold into a routed, authenticated application. It is the largest structural change this repo will take, and every later view inherits its shape.

**New structure:**

| Addition | Purpose |
|---|---|
| `src/middleware.ts` | First `middleware.ts` in the project. Cookie-presence gate only — a UX optimisation with **no security value**. |
| Route groups `(auth)` / `(app)` | Splits the unauthenticated shell from the authenticated one. `(app)/layout.tsx` owns bootstrap + chrome, so no page repeats the guard. |
| `src/features/<domain>/` | First feature-module convention: `components/`, `api/`, `hooks/`, plus module-local state. Later features follow it. |
| In-memory token store | The first piece of app state deliberately held **outside** React, because `apiFetch` must read it synchronously from outside the tree. |

**Changes to shared files** — both are depended on by everything, so they land early and carefully:

- **`src/lib/api.ts`** — gains Bearer attachment, `credentials: 'include'`, and the single-flight refresh interceptor. **The existing `apiFetch` signature and `ApiError` contract are preserved**, so `ApiStatusCard` and any future caller need no change.
- **`src/app/layout.tsx`** — real metadata (currently `"Create Next App"`), and the auth provider added alongside the existing `QueryProvider` and `Toaster`.

**Pattern this establishes:** role-specific routes rather than one view with client-side field hiding — the rule in [../../../CLAUDE.md](../../../CLAUDE.md) that the candidate views will depend on.

**Next.js 16 caveat:** [../../../AGENTS.md](../../../AGENTS.md) warns this version's APIs differ from older ones. Read `node_modules/next/dist/docs/` for `middleware.ts`, route groups and `layout.tsx` **before** writing them, rather than relying on remembered Next conventions. This is R-1 below.

---

## Frontend Changes

All paths relative to `frontend/`. Every entry is **NEW** unless marked MODIFIED.

### Types & schemas

**`src/features/auth/types.ts`** — NEW · module
- **Responsibility:** the client's mirror of the backend contract. `Role = 'INTERVIEWER' | 'RECRUITER'`, `User = { id, name, email, role, createdAt }`, `LoginResponse`, `RefreshResponse`, `ApiErrorBody = { code, message, details? }`.
- **There is deliberately no field for `passwordHash` or a token on `User`** — a leaked field then fails type-checking as well as review (FE-11).
- **States rendered:** none.

**`src/lib/schemas/auth.ts`** — NEW · schema
- **Responsibility:** `loginSchema` + its `z.infer` type export. **That is the whole file** — there is no `createInterviewerSchema` (AC-F30).
- **Reuses:** the pattern in [`src/lib/schemas/quick-note.ts`](../../../src/lib/schemas/quick-note.ts).
- **Required modification:** `loginSchema.password` is `z.string().min(1)` — **no 8-character minimum** (VAL-1, AC-F08). **No schema in this client has a `role` field** (VAL-2).

### Token store

**`src/features/auth/access-token.ts`** — NEW · module
- **Responsibility:** `getAccessToken()` / `setAccessToken()` / `clearAccessToken()` over a module-scoped `let`.
- **Required modification:** deliberately **not** React state — `apiFetch` reads it synchronously from outside the tree. Nothing here touches `localStorage`, `sessionStorage` or cookies (DM-1, AC-F14).
- **States rendered:** none.

### API layer

**`src/lib/api.ts`** — MODIFIED · shared module
- **Responsibility:** unchanged — the single path to the backend.
- **Required modification:**
  1. Add `credentials: 'include'` to the `fetch` options (FE-4.2).
  2. Attach `Authorization: Bearer <token>` when `getAccessToken()` returns one, without overriding an explicit caller header.
  3. Capture the serialised body **before** the first attempt so a replay sends an identical payload (FE-4.7, AC-F18).
  4. On `401`, and only when the path is not `/api/auth/login` or `/api/auth/refresh` (FE-4.5), call a module-level `refreshOnce()` and replay the request **exactly once**. A `401` on the replay is thrown to the caller — never a second refresh (FE-4.3, AC-F17).
  5. `refreshOnce()` holds a module-level `Promise | null`; concurrent callers await the same promise and it is cleared in a `finally` (FE-4.4, AC-F15).
  6. On refresh failure: `clearAccessToken()`, invoke a registered `onAuthFailure` callback (set by the auth provider — keeps `api.ts` free of React and router imports), then throw.
- **Preserve:** the `apiFetch<T>(path, { body, headers, ...init })` signature and `ApiError { message, status, body }`.
- **States rendered:** none.

**`src/features/auth/api/auth.api.ts`** — NEW · api module
- **Responsibility:** exactly four wrappers — `login()`, `logout()`, `refresh()`, `getMe()`. Components never assemble a path or header (API-2).
- **Required modification:** **no `createInterviewer()`, no `listInterviewers()`, no `signup()`** (API-5, AC-F29). Do not add a wrapper "for later" — an exported call to an endpoint with no UI is how the removed feature comes back by accident.
- **Reuses:** `apiFetch`, the types from `types.ts`.

### Hooks & provider

**`src/features/auth/AuthProvider.tsx`** — NEW · client component
- **Responsibility:** runs the bootstrap sequence once per page load, registers `onAuthFailure` with `api.ts`, and exposes bootstrap status via context.
- **Required modification:** bootstrap = `refresh()` → on success `setAccessToken` then let the `['auth','me']` query run; on failure clear state and redirect to `/login?next=<path>` (FE-3, AC-F19).
- **States rendered:** `bootstrapping` (delegated to the layout's loading UI).

**`src/features/auth/hooks/useAuth.ts`** — NEW · hook
- **Responsibility:** `{ user, role, isLoading, isAuthenticated, login, logout }`.
- **Required modification:** `useQuery({ queryKey: ['auth','me'], queryFn: getMe, retry: false })` — **`retry: false`** so a genuine 401 doesn't delay the redirect (FE-5.3). `login`/`logout` are `useMutation`s that set/clear the token and seed or clear the cache. `/api/auth/me` stays the authority; the login response only seeds (FE-5.1).
- **Reuses:** TanStack Query via the existing [`src/components/providers/query-provider.tsx`](../../../src/components/providers/query-provider.tsx).

### Guards

**`src/middleware.ts`** — NEW · middleware
- **Responsibility:** cheap pre-render redirect only. Reads `request.cookies.get('refresh_token')` — **presence only, never validated** (FE-6.1).
- **Required modification:** no cookie + protected path → `/login?next=<path>`; cookie + `/login` → `/pipeline`. A `matcher` config excluding `_next`, static assets and the favicon. An in-file comment stating this has **no security value** (FE-6.4).
- **States rendered:** none (redirect only).

**`src/features/auth/components/RequireAuth.tsx`** — NEW · client component
- **Responsibility:** renders a full-page loading state until bootstrap resolves, then children or a redirect to `/login?next=`.
- **States rendered:** loading, redirect.

**`src/features/auth/components/RequireRole.tsx`** — **NOT BUILT**
- No route is role-gated once `/team` is removed (spec FR-5.2, FE-7.2), so this component would ship with no consumer. It is specified and built by the first feature that introduces a genuinely role-gated route.
- **The 403 view is still built** (`app/forbidden/page.tsx`) — an API `403` must render somewhere, and the server can send one whether or not the client gates anything (FE-7.4, AC-F26).

### Routes

**`src/app/layout.tsx`** — MODIFIED · root layout
- **Required modification:** replace stock metadata with `{ title: 'Recruitment Pipeline' }`; wrap children in `AuthProvider` inside the existing `QueryProvider`; keep `<Toaster />`.

**`src/app/page.tsx`** — MODIFIED · page
- **Required modification:** the demo content (`ApiStatusCard`, `QuickNoteForm`) is replaced by a redirect to the role-appropriate landing route. `ApiStatusCard` is **kept as a file** — it still polls `GET /`, which the backend preserves — but is no longer mounted here.

**`src/app/(auth)/login/page.tsx`** — NEW · page
- **Responsibility:** renders `LoginForm` in a centred card. No chrome, no guard.
- **Reuses:** `card.tsx`.

**`src/app/(app)/layout.tsx`** — NEW · layout
- **Responsibility:** `<RequireAuth>` + app chrome (user name, role chip, nav, logout).
- **Required modification:** the nav links `/pipeline` and `/my-interviews` and is **identical for both roles** — no conditional link, because no route is role-gated (FE-10.2, AC-F23). No "team", "add user" or "invite" control appears anywhere in the chrome (FE-10.4).
- **Reuses:** `button.tsx`, `separator.tsx`, `badge.tsx` for the role chip.
- **States rendered:** loading (bootstrap), success.

**`src/app/(app)/pipeline/page.tsx`** — NEW · page (placeholder)
**`src/app/(app)/my-interviews/page.tsx`** — NEW · page (placeholder)
- **Responsibility:** render the authenticated user's name and role only. Real content belongs to later features (FR-7).
- **These two are the entire authenticated route set.**

**`src/app/(app)/team/page.tsx`** — **NOT BUILT** (spec FR-6). `/team` resolves to the app's 404 (AC-F22, AC-M04).

**`src/app/forbidden/page.tsx`** — NEW · page
- **Responsibility:** the 403 view — heading, explanation, a link back to the role-appropriate landing route.
- **Required modification:** it is reached from the **API error path**, not from a route guard (FE-9.2). Build it even though `RequireRole` is not built.
- **Reuses:** `card.tsx`, `button.tsx`.

### Components

**`src/features/auth/components/LoginForm.tsx`** — NEW · client component
- **Responsibility:** the whole login state matrix (FE-8.3).
- **Reuses:** `react-hook-form` + `zodResolver`, and `field.tsx` (`Field`/`FieldGroup`/`FieldLabel`/`FieldError`), `input.tsx`, `label.tsx`, `button.tsx`.
- **Required modification:** email `autoComplete="username"` + autofocus, password `autoComplete="current-password"`. On `401`: form-level error, `resetField('password')`, `setFocus('password')`, email retained (AC-F04). On `500`/network: generic message, both fields retained (AC-F05, AC-F06). Submit and both inputs disabled while in flight (AC-F03). Redirect resolution delegated to `resolveRedirect` below.
- **States rendered:** idle, client-invalid, submitting, 401, 500/network, success.

**`src/features/auth/redirect.ts`** — NEW · module
- **Responsibility:** `resolveRedirect(next: string | null, role: Role)` — returns `next` only when it starts with a single `/` and not `//`; otherwise `/pipeline` for RECRUITER, `/my-interviews` for INTERVIEWER (FE-8.4, SEC-3).
- **Required modification:** kept pure and separate from the form, so the open-redirect rule (AC-F12, AC-F13) lives in one readable place and can be checked by hand with a crafted `?next=` URL.

**`src/features/auth/components/CreateInterviewerForm.tsx`** — **NOT BUILT** (spec FR-6.1).
**`src/features/auth/components/InterviewerList.tsx`** — **NOT BUILT**.
**`src/components/ui/skeleton.tsx`** — **NOT ADDED.** It was required only by the removed interviewer list, so this feature introduces **no new shadcn primitive** and `src/components/ui/` is untouched (AC-F32).

`LoginForm` is therefore the only form in the client, and the only component this feature adds beyond the guards and route shells.

### Config

**`package.json`** — MODIFIED
- Scripts: add `"typecheck": "tsc --noEmit"` (none exists today).
- **No new dependency, runtime or dev** — RHF, zod, TanStack Query, sonner and the shadcn primitives already cover this feature, and this repo adds no test tooling (see § Verification Commands).
- `sonner` stays wired in the root layout but **this feature raises no toast**: the only success path (login) navigates instead. Leave the `<Toaster />` in place for later features rather than removing and re-adding it.

---

## Backend Changes

This is a frontend plan. The backend work is planned in [../../../../backend/specs/features/authentication/plan.md](../../../../backend/specs/features/authentication/plan.md).

**This feature requires no backend change beyond what that plan already delivers.** Everything consumed here is specified there:

| Consumed | Backend plan reference |
|---|---|
| `POST /api/auth/login` → `{ user, accessToken, expiresIn }` + cookie | § API Changes |
| `POST /api/auth/refresh` → cookie-only, rotated | § API Changes |
| `GET /api/auth/me` → `{ user }` \| 401 | § API Changes |
| `POST /api/auth/logout` → 204 always | § API Changes |
| CORS `credentials: true`, explicit origin | § Backend Changes → `app.ts` |
| Cookie named `refresh_token`, `Path=/api/auth` | § Backend Changes → `lib/cookies.ts` |
| `GET /` unchanged | Preserved as a health check, so `ApiStatusCard` keeps working |
| **A seeded database** | § Backend Changes → `prisma/seed.ts`. Not merely convenient: with no signup UI, seeded (or Postman-created) accounts are the **only** way to log in. |

**`POST /api/users` does not exist on either side.** `GET /api/users` exists on the backend but is **not consumed here** — it is an operator tool.

---

## Database Changes

**The frontend has no database.** No schema, no migrations, no indexes, no data migration. This section documents client-side state ownership instead.

| State | Where | Lifetime | Persisted | Invalidated by |
|---|---|---|---|---|
| Access token | `features/auth/access-token.ts` module variable | Page load → unload, logout, or refresh failure | **No** | `clearAccessToken()` |
| Refresh token | `HttpOnly` cookie set by the backend | 1 day | By the browser — **unreadable by this app** | Backend on logout/rotation |
| Current user | Query cache `['auth','me']` | Until invalidated or unload | No | Login, logout, refresh failure |
| `?next=` target | URL search param | Single navigation | No | Consumed on login success |
| Form values | `react-hook-form` component state | Component lifetime | No | `reset()` on success |

**Hard rule:** nothing auth-related is written to `localStorage`, `sessionStorage` or IndexedDB (DM-1). This is a review checklist item and an assertion in `AC-F14` / `AC-M05`.

---

## API Changes

Every endpoint is **consumed unchanged** — this feature requires no contract modification.

| Endpoint | Method | Sends | Expects | Errors handled | Auth | Query key |
|---|---|---|---|---|---|---|
| `/api/auth/login` | POST | `{ email, password }` | `200 { user, accessToken, expiresIn }` | `400` → field errors · `401` → form error, clear password · `500`/network → generic | anonymous | — (mutation) |
| `/api/auth/refresh` | POST | — (cookie) | `200 { accessToken, expiresIn }` | `401` → clear state, redirect `/login` | cookie | — (interceptor) |
| `/api/auth/me` | GET | — | `200 { user }` | `401` → interceptor handles | Bearer | `['auth','me']` |
| `/api/auth/logout` | POST | — (cookie) | `204` | any failure → clear locally and redirect anyway | cookie | — (mutation) |

**Four calls, one query key.** Two backend endpoints are deliberately never called:

- `POST /api/auth/signup` — an operator/bootstrap endpoint. Calling it from the browser would put an anonymous, role-accepting account-creation path in the client.
- `GET /api/users` — exists and is recruiter-gated, but has no UI (spec FR-3.5 backend-side).

A `403` is not reachable from any of the four calls above, and is **still handled** — it renders the 403 view (AC-F26). The client does not get to assume the server agrees with its own routing.

---

## Shared Types / Contracts

`frontend/` and `backend/` are **separate git repositories**. Nothing is shared by import — only by agreement. Each row must change in both repos or it breaks silently at runtime.

| Contract item | Owned by | Mirrored here in | What breaks here if it changes |
|---|---|---|---|
| Safe user shape | Backend | `features/auth/types.ts` → `User` | Chrome, role routing |
| `Role` values | Backend (Prisma enum) | `features/auth/types.ts` → `Role` | Landing route, role chip, `resolveRedirect` |
| Error shape `{ code, message, details? }` | Backend | `features/auth/types.ts` → `ApiErrorBody` | `ApiError.message` and every `code` branch |
| Error `code` strings | Backend | Error-handling switch in `LoginForm` | Wrong UI for the wrong failure |
| `details` keyed by body field | Backend | `setError` mapping in `LoginForm` | Server-side field errors land nowhere |
| **No authenticated account-creation endpoint** | Backend | Absence of a wrapper in `auth.api.ts` | Nothing today — recorded so that building a provisioning UI is a deliberate cross-repo decision, not an accident |
| Cookie name `refresh_token` | Backend | `src/middleware.ts` | Middleware redirects a logged-in user to `/login` |
| Cookie `Path=/api/auth` | Backend | — (browser behaviour) | Refresh/logout silently unauthenticated |
| `Authorization: Bearer` | Backend | `src/lib/api.ts` | Every authenticated call 401s |
| `401` recoverable / `403` terminal | Backend | `src/lib/api.ts` interceptor | Infinite refresh loop, or a recoverable failure logging the user out |

---

## Verification Commands

Run from `frontend/`. Step 5 additionally needs the backend running on `:3000` with a seeded database.

```bash
# 1. Dependencies
npm install
#    no new package, and NO `npx shadcn add` step — this feature adds no primitive

# 2. Type check + lint
npm run typecheck && npm run lint && npm run format:check

# 3. Build
npm run build
#    proves: route groups, middleware.ts and the server/client boundary
#            compile under Next 16 — catches R-1 and R-4

# 4. Confirm nothing provisions accounts (AC-F28, AC-F29, AC-F30)
grep -rn "api/users\|auth/signup" src/ ; echo "exit: $?"
#    expect NO match. A hit means a caller for a removed endpoint shipped.
grep -rn "role" src/lib/schemas/
#    expect NO match — no schema in this client carries a role (VAL-2)

# 5. Manual acceptance pass (backend running, `npm run db:seed` done)
npm run dev     # http://localhost:3001
```

**Step 4 is not optional.** The feature's main change is an *absence*, and an absence is the one thing a browser pass cannot confirm — an unreachable `createInterviewer()` wrapper or a stale `/team` route renders nothing and still ships. Grep the source; don't rely on the Network tab.

**Login is only possible with a seeded backend.** There is no signup UI, so an empty database means no way into the app at all. Run the backend's `npm run db:seed` before step 5.

**This repo has no automated test suite.** Every acceptance criterion is signed off by hand in step 5, in Chrome with DevTools open on the Network, Application and Console tabs. § Acceptance Criteria Mapping is the script: work down it row by row, one row per criterion.

Seeded accounts, password per the backend's `SEED_PASSWORD`:

| Account | Role |
|---|---|
| `recruiter@demo.test` | RECRUITER |
| `interviewer1@demo.test` | INTERVIEWER |

The `AC-M*` rows are the environment pass — the five checks a person can only make against a real browser and a real backend. Run them once per build, before the per-criterion walk:

| Step | Proves |
|---|---|
| Log in as `recruiter@demo.test`; DevTools › Application › Cookies shows `refresh_token` flagged **HttpOnly**; `document.cookie` in the console does **not** list it | AC-M01 |
| Hard-reload `/pipeline` while logged in — session survives, **no login-page flash** | AC-M02 |
| Idle past 15 minutes, then act — Network tab shows **exactly one** `/api/auth/refresh` and the action succeeds | AC-M03 |
| Log in as `interviewer1@demo.test`, type `/team` into the address bar — the app's **404** renders, **no** `/api/users` request of any method, no console error | AC-M04 |
| DevTools › Application › Local Storage **and** Session Storage — neither holds a token | AC-M05 |

---

## Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | **Next.js 16 API drift.** [../../../AGENTS.md](../../../AGENTS.md) explicitly warns that this is not the Next.js in most training data. `middleware.ts`, route groups and `layout.tsx` typing (the repo already uses `LayoutProps<'/'>`) may all differ. | Code that looks right and fails to build, or silently doesn't run. | Read `node_modules/next/dist/docs/` for each API **before** writing it. Run `npm run build` early (step 4 of § Verification Commands) rather than only at the end. |
| R-2 | **`src/lib/api.ts` is shared.** `ApiStatusCard` already uses it, and every future feature will. | A regression here breaks the whole app, not just auth. | Preserve the signature and `ApiError` contract exactly. After the interceptor lands, reload the existing demo page and confirm `ApiStatusCard` still resolves — do that **before** wiring the interceptor into anything new. |
| R-3 | **Single-flight refresh is the subtlest logic here.** A missing `finally` leaves a stale promise cached and every later 401 resolves against a dead token. | Users mysteriously logged out, or an infinite refresh loop. | Clear the promise in `finally`. Check the **call count** in the Network tab (AC-F15), not just that the requests succeed. Exclude `/login` and `/refresh` from the interceptor (AC-F16) or the failure path recurses. |
| R-4 | **Server/client component boundary.** Guards, `useAuth` and the token store are all client-side; a missing `'use client'` fails at build time, and an unnecessary one costs hydration. | Build failures, or auth state evaluated server-side where it doesn't exist. | Mark only the leaves that need it. Pages stay server components where possible; `(app)/layout.tsx` is a client component because `RequireAuth` needs hooks. |
| R-5 | **`middleware.ts` can be mistaken for security.** It only checks cookie presence; a forged cookie walks past it. | A future contributor removes a real guard believing middleware covers it. | In-file comment stating it has no security value (FE-6.4). `AZ-1` in the spec. The backend re-authorizes every request, and is the *only* authorization in the system — the client gates nothing by role at all. |
| R-6 | **In-memory token + hard reload.** Every reload starts with no token, so bootstrap must run before any authenticated render. | Login flash or an empty app shell on every refresh. | `(app)/layout.tsx` gates on bootstrap (AC-F20). `middleware.ts` prevents the shell flash for the no-cookie case. |
| R-7 | **Cross-tab logout is eventual, not instant** (EC-12), and rotation reuse-detection can log **both** tabs out if two refresh simultaneously (EC-13). | Looks like a bug during a demo. | Documented in the spec as accepted. Both surface as an ordinary refresh failure, which AC-F16 already covers. Do not add `BroadcastChannel` — it is explicitly out of scope. |
| R-8 | **Nothing here is automated.** With no test suite, a regression in the interceptor or the login state matrix is caught only by someone repeating the manual pass. | Silent breakage as later features land on top of `src/lib/api.ts`. | Treat § Acceptance Criteria Mapping as a standing manual script and re-run it in full before any merge touching `src/lib/api.ts` or `src/features/auth/`. Revisit a test runner once the auth surface stops changing. |
| R-9 | **A removal is easy to leave half-done.** An unreachable `createInterviewer()` wrapper, an orphaned `/team` route, or a `skeleton.tsx` added out of habit all ship silently — none of them renders, so a browser pass sees nothing wrong. | The removed feature creeps back, or dead code invites someone to wire it up. | `grep` the source, don't just click the app (step 4 of § Verification Commands). AC-F28/F29/F30/F32 are all source-level checks for exactly this reason. |
| R-10 | **All verification is blocked** until the backend ships and is **seeded** — there is no mocked-network suite, and now no signup UI either, so an unseeded database means no way into the app at all. | **No** criterion can be signed off from this repo alone, `AC-F*` included. | Sequence backend implementation **and `npm run db:seed`** before any acceptance pass; build the UI against the contract in the meantime and accept that it is unverified until then. Called out in § Implementation Order. |
| R-11 | **`<RequireRole>` is deliberately absent, but `/forbidden` is deliberately present.** The pairing looks like an oversight in review. | Someone deletes the 403 view as dead code, breaking AC-F26 — the client then has no rendering for a server `403`. | Comment `forbidden/page.tsx` in-file: reached from the API error path (FE-9.2), not from a guard. Spec FE-7.4 and the Out of Scope table both record it. |

---

## Implementation Order

Each step should leave the app building and type-checking.

1. **Setup.** Add the `typecheck` script. **No shadcn primitive is added** and no test tooling is installed — see § Verification Commands.
2. **Types + schemas + pure modules** — `types.ts`, `lib/schemas/auth.ts` (`loginSchema` only), `access-token.ts`, `redirect.ts`. No React yet, so the rules behind AC-F08 and AC-F11–F14 are settled in one readable place before any UI exists. *Independent of step 3.*
3. **`src/lib/api.ts`.** The interceptor lands **before** anything consumes it, and the existing demo page is reloaded to confirm `ApiStatusCard` still works (R-2, R-3). *Independent of step 2.*
4. **`auth.api.ts`** — four thin wrappers over `apiFetch`, and no fifth (AC-F29).
5. **`AuthProvider` + `useAuth`**, wired into `app/layout.tsx` with real metadata (AC-F19–F21).
6. **Guard + 403 view** — `RequireAuth` and `app/forbidden/page.tsx` (AC-F26). **No `RequireRole`** (R-11) — comment the 403 view so its purpose is legible without one.
7. **`src/middleware.ts`** (AC-F24, AC-F25). Run `npm run build` here — first real exposure to R-1.
8. **Route shells** — `(auth)/login`, `(app)/layout.tsx` with chrome and logout, and the two placeholder pages (AC-F23, AC-F34–F36).
9. **`LoginForm`** (AC-F01–F10). The full state matrix, and the only form in the app.
10. **`app/page.tsx`** — replace the demo content with the role-based redirect. Left late so the demo page stays available for eyeballing during development.
11. **Absence sweep** — run the greps in § Verification Commands step 4 and confirm AC-F22 and AC-F27–F33 (R-9). Do this as its own step: it is the part of the feature a browser cannot show you.
12. **Full manual acceptance pass** — every command in § Verification Commands, then every row of § Acceptance Criteria Mapping. Steps 1–4 of that section can run now; **step 5 requires the backend to be implemented and seeded** (R-10).

Steps 2 and 3 are independent of each other. Everything else is sequential.

---

## Acceptance Criteria Mapping

Every criterion in [spec.md](./spec.md#acceptance-criteria) appears below. Implementation entries use the paths from § Frontend Changes.

The third column is the **manual check** — this repo has no automated tests. Run the whole pass with the app on `http://localhost:3001`, the backend on `:3000` seeded, and DevTools open on the Network, Application and Console tabs.

| Acceptance Criterion | Implementation | Manual Verification |
|---|---|---|
| AC-F01 — empty email blocks submit, no request | `LoginForm.tsx`, `lib/schemas/auth.ts` | On `/login`, leave email blank and submit → field message renders; Network tab shows **no** `/api/auth/login` |
| AC-F02 — malformed email blocks submit | `lib/schemas/auth.ts` | Type `notanemail`, submit → field message; still **no** request |
| AC-F03 — submitting disables button + inputs | `LoginForm.tsx` | Throttle to Slow 3G, submit → button and both inputs disabled for the whole in-flight period; clicking again fires nothing |
| AC-F04 — 401 → form error, password cleared, focus moved | `LoginForm.tsx` (`resetField` + `setFocus`) | Valid email, wrong password → form-level error, password field empty **and focused**, email retained |
| AC-F05 — 500 → generic message, both fields retained | `LoginForm.tsx` | Stop Postgres so the backend 500s, submit → generic message, both fields keep their values |
| AC-F06 — network failure → generic message | `LoginForm.tsx`, `lib/api.ts` | Set DevTools to Offline, submit → same generic message, no unhandled console error |
| AC-F07 — no signup, forgot-password, or request-an-account link | `(auth)/login/page.tsx`, `LoginForm.tsx` | Read the rendered `/login` page — none of the three appears anywhere on it |
| AC-F08 — short password still sent (no client minimum) | `lib/schemas/auth.ts` `loginSchema` | Submit a 3-character password → Network tab shows the request **was** sent; the backend's 401 is what renders |
| AC-F09 — RECRUITER lands on `/pipeline` | `LoginForm.tsx`, `redirect.ts`, `useAuth` | Log in as `recruiter@demo.test` → URL becomes `/pipeline` |
| AC-F10 — INTERVIEWER lands on `/my-interviews` | `redirect.ts` | Log in as `interviewer1@demo.test` → URL becomes `/my-interviews` |
| AC-F11 — same-origin `?next=` honoured over the role default | `redirect.ts` | Logged out, visit `/login?next=/my-interviews`, log in as the **recruiter** → lands on `/my-interviews`, not `/pipeline`; no role check intervenes |
| AC-F12 — absolute `?next=` discarded | `redirect.ts` | Visit `/login?next=https://example.com`, log in → lands on the role default; the browser **never** leaves the origin |
| AC-F13 — protocol-relative `?next=` discarded | `redirect.ts` | Visit `/login?next=//example.com`, log in → lands on the role default |
| AC-F14 — no token in browser storage | `access-token.ts` | After login, Application › Local Storage **and** Session Storage — neither holds a token (also AC-M05) |
| AC-F15 — concurrent 401s → **one** refresh | `lib/api.ts` `refreshOnce()` single-flight | With `/team` gone the app fires few parallel calls, so force it: in the console, `Promise.all([getMe(), getMe(), getMe()])` with an expired token → Network tab shows exactly **one** `/api/auth/refresh` and three successful replays |
| AC-F16 — refresh 401 → clear state, redirect `/login` | `lib/api.ts` `onAuthFailure`, `AuthProvider` | Delete the `refresh_token` cookie in DevTools, then act → redirected to `/login`; no refresh loop in the Network tab |
| AC-F17 — replay 401 → no second refresh | `lib/api.ts` retry-once flag | During the AC-F15 check, count the entries: one `/refresh` and one replayed request, not a cascade |
| AC-F18 — replay sends identical body | `lib/api.ts` body captured pre-attempt | No `POST` with a body survives in this feature, so exercise it directly: with an expired token, call `apiFetch('/api/auth/me', { method: 'POST', body: {...} })` from the console → the replayed request carries a byte-identical payload. **Re-check this against the first real authenticated `POST` a later feature adds** |
| AC-F19 — bootstrap: one refresh then `/me` | `AuthProvider.tsx` | Hard-reload while logged in → Network tab shows `/api/auth/refresh` then `/api/auth/me`, one of each |
| AC-F20 — loading during bootstrap, no shell, no login flash | `(app)/layout.tsx`, `RequireAuth.tsx` | Throttle to Slow 3G, hard-reload `/pipeline` → loading state only; no app chrome and no login form flashes first |
| AC-F21 — navigation triggers no extra `/me` | `useAuth` query cache `['auth','me']` | Navigate `/pipeline` → `/my-interviews` → `/pipeline` → no further `/api/auth/me` in the Network tab |
| AC-F22 — no `/team` route, no provisioning components, no `RequireRole` | `(app)/` contains two pages only | `ls src/app/\(app\)/` → `pipeline` and `my-interviews` only; `ls src/features/auth/components/` → `LoginForm.tsx` and `RequireAuth.tsx` only. In the browser, `/team` renders the app's **404** (also AC-M04) |
| AC-F23 — chrome is identical for both roles, no user-creation affordance | `(app)/layout.tsx` | Log in as each role in turn → the same nav links both times; nothing anywhere offers to add, invite, or manage a user |
| AC-F24 — anonymous `/pipeline` → `/login?next=/pipeline` | `src/middleware.ts` | Logged out, visit `/pipeline` → URL becomes `/login?next=/pipeline` |
| AC-F25 — authenticated `/login` → redirected away | `src/middleware.ts` | Logged in, visit `/login` → redirected to the role landing route |
| AC-F26 — an API 403 still renders the 403 view | `forbidden/page.tsx`, error handling in `lib/api.ts` | Temporarily make the backend return `403` for `GET /api/auth/me` (or call `/api/users` once from the console as an interviewer) → the 403 view renders rather than a blank page, a crash, or a toast |
| AC-F27 — no user-creation form anywhere | `(app)/` route set | Walk every route and every piece of chrome as a recruiter → no signup, invite, or provisioning form exists |
| AC-F28 — no call to a creation endpoint in the shipped bundle | absence of wrappers in `auth.api.ts` | `grep -rn "api/users\|auth/signup" src/` → **no match**; repeat against `.next/` after `npm run build` |
| AC-F29 — `auth.api.ts` exports exactly four functions | `features/auth/api/auth.api.ts` | Read the file → `login`, `logout`, `refresh`, `getMe`, and nothing else |
| AC-F30 — `loginSchema` is the only schema; no `role` field | `lib/schemas/auth.ts` | Read the file; `grep -rn "role" src/lib/schemas/` → no match |
| AC-F31 — the client never touches `/api/users` | absence of a caller | Use the app end to end as a recruiter with the Network tab filtered to `users` → zero requests |
| AC-F32 — no `skeleton.tsx` added | `src/components/ui/` untouched | `ls src/components/ui/` → no `skeleton.tsx`; `git status` shows no new file there |
| AC-F33 — no placeholder implying a missing feature | `(app)/layout.tsx`, placeholder pages | Read the chrome and both landing pages → no disabled "add user" button, no "coming soon", no empty team panel |
| AC-F34 — logout calls API, clears state, redirects | `(app)/layout.tsx`, `useAuth.logout` | Click logout → `POST /api/auth/logout` fires, URL becomes `/login`, `refresh_token` gone from Application › Cookies |
| AC-F35 — logout failure still clears and redirects | `useAuth.logout` catch branch | Stop the backend, click logout → still redirected to `/login` with local state cleared |
| AC-F36 — back button after logout → `/login` | `src/middleware.ts` + `RequireAuth.tsx` | Log out, press Back → `/login`, never a cached authenticated view |
| AC-M01 — refresh cookie is HttpOnly | `lib/api.ts` (never touches cookies) | Application › Cookies shows `refresh_token` flagged HttpOnly; `document.cookie` does not list it |
| AC-M02 — session survives hard reload | `AuthProvider.tsx`, `src/middleware.ts` | Hard-reload `/pipeline` while logged in → session survives, no login-page flash |
| AC-M03 — one refresh after 15-min idle | `lib/api.ts` interceptor | Idle past 15 minutes, then act → Network tab shows exactly one `/api/auth/refresh` and the action succeeds |
| AC-M04 — `/team` no longer exists | `(app)/` route set | As the interviewer, address-bar to `/team` → the app's 404 renders; no `/api/users` request of any method; no console error |
| AC-M05 — no token in local/session storage | `access-token.ts` | Application › Local Storage and Session Storage — neither holds a token |
