# Authentication — Login & User Provisioning (Frontend)

> **Status:** Approved — ready for `plan.md`
> **Feature slug:** `authentication`
> **Scope:** `frontend/` — Next.js 16 App Router + React 19
> **Counterpart:** [../../../../backend/specs/features/authentication/spec.md](../../../../backend/specs/features/authentication/spec.md)
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md)

---

## Goal

Give the app a login experience and a session layer such that:

1. A user signs in once with email and password and reaches the view that belongs to their role.
2. Credentials are held where an XSS bug cannot exfiltrate a reusable secret — **no token in `localStorage`, ever**.
3. A session survives a page reload and a quiet working hour without re-entering a password.
4. An expired access token is recovered transparently, without bouncing the user to `/login` mid-task.
5. **No user can create an account from the UI** — there is no signup form, no provisioning form, and no role selector anywhere in the app.
6. Every loading, error, and unauthorized state is designed rather than defaulted.

Success means: the app never renders a view with an unknown user, never guesses at a role, and never treats its own route guards as security.

---

## Background / Context

The POC brief requires (§6) that *"every action is tied to a real, authenticated user; there's no anonymous path through viewing or acting on a candidate."* On the frontend that means there is no "pick a role" dropdown and no demo mode — the app has exactly two states: signed out at `/login`, or signed in with a server-verified identity.

[../../../CLAUDE.md](../../../CLAUDE.md) also sets a rule this feature must honour from the start:

> Build views and API calls per the current user's role — don't build one "candidate view" that conditionally renders contact fields based on a client-side role check.

So role does not merely toggle UI here — it determines which route a user lands on and which routes exist for them at all.

### Current state of `frontend/`

| | Today |
|---|---|
| Stack | Next.js 16 App Router, React 19, TypeScript, Tailwind v4 |
| UI | shadcn/ui primitives over base-ui in [`src/components/ui/`](../../../src/components/ui/) — `field`, `input`, `label`, `button`, `table`, `card`, `select`, `dialog`, `sonner`, … |
| Data | TanStack Query 5, wired by [`src/components/providers/query-provider.tsx`](../../../src/components/providers/query-provider.tsx) |
| HTTP | [`src/lib/api.ts`](../../../src/lib/api.ts) — `apiFetch<T>()` + `ApiError` (reads `data.message`) |
| Forms | react-hook-form 7 + `@hookform/resolvers/zod` + zod 4; schema pattern in [`src/lib/schemas/quick-note.ts`](../../../src/lib/schemas/quick-note.ts) |
| Pages | One demo page (`ApiStatusCard`, `QuickNoteForm`). Stock metadata `"Create Next App"` |
| Routing | App Router only — no `middleware.ts` |
| Auth | **none** |
| Tests | **none** — and none planned. Verification for this POC is manual; automated testing is a later decision |

### Routing approach

Route protection is expressed entirely in App Router idioms, layered so that each piece does one job:

- **Route groups** — `(auth)` for the unauthenticated shell, `(app)` for the authenticated one. The guard lives in `(app)/layout.tsx`, so no page repeats it.
- **`middleware.ts`** — a cheap cookie-presence redirect that runs before any app JS, so a logged-out user never sees the authenticated shell flash. UX only, never the security control (AZ-1).
- **Client guard components** — `<RequireAuth>` performs the real check, against the session established by bootstrap.

The login view is `app/(auth)/login/page.tsx`, and all auth code is grouped as a feature module under `src/features/auth/`.

### Scope decisions taken before writing this spec

Settled, not open:

- **No signup page and no provisioning page.** Login is the only unauthenticated view, and the app creates no accounts at all.
- **Two roles only** — `INTERVIEWER` and `RECRUITER`. No `HIRING_MANAGER`.
- **Role-specific landings** — `RECRUITER → /pipeline`, `INTERVIEWER → /my-interviews`. Both routes are reachable by both roles; role determines only where you *land*.
- **No role-gated route exists in this feature.** A `403` reaches the client only as an API response, and is rendered as the 403 view.
- **Access token in React memory; refresh token in an `HttpOnly` cookie** the client can never read.

---

## Users / Actors

| Actor | Sees |
|---|---|
| **Anonymous visitor** | `/login` only. Any other route redirects to `/login?next=<path>`. |
| **Interviewer** (`INTERVIEWER`) | Lands on `/my-interviews`. Can reach `/pipeline` and `/my-interviews`. No user-creation UI exists anywhere. |
| **Recruiter** (`RECRUITER`) | Lands on `/pipeline`. Can reach `/pipeline` and `/my-interviews`. **The same routes as an interviewer** — the two roles differ only in landing page until a later feature introduces role-gated content. No user-creation UI exists anywhere. |

There is **no operator/admin persona in the UI at all.** Every account of either role is created from the backend — `POST /api/auth/signup` via Postman/curl, or `npm run db:seed`. A recruiter who needs an interviewer onboarded asks an operator; there is no page for it, by design.

---

## User Stories

**US-01** — As a **recruiter**, I want to log in and land on the pipeline so that I start where my work is, not on a generic dashboard.

**US-02** — As an **interviewer**, I want to log in and land on my assigned interviews so that I'm not dropped into a pipeline view that isn't mine to see.

**US-03** — As **any user**, I want to reload the page without being thrown back to the login screen.

**US-04** — As **any user**, I want a mistyped password to tell me clearly and let me retry without re-entering my email.

**US-05** — As **any user**, I want to keep working after fifteen quiet minutes without the app logging me out or losing what I was doing.

**US-06** — As **any user**, I want logging out to actually end my session, and to still log me out locally even if the network call fails.

**US-07** — As **any user**, I want the app to show me a clear "not authorized" message when the server refuses an action, rather than a blank page, a crash, or a silent bounce that makes the app look broken.

---

## Functional Requirements

### FR-1 — Session states

The app has exactly three session states, and every route resolves to one of them:

| State | Meaning | Rendered |
|---|---|---|
| `bootstrapping` | A refresh cookie may exist; identity not yet resolved | Full-page loading state |
| `authenticated` | `/api/auth/me` returned a user | The requested route, guarded by role |
| `anonymous` | No cookie, or refresh failed | `/login` |

**FR-1.1** The app **never** renders authenticated chrome while in `bootstrapping`, and **never** flashes `/login` before bootstrapping resolves.

### FR-2 — Login

- **FR-2.1** `/login` renders a form taking email and password.
- **FR-2.2** The form validates client-side before any request is made.
- **FR-2.3** On submit it calls `POST /api/auth/login`, stores the returned access token in memory, then calls `GET /api/auth/me` to establish identity.
- **FR-2.4** On success it navigates by role, or to a safe `?next=` target when one was supplied.
- **FR-2.5** Client validation is **UX only** — it mirrors backend rules for responsiveness and is never treated as a substitute for them.

### FR-3 — Session persistence

- **FR-3.1** The access token lives **only** in a module-scoped JavaScript variable. It is never written to `localStorage`, `sessionStorage`, IndexedDB, or a cookie.
- **FR-3.2** A page reload therefore starts with no access token. The app recovers one by calling `POST /api/auth/refresh` at bootstrap, relying on the `HttpOnly` cookie the browser sends automatically.
- **FR-3.3** When any API call returns `401`, the app refreshes once and replays the request once, so the user experiences no interruption at the 15-minute boundary.
- **FR-3.4** When refresh fails, the app clears all auth state and query cache and navigates to `/login?next=<current path>`.

### FR-4 — Logout

- **FR-4.1** A logout control is present in the app chrome on every authenticated page.
- **FR-4.2** It calls `POST /api/auth/logout`, then clears the in-memory token and the query cache, then navigates to `/login`.
- **FR-4.3** **If the request fails, local state is cleared and the navigation happens anyway.** A user who clicks log out is logged out locally regardless of the network.

### FR-5 — Route protection

- **FR-5.1** Every route other than `/login` requires authentication.
- **FR-5.2** **No route requires a particular role.** `/pipeline` and `/my-interviews` are both open to both roles; role determines the landing route only (FR-2.4). The previous recruiter-only `/team` route no longer exists.
- **FR-5.3** When the **API** returns `403 FORBIDDEN` for any call, the app renders the **403 view** — not a toast, not a redirect. Being bounced silently is indistinguishable from a bug.
- **FR-5.4** An unauthenticated user is sent to `/login?next=<path>` so that logging in returns them where they were headed.
- **FR-5.5** An already-authenticated user visiting `/login` is redirected away.
- **FR-5.6** **All client-side routing in FR-5 is a UX layer.** The backend re-authorizes every request independently, and the UI must handle a `403` response correctly even though it believes every route it exposes is permitted (FR-5.3).

### FR-6 — No account creation

- **FR-6.1** **The app contains no form, page, dialog, or control that creates a user account** — not for the current user, and not for anyone else. This includes signup, interviewer provisioning, and invite flows.
- **FR-6.2** No client code calls `POST /api/auth/signup` or `POST /api/users`. The latter does not exist on the backend.
- **FR-6.3** There is **no role selector anywhere in the app**, and no request this client sends carries a `role` key.
- **FR-6.4** Account provisioning is an operator action against the API. If a user asks how to add a colleague, the answer is organisational, not a missing screen.
- **FR-6.5** Adding any account-creation UI later is a **new feature requiring its own spec and a backend endpoint that does not currently exist** — it is not an incremental addition to this one.

### FR-7 — Landing placeholders

`/pipeline` and `/my-interviews` are guarded placeholder pages in this feature. They render the app chrome and the authenticated user's name and role only. Their real content is specified by later features.

---

## Frontend Requirements

### FE-1 — File structure

```
frontend/src/
├── middleware.ts                          # cookie-presence gate (UX only)
├── app/
│   ├── layout.tsx                         # real metadata + QueryProvider + Toaster + AuthProvider
│   ├── (auth)/
│   │   └── login/page.tsx                 # LoginPage
│   ├── (app)/
│   │   ├── layout.tsx                     # <RequireAuth> + app chrome + logout control
│   │   ├── pipeline/page.tsx              # RECRUITER landing (placeholder)
│   │   └── my-interviews/page.tsx         # INTERVIEWER landing (placeholder)
│   └── forbidden/page.tsx                 # 403 view — target for an API 403 (FR-5.3)
├── features/auth/
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   └── RequireAuth.tsx
│   ├── api/auth.api.ts                    # login / refresh / me / logout, via apiFetch
│   ├── hooks/useAuth.ts
│   ├── access-token.ts                    # in-memory token store
│   └── types.ts                           # User, Role, session types
└── lib/schemas/auth.ts                    # loginSchema, per the quick-note.ts pattern
```

Existing shadcn primitives in `src/components/ui/` are **used and extended, never re-implemented**. **No new UI primitive is introduced by this feature** — the `skeleton` primitive the removed `InterviewerList` would have required is not added.

**Not built, and deliberately so:** `team/page.tsx`, `CreateInterviewerForm.tsx`, `InterviewerList.tsx`, `RequireRole.tsx`. The first three follow from FR-6; `RequireRole` follows from FR-5.2 having no role-gated route to guard.

### FE-2 — Access-token store (`features/auth/access-token.ts`)

- **FE-2.1** A module-scoped variable with `getAccessToken()`, `setAccessToken(token)`, `clearAccessToken()`. **No persistence of any kind.**
- **FE-2.2** Not React state — it must be readable synchronously from `apiFetch`, which is outside the React tree.
- **FE-2.3** A hard reload starts with no token; FE-3 recovers it.

### FE-3 — Bootstrap sequence

On mount of the authenticated layout:

```
POST /api/auth/refresh   (credentials: 'include')
  │
  ├─ 200 → store access token in memory
  │          │
  │          └─ GET /api/auth/me → cache user → render children
  │
  └─ 401 → clear auth state → redirect /login?next=<current path>
```

- **FE-3.1** While this is in flight the layout renders a **full-page loading state** — never the app shell with empty data, never a flash of `/login`.
- **FE-3.2** The bootstrap refresh runs **once per page load**, not per component.

### FE-4 — `apiFetch` refresh interceptor

[`src/lib/api.ts`](../../../src/lib/api.ts) is extended. Its existing `apiFetch<T>(path, options)` signature and the `ApiError { message, status, body }` contract are **preserved** — callers elsewhere must not need changing.

- **FE-4.1** Attach `Authorization: Bearer <token>` when a token is in memory.
- **FE-4.2** Send `credentials: 'include'` so the refresh cookie travels cross-origin (`localhost:3001` → `localhost:3000`).
- **FE-4.3** On a `401` response, call `/api/auth/refresh` **once**, then **replay the original request exactly once**. A `401` on the replay is surfaced to the caller — the retry is never itself retried.
- **FE-4.4** **Single-flight:** concurrent `401`s share one in-flight refresh promise. Ten parallel queries expiring together must produce **exactly one** `POST /api/auth/refresh`, not ten. Every waiter resumes with the same new token.
- **FE-4.5** `/api/auth/login` and `/api/auth/refresh` are excluded from the interceptor — a `401` from those is a real failure, not a trigger.
- **FE-4.6** When refresh fails: clear the in-memory token, cancel and clear the TanStack Query cache, and redirect to `/login?next=<current path>`.
- **FE-4.7** A request body is captured before the first attempt so the replay sends an identical payload.

### FE-5 — `useAuth` (`features/auth/hooks/useAuth.ts`)

Exposes `{ user, role, isLoading, isAuthenticated, login, logout }`.

- **FE-5.1** Backed by a TanStack Query `['auth','me']` query hitting `GET /api/auth/me`. **`/me` is the single source of truth for identity** — the login response's user object may seed the cache but never replaces it as the authority.
- **FE-5.2** `login` and `logout` are mutations that update the token store and invalidate/clear the cache.
- **FE-5.3** The `['auth','me']` query does **not** retry on `401` — retrying a genuine auth failure just delays the redirect.

### FE-6 — `middleware.ts`

- **FE-6.1** Checks only that the `refresh_token` cookie **is present**. It does **not** validate it, decode it, or call the backend — it cannot, since the token is opaque and the access token lives in memory.
- **FE-6.2** No cookie + protected path → `redirect('/login?next=<path>')`. This exists purely to avoid an app-shell flash; the real guard is FE-7.
- **FE-6.3** Cookie present + path is `/login` → redirect to `/pipeline`. Role-correct landing is then settled client-side once `/me` resolves. Both roles may view `/pipeline`, so this redirect is never itself a `403`.
- **FE-6.4** Documented in-code as a UX optimisation with **no security value** — a forged cookie gets past it and is then rejected by the backend on the first real request.

### FE-7 — Guards

- **FE-7.1** `<RequireAuth>` renders a loading state until bootstrap resolves, then either its children or a redirect to `/login?next=`.
- **FE-7.2** **`<RequireRole>` is not built by this feature.** No route is role-gated (FR-5.2), so the component would ship with no consumer. The first feature that introduces a role-gated route specifies and builds it then.
- **FE-7.3** `<RequireAuth>` is documented in-code as **UX only**; the backend re-authorizes every request regardless.
- **FE-7.4** A `403 FORBIDDEN` from any API call renders the **403 view** at `/forbidden` (FR-5.3). That view is therefore built even though no guard routes to it — the server, not the client, is what sends a user there.

### FE-8 — Login page (`/login`)

- **FE-8.1** `LoginForm` uses react-hook-form + `zodResolver` with the shared login schema from `src/lib/schemas/auth.ts`.
- **FE-8.2** Fields built from the existing shadcn `Field` / `FieldGroup` / `FieldLabel` / `FieldError` primitives:
  - email — `type="email"`, `autoComplete="username"`, autofocus
  - password — `type="password"`, `autoComplete="current-password"`
- **FE-8.3** **State matrix:**

  | State | Behaviour |
  |---|---|
  | Idle | Submit enabled |
  | Client-invalid | Per-field messages under each field; **no network request** |
  | Submitting | Submit disabled with a spinner; both inputs disabled; double-submit impossible |
  | `401` | One form-level error: *"Invalid email or password."* Password cleared, email retained, focus returned to password |
  | `500` / network failure | Form-level error: *"Something went wrong. Please try again."* Both inputs retained |
  | Success | Token stored → `/api/auth/me` → navigate |

- **FE-8.4** **Redirect on success:** honour `?next=` only when it is a same-origin relative path (starts with a single `/`, not `//`); otherwise `RECRUITER → /pipeline`, `INTERVIEWER → /my-interviews`.
- **FE-8.5** The page renders **no signup link and no forgot-password link** — neither flow exists.
- **FE-8.6** The form is submittable with the Enter key and is keyboard-navigable; errors are associated with their inputs for screen readers.

### FE-9 — 403 view (`/forbidden`)

- **FE-9.1** A designed page: heading, a plain-English explanation that the action is not permitted for this account, and a link back to the role-appropriate landing route.
- **FE-9.2** It is reached when an **API response** is `403 FORBIDDEN` (FR-5.3, FE-7.4) — never by a client-side role check, because none exists.
- **FE-9.3** It renders no raw status code, error object, or endpoint path (ERR-2).

> **There is no `/team` page, no create-interviewer form, and no interviewer list in this app.** Account provisioning is an operator action against the API (FR-6).

### FE-10 — App chrome & logout

- **FE-10.1** The authenticated layout shows the current user's name and role and a logout control.
- **FE-10.2** The chrome links `/pipeline` and `/my-interviews`, both shown to both roles. **No link is role-conditional**, because no route is role-gated (FR-5.2). The role is displayed as a chip so the user can see which account they are in.
- **FE-10.3** Logout behaviour per FR-4, including the failure path (FR-4.3).
- **FE-10.4** The chrome contains **no "add user", "invite", or "team" affordance** (FR-6.1).

### FE-11 — Types (`features/auth/types.ts`)

`Role = 'INTERVIEWER' | 'RECRUITER'`, `User = { id, name, email, role, createdAt }`, and the login/refresh response types. These mirror the backend contract and are the only user shape the app models — **there is no client type that includes `passwordHash`**, so a leaked field would be a type error as well as a bug.

---

## Backend Requirements

Full backend behaviour is specified in [../../../../backend/specs/features/authentication/spec.md](../../../../backend/specs/features/authentication/spec.md). Only the guarantees this frontend **depends on** are recorded here — if any of these change, this spec breaks:

- **XBE-1** `POST /api/auth/login` returns `{ user, accessToken, expiresIn }` and sets an `HttpOnly` `refresh_token` cookie.
- **XBE-2** `POST /api/auth/refresh` works from the cookie alone, with no request body and no `Authorization` header, and returns a new access token.
- **XBE-3** `GET /api/auth/me` is the authority on identity and returns `401` when unauthenticated.
- **XBE-4** CORS allows the frontend origin with `credentials: true`, so `credentials: 'include'` works cross-origin.
- **XBE-5** The refresh cookie is named **`refresh_token`** — `middleware.ts` keys off that exact name.
- **XBE-6** Errors use the flat `{ code, message, details? }` shape, so the existing `ApiError` (which reads `data.message`) keeps working and `code` is switchable.
- **XBE-7** `401` means unauthenticated (recoverable by refresh) and `403` means unauthorized (not recoverable) — the interceptor's behaviour depends on these never being interchanged.
- **XBE-8** `details` on a `400` is keyed by request-body field name, so it maps directly onto form fields. The login form is the only consumer.
- **XBE-9** `message` is user-safe copy the UI may render verbatim.
- **XBE-10** **No endpoint exists for creating a user from an authenticated session.** `POST /api/users` is removed backend-side; the client must not ship a caller for it.
- **XBE-11** Accounts are provisioned out-of-band (`POST /api/auth/signup` from Postman/curl, or the seed). A user the client cannot see may nonetheless exist — the app never assumes it has a complete picture of the user table, because it never reads it.
- **XBE-12** No response body ever contains `passwordHash`. Per [../../../CLAUDE.md](../../../CLAUDE.md), **if a payload ever arrives carrying a field this client shouldn't have, that is a backend bug to flag — not something to hide in the UI.**

---

## API Contract

As consumed by this client. Canonical definitions live in the backend spec.

| Call | When | Sends | Expects |
|---|---|---|---|
| `POST /api/auth/login` | Login form submit | `{ email, password }` | `200 { user, accessToken, expiresIn }` + `Set-Cookie` · `401 INVALID_CREDENTIALS` · `400 VALIDATION_ERROR` |
| `POST /api/auth/refresh` | Bootstrap, and on any `401` | nothing (cookie only) | `200 { accessToken, expiresIn }` + rotated cookie · `401 UNAUTHENTICATED` |
| `GET /api/auth/me` | After login and after bootstrap refresh | `Authorization: Bearer` | `200 { user }` · `401 UNAUTHENTICATED` |
| `POST /api/auth/logout` | Logout control | nothing (cookie only) | `204` always |

**This is the complete list — four calls.** Two backend endpoints are deliberately never called:

- **`POST /api/auth/signup`** — an operator/bootstrap endpoint. Calling it from the client would put an anonymous, role-accepting account-creation path in the browser.
- **`GET /api/users`** — exists and is recruiter-gated, but has no UI. It is an operator/verification tool (backend FR-3.5).

### Client-side rules

- **API-1** Every call goes through `apiFetch`. No component calls `fetch` directly.
- **API-2** All auth calls are wrapped in `features/auth/api/auth.api.ts` — components never assemble a path or a header.
- **API-3** Query keys: `['auth','me']`. That is the only one this feature introduces.
- **API-4** `credentials: 'include'` on every call, so the refresh cookie is sent where its `Path` allows.
- **API-5** `auth.api.ts` exports exactly four functions — `login`, `logout`, `refresh`, `getMe`. **No `createInterviewer`, no `listInterviewers`, no `signup`.** An unused wrapper is an invitation to build the UI that calls it.

---

## Data Model Changes

**No database.** This client owns only in-browser state:

| State | Where it lives | Lifetime | Persisted? |
|---|---|---|---|
| Access token | Module variable in `access-token.ts` | Until page unload or logout | **No** |
| Refresh token | `HttpOnly` cookie set by the backend | 1 day | Yes, by the browser — **unreadable by this app** |
| Current user | TanStack Query cache, key `['auth','me']` | Until invalidated or page unload | No |

- **DM-1** **Nothing auth-related is written to `localStorage`, `sessionStorage`, or IndexedDB.** This is a hard rule, and a code review check.
- **DM-2** The client never sets or reads a cookie itself.
- **DM-3** The `User` type mirrors the backend's safe representation exactly and has no field for a hash or a token (FE-11).

---

## Authentication / Authorization

### Credential handling

| Credential | Where | Why |
|---|---|---|
| Access token | React memory (module variable) | Attached to most requests, so it is the most exposed — keeping it out of persistent storage means injected script has no artefact to steal, and a reload discards it |
| Refresh token | `HttpOnly` cookie | Long-lived, so it is put where script cannot reach it at all and where the server can revoke it |

**Never in `localStorage`.** Any XSS vulnerability can read `localStorage`; it cannot read an `HttpOnly` cookie, and it can only reach an in-memory token for the current page's lifetime.

### Route matrix

| Route | Anonymous | INTERVIEWER | RECRUITER |
|---|---|---|---|
| `/login` | ✅ | → `/my-interviews` | → `/pipeline` |
| `/pipeline` | → `/login?next=` | ✅ (placeholder) | ✅ (placeholder) |
| `/my-interviews` | → `/login?next=` | ✅ (placeholder) | ✅ (placeholder) |
| `/forbidden` | ✅ | ✅ | ✅ |

**The matrix has one axis, not two:** authenticated or not. No cell differs between `INTERVIEWER` and `RECRUITER` except the post-login landing route — no route is role-gated.

### Non-negotiable rules

- **AZ-1** **This matrix is a UX layer, not a security control.** Every backend endpoint enforces its own rule, and the UI must handle a `403` correctly even though it exposes no route it believes is restricted.
- **AZ-2** Role is read from `GET /api/auth/me` only. It is never read from a URL, a form field, `localStorage`, or a decoded JWT payload in the client.
- **AZ-3** The app never decodes the access token to make a decision. It is an opaque string to this client.
- **AZ-4** **Role is presentational in this feature.** It selects a landing route and fills a chip in the chrome. It gates nothing, and no security property depends on the client reading it correctly — which is exactly the posture AZ-1 requires.

---

## Validation

Client schemas live in `src/lib/schemas/auth.ts`, following the [`quick-note.ts`](../../../src/lib/schemas/quick-note.ts) pattern (zod object + `z.infer` type export), and **mirror the backend rules** for responsiveness.

**`loginSchema` is the only schema this feature defines.** With no provisioning form, there is no `createInterviewerSchema`.

### `loginSchema`

| Field | Rule | Message |
|---|---|---|
| `email` | required, trimmed, valid email | "Enter a valid email address" |
| `password` | required, non-empty | "Password is required" |

**VAL-1** The login schema deliberately does **not** enforce the 8-character minimum. A short password must produce a server `401`, not a client `400` — otherwise the form reveals that no account can have a short password.

- **VAL-2** **No schema in this client has a `role` field**, and no request it sends carries one (FR-6.3). There is no payload shape in which a role could be asserted.
- **VAL-3** Client validation is **UX only** and never a substitute for the backend's rules. Where they disagree, the backend is correct and the client schema is the bug.
- **VAL-4** Server `details` from a `400` are mapped onto fields via `setError`, so a rule the client missed still lands on the right input. Login is the only form this can apply to.
- **VAL-5** Validation runs on submit and re-validates on change **after** the first failed submit — not on every keystroke from the start.

---

## Error Handling

Every backend error arrives as an `ApiError` with `status`, `message` and `body: { code, message, details? }`.

| Status / `code` | Where | UI behaviour |
|---|---|---|
| `400 VALIDATION_ERROR` | Login form (the only form) | Map `details` onto fields via `setError`; no toast |
| `401 INVALID_CREDENTIALS` | Login only | Form-level message, password cleared, email retained, focus to password |
| `401 UNAUTHENTICATED` | Any other call | Interceptor refreshes once and replays; on refresh failure, clear state and redirect to `/login` |
| `403 FORBIDDEN` | Any call | Render the 403 view. **Never** a toast-and-stay — the user must know the action is not theirs. Unreachable from the four endpoints this client calls, and handled anyway (AZ-1) |
| `500 INTERNAL_ERROR` | Any call | Generic retryable message: *"Something went wrong. Please try again."* |
| Network failure (`TypeError` from `fetch`) | Any call | Same generic message — never a raw error string, never an indefinite hang |

### Rules

- **ERR-1** Branch on `body.code`, not on `message` copy. `code` is the stable contract.
- **ERR-2** A raw error object, stack, or status number is **never** rendered to a user.
- **ERR-3** Form errors render inline; only successful *actions* use toasts. A failure is not a toast.
- **ERR-4** Every mutation has a visible error state. None fail silently.
- **ERR-5** If a response ever contains a field this client should not have received, that is **reported as a backend bug**, not hidden in the UI ([../../../CLAUDE.md](../../../CLAUDE.md)).

---

## Edge Cases

| # | Case | Required behaviour |
|---|---|---|
| EC-01 | Access token expires mid-session | The failing request `401`s; the interceptor refreshes and replays. **The user sees no interruption and loses no form input.** |
| EC-02 | Ten queries `401` at once | **Exactly one** `POST /api/auth/refresh`; all ten replay with the new token (FE-4.4). |
| EC-03 | Refresh itself returns `401` | Clear token, clear cache, redirect `/login?next=<current>`. |
| EC-04 | Replay after a successful refresh also `401`s | Surface the error to the caller. **No second refresh** (FE-4.3). |
| EC-05 | Hard reload on a guarded route, cookie present | Middleware allows render; layout shows the loading state during bootstrap; content appears after `/me`. **No login flash.** |
| EC-06 | Hard reload on a guarded route, no cookie | Middleware redirects to `/login?next=<path>` before any app JS runs. |
| EC-07 | Logged-in user opens `/login` | Redirected away (FE-6.3). |
| EC-08 | `?next=https://evil.example.com` | Discarded; role-based default used (FE-8.4). |
| EC-09 | `?next=//evil.example.com` | Also discarded — a protocol-relative URL is not a same-origin path. |
| EC-10 | `?next=/team` (a route that no longer exists) | The path is same-origin, so it is honoured, and Next renders its **404** page. `resolveRedirect` validates the *shape* of `next`, never that the route exists — and must not start doing so. Accepted: a stale bookmark shows a 404, which is correct and honest. |
| EC-11 | Logout while offline | The request fails; local state is cleared and the user is redirected anyway (FR-4.3). |
| EC-12 | Log out in tab A while tab B is open | Tab B's next request `401`s, its refresh fails (family revoked server-side), and it clears state and redirects. **Eventual, not instant, cross-tab consistency — accepted and documented.** |
| EC-13 | Two tabs refresh at the same instant | The backend's rotation reuse-detection may revoke the family, logging **both** tabs out. This is the accepted trade-off of reuse detection; the UI handles it as an ordinary refresh failure (EC-03). |
| EC-14 | Backend unreachable | `fetch` throws `TypeError`; presented as the generic retryable message, never a stack, never an indefinite spinner. |
| EC-15 | Double-click on submit | Impossible — the button and inputs are disabled for the duration (FE-8.3). |
| EC-16 | Browser autofill populates fields | react-hook-form picks up the values; validation runs normally on submit. |
| EC-17 | A user asks how to add a colleague to the app | There is no UI answer. The app shows no "contact an admin" prompt either — it simply has no such surface (FR-6.4). Onboarding is an out-of-band operator task. |
| EC-18 | User's role changes server-side mid-session | Up to 15 minutes of staleness before the next `/me` reflects it. Harmless — no role-change endpoint exists, and role gates nothing in the client (AZ-4). |
| EC-19 | JS disabled or bundle fails to load | The app does not function; no server-rendered fallback is provided. **Accepted for a POC.** |
| EC-20 | Deep link to `/team` while anonymous | `/login?next=/team`, then post-login navigation to `/team`, which 404s (EC-10). No crash, no redirect loop, and no 403 — the route does not exist rather than being forbidden. |

---

## Security Requirements

- **SEC-1 — No credential in browser storage.** No token is ever written to `localStorage`, `sessionStorage`, or IndexedDB. The access token is a module variable; the refresh token is an `HttpOnly` cookie this app cannot read. **This is a review checklist item, not just an implementation detail.**
- **SEC-2 — XSS containment.** Injected script can, at worst, use the in-memory access token for the current page's lifetime. It cannot exfiltrate a persistent credential and cannot read the refresh token at all.
- **SEC-3 — Open-redirect prevention.** `?next=` is honoured only when it begins with a single `/` and not `//`. Absolute and protocol-relative URLs fall back to the role-based default (EC-08, EC-09).
- **SEC-4 — Client guards are never the control.** `middleware.ts` and `<RequireAuth>` are UX. The UI must behave correctly when the backend returns `403`, even though the client gates nothing by role itself (AZ-1, FE-7.4).
- **SEC-4.1 — No account creation in the browser.** The client cannot create a user of any role, because it ships no caller for a creation endpoint and no schema carrying a `role` (FR-6, VAL-2). Privilege escalation through this client is structurally impossible rather than validated against. **The corresponding risk moved to the backend** — `POST /api/auth/signup` is anonymous and role-accepting, and is now the only provisioning path (backend SEC-11.1). Removing the UI did not remove that exposure; it relocated who can reach it.
- **SEC-5 — No token introspection.** The client never decodes the JWT to read a role or an expiry. Identity comes only from `GET /api/auth/me`.
- **SEC-6 — No secrets in client config.** Only `NEXT_PUBLIC_API_URL` is exposed. No signing key, no shared secret, no seed password is ever referenced in frontend code.
- **SEC-7 — No credential in logs or telemetry.** Tokens, passwords and cookie values are never passed to `console.*`, an error boundary's rendered output, or any reporting call.
- **SEC-8 — Password fields** use `type="password"` with correct `autoComplete` values, and are never echoed into the DOM, a URL, or a query key.
- **SEC-9 — Flag, don't hide.** If a response carries a field this client should not have received, it is reported as a backend bug rather than filtered in the UI ([../../../CLAUDE.md](../../../CLAUDE.md)).
- **SEC-10 — Known accepted gaps:** a leaked in-memory token is usable for up to 15 minutes; logout is not instantly reflected in other open tabs (EC-12); and the login form has no client-side attempt throttling, matching the backend's documented lack of rate limiting.

---

## Performance Requirements

- **PERF-1** Bootstrap (`/refresh` → `/me`) resolves in **< 300 ms** p95 locally. The loading state must be designed for this duration — no layout shift when it resolves.
- **PERF-2** **Exactly one** `POST /api/auth/refresh` per expiry event, regardless of how many requests were in flight (FE-4.4). Verified by the **call count** in the DevTools Network tab, not merely by the outcome.
- **PERF-3** The bootstrap refresh runs **once per page load**, not once per component that needs auth (FE-3.2).
- **PERF-4** `['auth','me']` is cached and reused across the app. Navigating between authenticated routes triggers **zero** additional `/me` calls.
- **PERF-5** Login submit → landing route rendered in **< 700 ms** p95 locally (bcrypt on the backend dominates).
- **PERF-6** A `401`-triggered refresh-and-replay adds **one** extra round-trip to the affected request and none to any other.
- **PERF-7** No spinner appears for under ~150 ms of work — brief flashes are worse than no indicator.
- **PERF-8** The authenticated app makes **no data request beyond `GET /api/auth/me`**. With `/team` removed, identity is the only thing this feature fetches.

---

## Acceptance Criteria

Given/When/Then. **There is no automated test suite for this POC** — every criterion below is signed off by hand against the running app with DevTools open (see [plan.md § Verification Commands](./plan.md#verification-commands) for the exact steps).

- `AC-F*` are **functional checks driven through the UI** — fill the form, click, navigate, observe the rendered result and the Network tab.
- `AC-M*` are **environment checks** that additionally require a running backend and a seeded database — DevTools cookie flags, real reload behaviour, storage inspection.

### Login form

- **AC-F01** — **Given** the login form, **when** it is submitted with an empty email, **then** a field-level validation message renders and **no network request is made**.
- **AC-F02** — **Given** the login form, **when** it is submitted with `"notanemail"` as the email, **then** a field-level message renders and no request is made.
- **AC-F03** — **Given** the login form, **when** submission is in flight, **then** the submit button and both inputs are disabled, so a second submit cannot be triggered.
- **AC-F04** — **Given** the API returns `401 INVALID_CREDENTIALS`, **when** the form handles it, **then** one form-level message *"Invalid email or password."* renders, the password field is cleared, the email field retains its value, and focus moves to the password field.
- **AC-F05** — **Given** the API returns `500`, **when** the form handles it, **then** the generic retryable message renders and **both** fields retain their values.
- **AC-F06** — **Given** the network is unreachable and `fetch` rejects, **when** the form handles it, **then** the generic retryable message renders — not a raw error string, and not an indefinite spinner.
- **AC-F07** — **Given** the login page, **when** it renders, **then** it contains **no signup link, no forgot-password link, and no "request an account" affordance of any kind**.
- **AC-F08** — **Given** the login form with a short password like `"abc"`, **when** it is submitted, **then** the request **is** sent (no client-side minimum) and the server's `401` is what surfaces.

### Login flow & redirects

- **AC-F09** — **Given** valid credentials for a `RECRUITER`, **when** login succeeds, **then** the access token is stored in memory, `GET /api/auth/me` is called, and the app navigates to `/pipeline`.
- **AC-F10** — **Given** valid credentials for an `INTERVIEWER`, **when** login succeeds, **then** the app navigates to `/my-interviews`.
- **AC-F11** — **Given** login initiated from `/login?next=/my-interviews` as a **recruiter**, **when** it succeeds, **then** the app navigates to `/my-interviews` — the `next` target wins over the role default, and no role check blocks it.
- **AC-F12** — **Given** login initiated from `/login?next=https://evil.example.com`, **when** it succeeds, **then** the app navigates to the **role-based default** and never to the external URL.
- **AC-F13** — **Given** login initiated from `/login?next=//evil.example.com`, **when** it succeeds, **then** the protocol-relative target is likewise discarded.
- **AC-F14** — **Given** a successful login, **when** browser storage is inspected, **then** **no** `localStorage`, `sessionStorage` or IndexedDB entry contains the access token or any part of it.

### Session & refresh

- **AC-F15** — **Given** an authenticated app with an expired access token, **when** three queries fire concurrently and all receive `401`, **then** `POST /api/auth/refresh` is called **exactly once** and all three requests are replayed and resolve successfully.
- **AC-F16** — **Given** an expired access token, **when** the refresh call itself returns `401`, **then** the in-memory token is cleared, the query cache is cleared, and the app redirects to `/login`.
- **AC-F17** — **Given** a request replayed after a successful refresh, **when** the replay also returns `401`, **then** the error surfaces to the caller and **no second refresh** is attempted.
- **AC-F18** — **Given** a `POST` request that triggers a refresh, **when** it is replayed, **then** the replayed request carries an **identical body** to the original.
- **AC-F19** — **Given** app bootstrap with a refresh cookie present, **when** the guarded layout mounts, **then** `POST /api/auth/refresh` is called **once**, followed by `GET /api/auth/me`, and children render only after both resolve.
- **AC-F20** — **Given** bootstrap is in flight, **when** the guarded layout renders, **then** a loading state is shown and **neither** the app shell with empty data **nor** the login page is visible.
- **AC-F21** — **Given** an authenticated user, **when** they navigate between `/pipeline` and `/my-interviews`, **then** **zero** additional `GET /api/auth/me` calls are made.

### Guards

- **AC-F22** — **Given** the built application, **when** its routes and bundle are inspected, **then** there is **no `/team` route**, no `CreateInterviewerForm`, no `InterviewerList`, and no `RequireRole` component — `/team` returns the app's 404, not a 403 and not a blank page.
- **AC-F23** — **Given** an authenticated user of **either** role, **when** the app chrome renders, **then** it shows the same navigation links, and **no** link, button, or menu item leads to creating a user.
- **AC-F24** — **Given** an unauthenticated visitor, **when** they request `/pipeline`, **then** they are redirected to `/login?next=/pipeline`.
- **AC-F25** — **Given** an authenticated user, **when** they navigate to `/login`, **then** they are redirected away from it.
- **AC-F26** — **Given** an authenticated user on any route, **when** the backend returns `403` for a call, **then** the 403 view renders — the client handles a status it has no route-level reason to expect (AZ-1, FE-7.4).

### No account-creation surface

- **AC-F27** — **Given** the whole authenticated app, **when** every route and every piece of chrome is walked, **then** there is **no form that creates a user** — no signup, no invite, no provisioning.
- **AC-F28** — **Given** the built client bundle, **when** it is searched, **then** it contains **no request to `POST /api/users` and no request to `POST /api/auth/signup`**. *(Check the source and the built output, not just the Network tab — an unreachable call site still ships.)*
- **AC-F29** — **Given** the client's source, **when** `features/auth/api/auth.api.ts` is read, **then** it exports exactly `login`, `logout`, `refresh` and `getMe` — no `createInterviewer`, no `listInterviewers`, no `signup` (API-5).
- **AC-F30** — **Given** the client's source, **when** `src/lib/schemas/auth.ts` is read, **then** `loginSchema` is the only export and **no schema anywhere in the client has a `role` field** (VAL-2).
- **AC-F31** — **Given** a `RECRUITER` session, **when** the app is used end to end, **then** it makes **no request to `/api/users`** — the endpoint exists on the backend but this client never touches it.
- **AC-F32** — **Given** `src/components/ui/`, **when** it is listed, **then** **no `skeleton.tsx` has been added** — the primitive was needed only by the removed interviewer list, and this feature introduces no new primitive.
- **AC-F33** — **Given** a `RECRUITER` session, **when** the user looks for a way to onboard a colleague, **then** the app offers none, and shows no placeholder, disabled control, or "coming soon" affordance implying one is missing.

### Logout

- **AC-F34** — **Given** an authenticated user, **when** log out is clicked, **then** `POST /api/auth/logout` is called, the in-memory token is cleared, the query cache is cleared, and the app navigates to `/login`.
- **AC-F35** — **Given** an authenticated user, **when** log out is clicked and the request **fails**, **then** local auth state is still cleared and the app still navigates to `/login`.
- **AC-F36** — **Given** a user who has logged out, **when** the back button returns them to a guarded route, **then** they are redirected to `/login` rather than shown cached authenticated content.

### Manual verification

- **AC-M01** — **Given** the seeded recruiter account and a running backend, **when** logging in through the browser, **then** DevTools shows the `refresh_token` cookie flagged `HttpOnly`, and `document.cookie` in the console does **not** include it.
- **AC-M02** — **Given** an authenticated session, **when** the page is hard-reloaded, **then** the session survives and the login page never flashes.
- **AC-M03** — **Given** an authenticated session left idle past the access token's 15-minute expiry, **when** the next action is taken, **then** it succeeds after a single transparent refresh, visible as exactly one `/api/auth/refresh` in the Network tab.
- **AC-M04** — **Given** an interviewer session, **when** `/team` is entered directly into the address bar, **then** the app's **404** page renders, the Network tab shows **no** `/api/users` request of any method, and nothing in the console errors.
- **AC-M05** — **Given** any authenticated session, **when** `localStorage` and `sessionStorage` are inspected in DevTools, **then** neither contains a token.

---

## Out of Scope

Explicitly excluded. Each is a deliberate decision, not an omission.

| Excluded | Note |
|---|---|
| **Interviewer provisioning UI (`/team`)** | No create-interviewer form, no interviewer list, no `/api/users` call. Accounts are provisioned by an operator against the API. Building any of it is a new feature with its own spec (FR-6.5). |
| **`<RequireRole>`** | Not built — no route is role-gated (FE-7.2), so it would ship with no consumer. It arrives with the first feature that actually needs it. The `/forbidden` view **is** built, because an API `403` still has to render somewhere (FE-7.4). |
| **`skeleton` shadcn primitive** | Not added — nothing in this feature has a list or table to show a loading placeholder for. It introduces no new primitive. |
| **Signup page** | No `/signup` route or form. The backend endpoint is operator-only and this client never calls it. |
| **Password reset / forgot password** | No link, no page, no flow. |
| **Email verification** | No pending-verification state in the UI. |
| **MFA / SSO / OAuth** | No provider buttons, no second-factor step. |
| **Profile / account settings** | No page to change a name, email, or password. |
| **Role switcher / impersonation** | No dev-only role toggle — that would contradict brief §6. |
| **Any user-management UI** | No edit, deactivate, delete, list, search or sort — there is no user-management surface at all. |
| **`HIRING_MANAGER` views** | The role does not exist in this POC. |
| **"Remember me" / session-length choice** | Fixed by the backend. |
| **Cross-tab session sync** (`BroadcastChannel` / storage events) | Logout in one tab reaches others only on their next request (EC-12). |
| **Proactive refresh on a timer** | Refresh is reactive only — on bootstrap and on `401`. |
| **Offline support / request queueing** | No service worker, no retry queue. |
| **SSR-rendered authenticated content** | All authenticated data is fetched client-side; `middleware.ts` does no server-side session validation. |
| **Real content for `/pipeline` and `/my-interviews`** | Guarded placeholders only; their content belongs to later features. |
| **Automated tests of any kind** (Vitest, React Testing Library, Playwright) | Every criterion above is verified manually against the running app. A test runner and suite are a deliberate later decision — no test dependency, config or file is added by this feature. |
| **i18n / theming work** | English copy only; existing theme untouched. |

---

## Dependencies

### Blocks

**Every other frontend feature in this POC.** The pipeline view, candidate detail, feedback submission and stage override all require a known user and role, and all rely on `apiFetch` carrying a valid token. None can be built before this ships.

### Blocked by

**[The backend authentication spec](../../../../backend/specs/features/authentication/spec.md)** must be implemented first — specifically the four endpoints this client calls: `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me` and `POST /api/auth/logout`, with CORS `credentials: true` and the `refresh_token` cookie name.

It must also be **seeded**, since there is no longer any way to create an account from this app. `npm run db:seed` (or `POST /api/auth/signup` from Postman) is a prerequisite for logging in at all — a developer with an empty database cannot get past `/login` by any action in the UI. Since verification here is entirely manual, **no acceptance criterion can be signed off until that backend is running and seeded** — the UI can be built before then, but not accepted.

### New npm dependencies

**None — runtime or dev.** `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `sonner` and the shadcn primitives are already installed and are reused rather than supplemented — per [../../../CLAUDE.md](../../../CLAUDE.md), no dependency is added where the existing stack already covers the capability.

**No new shadcn primitive either** — `src/components/ui/` is untouched by this feature (AC-F32).

`sonner` remains installed and wired, but **this feature raises no toast** — its only success action, login, navigates instead. Toasts arrive with the first feature that has a non-navigating success.

### Environment variables

`NEXT_PUBLIC_API_URL` already exists (`.env.example` → `http://localhost:3000`) and is unchanged. **No new frontend environment variable is introduced, and no secret is ever placed in one.**

### Modified existing files

| File | Change |
|---|---|
| [`src/lib/api.ts`](../../../src/lib/api.ts) | Bearer attachment, `credentials: 'include'`, single-flight refresh interceptor — **the existing `apiFetch` signature and `ApiError` contract are preserved** |
| [`src/app/layout.tsx`](../../../src/app/layout.tsx) | Real metadata (currently `"Create Next App"`); auth provider wiring alongside the existing `QueryProvider` and `Toaster` |
| [`src/app/page.tsx`](../../../src/app/page.tsx) | The demo page (`ApiStatusCard`, `QuickNoteForm`) is replaced by a redirect to the role-appropriate landing route |
| `package.json` | Adds a `typecheck` script (`tsc --noEmit`) — **no new dependency** |
| **New:** `src/middleware.ts`, `src/features/auth/**`, `src/lib/schemas/auth.ts`, `src/app/(auth)/**`, `src/app/(app)/**`, `src/app/forbidden/page.tsx` | Per FE-1 — note `(app)/` contains **two** pages, not three |

### Framework note

[../../../AGENTS.md](../../../AGENTS.md) warns that **this is Next.js 16 and its APIs differ from older versions**. Before implementing `middleware.ts`, route groups, or `layout.tsx` changes, read the relevant guide in `node_modules/next/dist/docs/` rather than relying on remembered Next.js conventions.

### External dependencies

**None.** No analytics, no error-reporting service, no identity provider, no external API.
