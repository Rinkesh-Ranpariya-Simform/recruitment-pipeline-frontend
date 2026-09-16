# Candidate — Signup, Jobs & My Applications (Frontend)

> **Status:** Draft — awaiting approval. `plan.md` is the next artifact and does not exist yet.
> **Feature slug:** `candidate`
> **Scope:** `frontend/` — Next.js 16 App Router, React 19, TanStack Query, Tailwind v4 + shadcn/ui
> **Counterpart:** [../../../../backend/specs/features/candidate/spec.md](../../../../backend/specs/features/candidate/spec.md)
> **Depends on:** [../authentication/spec.md](../authentication/spec.md) — implemented · [../roles/spec.md](../roles/spec.md) — implemented
> **Revises:** [../roles/spec.md](../roles/spec.md) (roles reads are no longer recruiter-only on the API) and this repo's "the app has no account-creation surface" invariant
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md)

---

## Goal

Give the app its first **self-service** surface and its first **non-internal** user.

This frontend must:

1. Ship a public `/signup` route that creates a candidate account — reversing, deliberately, this repo's
   documented "no account-creation surface" rule.
2. Add `CANDIDATE` to the client's `UserRole` union in a way that makes **every role-keyed lookup a
   compile error** until it is filled in.
3. Give a candidate three destinations and no more: **Jobs**, **My Applications**, **Profile**.
4. Let a candidate search open positions, read one in full, and apply in a single action — with no profile
   form standing in the way.
5. Render an application as `Applied: 15 Sep 2026 · Status: In progress · Stage: Interview`, from a payload
   that **contains nothing else** — no interviewer, no feedback, no rating, no override reason.
6. Never rely on the UI to hide a restricted field. If a closed requisition or a feedback field ever appears
   in a candidate's payload, that is a backend bug to report, not a row to filter here.

Success means: a visitor can go from the login page to an application on record without an operator touching
the database, and a recruiter who types `/jobs` sees the app's 404.

---

## Background / Context

Two documented rules in [../../../CLAUDE.md](../../../CLAUDE.md) are being deliberately reversed, and both are
recorded here so a reviewer reads them as decisions:

> **The app has no account-creation surface.** No signup, no interviewer provisioning, no `/team` page, no role
> selector, and no call to `/api/users`.

That rule existed because the backend's signup endpoint was **role-accepting** — a browser form over it would
have been a role selector, and therefore a privilege-escalation surface. The backend feature this spec pairs
with removes `role` from that contract entirely (backend FR-2.2), so the reason for the rule is gone. The rule
itself goes with it, but **only the signup half**: there is still no interviewer provisioning, no `/team`, no
role selector, and no call to `/api/users`.

> Roles are recruiter-only, end to end (roles spec § Revision, both repos).

That is also no longer true of the API: `GET /api/roles` and `GET /api/roles/:roleId` now require
authentication only, and a non-recruiter's query is forced to `status: OPEN` server-side. The three write
endpoints are unchanged and still recruiter-only, so `<RequireRole>` on `/roles` stays exactly as it is.

### Translation from the request

The feature was described as a set of views — *Job List, Job Details, My Applications* — with a candidate
sidebar. Two translations were made and are stated openly:

| Described                  | Built as                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Jobs"                     | `/jobs` and `/jobs/[jobId]`, reading `GET /api/roles`. **The wire keys stay `roles` and `role`** — the client renames the concept, not the contract |
| "Profile"                  | `/profile`, rendered from `GET /api/auth/me` for **every** role, not only candidates. There is no profile endpoint and no edit form |
| "Status" + "Current stage" | **Two fields**, `status` and `currentStage`, rendered as two labelled lines. The example `Status: Interview` is the *stage* line |

### Current state of `frontend/`

|                  | Today                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Stack            | Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui over base-ui, TanStack Query, react-hook-form + zod, sonner |
| Theme            | Dark-only. `dark` pinned on `<html>`, no theme provider, tokens in `globals.css`                                                |
| Routes           | `(auth)/login`, `(app)/pipeline`, `(app)/my-interviews`, `(app)/roles`, `(app)/roles/[roleId]`, `/forbidden`, `not-found`       |
| Chrome           | `(app)/layout.tsx` — `RequireAuth` + sidebar driven by `NAV_SECTIONS: Record<UserRole, NavSection[]>`, account menu in header   |
| Identity         | `AuthProvider` + `useAuth`; access token in memory only; `resolveRedirect` uses `ROLE_LANDING: Record<UserRole, string>`        |
| Data             | `apiFetch` in [`lib/api.ts`](../../../src/lib/api.ts) — single-flight refresh, `ApiError`, `onAuthFailure`/`onForbidden` hooks  |
| Guards           | `<RequireAuth>`, `<RequireRole allow>` → renders `NotFoundView`. `/pipeline` and `/my-interviews` are **unguarded**             |
| Forms            | `react-hook-form` + `zodResolver`, schemas in [`lib/schemas/`](../../../src/lib/schemas/)                                       |
| "Nothing here"   | Three distinct renderings: `NotFoundView` (route), `RoleNotFound` (data 404), `/forbidden` (server 403)                         |
| Endpoints called | Eight. `auth.api.ts` exports exactly four functions and explicitly forbids a signup wrapper                                     |
| Tests            | **none**, and none planned — verification is manual, in-browser, with DevTools open                                            |

### Decisions carried from the interview

All product decisions were settled with the backend spec; the ones that shape this client are D-3 (signup
takes no `role`), D-6 (unlimited applications per role), D-7 (two fields, not one), D-9/D-10 (jobs read
`/api/roles`, `OPEN`-only server-side), D-11 (title search only), D-12 (profile is read-only, from
`/api/auth/me`, for every role) and D-13 (the application row is flat). See the backend spec's decision table.

---

## Users / Actors

| Actor           | Sees, after this feature                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Anonymous**   | `/login` and, new, `/signup`. Nothing else renders                                                                                    |
| **Candidate**   | Sidebar: **Jobs**, **My Applications**, **Profile**. `/roles`, `/pipeline`, `/my-interviews` all render the app's 404                 |
| **Interviewer** | Sidebar: **My interviews**, **Profile**. `/jobs` and `/applications` render the app's 404, even though the API would answer `/api/roles` |
| **Recruiter**   | Sidebar: **Pipeline**, **Roles**, **Profile**. `/jobs` and `/applications` render the app's 404                                       |

**Deliberate trade-offs:**

- An interviewer is **not** offered a Jobs link even though the API would now serve them one. The sidebar
  decides what a user is *invited* to, and an interviewer has no reason to browse requisitions.
- Applying is never disabled after a successful apply (D-6). The button stays live and the page says how many
  times the candidate has already applied. Disabling it would be a client-side rule the server does not have.
- **No client-side guard is a security control.** Every statement in the route × role matrix is a rendering
  decision; the backend re-authorizes every request regardless.

---

## User Stories

| ID        | Story                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **US-01** | As a visitor, I want to create an account from the login page, so that I do not need anyone to provision me.                            |
| **US-02** | As a visitor, I want the signup form to tell me exactly which field is wrong, so that I am not guessing at a rejected submission.        |
| **US-03** | As a candidate, I want to land on Jobs after signing in, so that the first thing I see is what I can do.                                 |
| **US-04** | As a candidate, I want to search open positions by title, so that I can find one without paging through the list.                        |
| **US-05** | As a candidate, I want my search to survive a reload and the Back button, so that I do not lose my place.                                |
| **US-06** | As a candidate, I want to read a position in full before applying, so that I am not applying blind.                                      |
| **US-07** | As a candidate, I want to apply in one click and be told it worked, so that I am never unsure whether it went through.                   |
| **US-08** | As a candidate, I want to see everything I applied to with its date and current stage, so that I am not left guessing.                   |
| **US-09** | As a candidate, I want a profile page showing who I am signed in as, so that the account I am acting under is never ambiguous.           |
| **US-10** | As a recruiter or interviewer, I want the candidate routes to be invisible to me, so that the app I see is the app I am meant to use.    |

---

## Functional Requirements

### FR-1 — `CANDIDATE` enters the client

- **FR-1.1** `UserRole` in [`features/auth/types.ts`](../../../src/features/auth/types.ts) becomes
  `'INTERVIEWER' | 'RECRUITER' | 'CANDIDATE'`.
- **FR-1.2** Adding it must **break the build** until every `Record<UserRole, …>` is filled in. There are two
  today — `NAV_SECTIONS` in [`(app)/layout.tsx`](../../../src/app/(app)/layout.tsx) and `ROLE_LANDING` in
  [`features/auth/redirect.ts`](../../../src/features/auth/redirect.ts) — and both must stay keyed by the
  union rather than becoming a filtered array or a comparison.
- **FR-1.3** `ROLE_LANDING.CANDIDATE` is `/jobs`.
- **FR-1.4** No new client-side role comparison is introduced. Where a check is needed it reads a named
  constant from the feature's `permissions.ts`, following the pattern of
  [`features/roles/permissions.ts`](../../../src/features/roles/permissions.ts).

### FR-2 — Signup

- **FR-2.1** A new route, `/signup`, in the `(auth)` group — no app chrome, matching `/login`.
- **FR-2.2** The form has exactly three fields: **Name**, **Email**, **Password**. **There is no role
  selector, and there must never be one** (SEC-1).
- **FR-2.3** The request body is `{ name, email, password }`. The client does **not** send `role`, even though
  the server would strip it.
- **FR-2.4** On `201` the client does **not** attempt to log in. The backend deliberately issues no token and
  no cookie on signup, so the client redirects to `/login` and shows the success toast
  **"Account created. Sign in to continue."**
- **FR-2.5** Making the extra login step visible is the point: an auto-login would hide the backend's
  no-session-on-signup guarantee behind a second request the user never asked for.
- **FR-2.6** `/login` gains a link: **"New here? Create an account"** → `/signup`. `/signup` gains the
  reverse: **"Already have an account? Sign in"** → `/login`.
- **FR-2.7** An **already-authenticated** visitor who opens `/signup` is redirected to their role landing
  route, exactly as `LoginForm` already does for `/login`.
- **FR-2.8** `signup` is added to [`features/auth/api/auth.api.ts`](../../../src/features/auth/api/auth.api.ts),
  which now exports **five** functions. Its doc comment must be updated: the reason it previously forbade a
  signup wrapper — *"anonymous and role-accepting"* — no longer holds, and the forbidding of a `/api/users`
  wrapper still does.

### FR-3 — Navigation and route guards

- **FR-3.1** `NAV_SECTIONS.CANDIDATE` is:
  `[{ label: 'Jobs', links: [JOBS, MY_APPLICATIONS] }, { label: 'Account', links: [PROFILE] }]`.
- **FR-3.2** `PROFILE` is added to **all three** role sections, under an `Account` group, because
  `/profile` serves every role (backend FR-7.2).
- **FR-3.3** Icons, from `lucide-react` (already a dependency): `BriefcaseIcon` for Jobs — reused from the
  recruiter's Roles link, since it is the same object seen from the other side — `FileTextIcon` for My
  Applications, `UserIcon` for Profile.
- **FR-3.4** `/jobs`, `/jobs/[jobId]` and `/applications` are wrapped in
  `<RequireRole allow={CANDIDATE_USER_ROLES}>` via a shared `(app)/jobs/layout.tsx` and
  `(app)/applications/layout.tsx`, so a recruiter or interviewer typing the URL gets **the app's 404**, not
  `/forbidden`. A route you may not open should look like a route that is not there.
- **FR-3.5** `/profile` is wrapped in `<RequireAuth>` only, inherited from `(app)/layout.tsx`. No role guard.
- **FR-3.6** `/pipeline` gains `<RequireRole allow={['RECRUITER']}>` and `/my-interviews` gains
  `<RequireRole allow={['INTERVIEWER']}>`. Both are **currently unguarded**, which the roles spec noted as a
  known gap; a third, lower-privileged role makes it materially worse, so it is closed here rather than left.
- **FR-3.7** The sidebar gates nothing. FR-3.4 and FR-3.6 are what make an unlinked route safe to leave
  unlinked, and neither is a security control.

### FR-4 — Job list (`/jobs`)

- **FR-4.1** Reads `GET /api/roles`. The response's `roles` array is rendered as jobs; **the wire key is not
  renamed** (XBE-3).
- **FR-4.2** Card list, not a table. A recruiter's `/roles` is a working surface and uses `RolesTable`; a
  candidate is reading job adverts, and a card with a title, a two-line description clamp and a posted date
  reads better at every width.
- **FR-4.3** A search input writes `?q=` to the URL; the URL is the source of truth, following
  [`features/roles/search-params.ts`](../../../src/features/roles/search-params.ts). Reload and Back both work
  with no extra cache handling.
- **FR-4.4** Typing is **debounced 300 ms** before the URL is written, so a ten-character term is one request,
  not ten (PERF-2).
- **FR-4.5** `?page=` is supported and reuses
  [`RolesPagination`](../../../src/features/roles/components/RolesPagination.tsx), generalised or copied per
  the plan. Changing the search term resets to page 1.
- **FR-4.6** There is **no status filter**. A candidate's response contains only `OPEN` rows, so a filter
  would offer a choice with one option (XBE-5).
- **FR-4.7** Each card links to `/jobs/[jobId]`.
- **FR-4.8** The page heading is **"Open positions"**.

### FR-5 — Job detail (`/jobs/[jobId]`)

- **FR-5.1** Reads `GET /api/roles/:roleId`. Renders the title, the full description, and the posted date.
- **FR-5.2** A primary **Apply** button.
- **FR-5.3** A `404` from the API renders a data-404 panel — **"This position is no longer open"**, with a
  link back to `/jobs`. This is the `RoleNotFound` pattern, not `NotFoundView`: the route exists and the user
  may open it; the position does not.
- **FR-5.4** The same panel covers both "never existed" and "closed since you last looked", because the API
  deliberately does not distinguish them (backend FR-4.8). The copy must therefore not claim which it is.
- **FR-5.5** If the candidate has applied before, an informational line renders above the button:
  **"You applied to this position on {date}."** — or, for more than one, **"You have applied to this position
  {n} times, most recently on {date}."**
- **FR-5.6** That line is read from the **already-cached** applications query, under the same key
  `/applications` uses, so navigating from My Applications costs no extra request. A cold cache fetches once.
- **FR-5.7** **The Apply button is never disabled because of a previous application** (D-6). It is disabled
  only while a request is in flight.
- **FR-5.8** An invalid `[jobId]` segment (non-numeric) is not requested at all — it renders the same data-404
  panel, since the API would answer `400` and there is nothing useful to show for it.

### FR-6 — Applying

- **FR-6.1** Apply sends `POST /api/applications` with `{ roleId }`. Nothing else.
- **FR-6.2** On `201`: a success toast **"Application submitted."**, and the applications query is
  invalidated so `/applications` and FR-5.5's line are both correct on next read.
- **FR-6.3** While in flight the button shows **"Applying…"** and is disabled, so a double-click cannot send
  two requests — a UX guard, not a correctness one, since the server accepts both (D-6).
- **FR-6.4** On `404`: the page switches to the FR-5.3 panel and shows the error toast **"This position is no
  longer open."** The optimistic case — the requisition was closed while the page was open — is the expected
  one.
- **FR-6.5** On `403`: `apiFetch`'s existing `onForbidden` handler routes to `/forbidden`. This should be
  unreachable behind FR-3.4 and is handled anyway.
- **FR-6.6** On `401`: `apiFetch`'s single-flight refresh runs; if it fails, the existing `onAuthFailure`
  clears the cache and redirects to `/login`. No new handling.
- **FR-6.7** There is **no optimistic update**. An application is a record the server owns; showing it before
  the server confirms it is the one thing a candidate must never be misled about.

### FR-7 — My Applications (`/applications`)

- **FR-7.1** Reads `GET /api/applications`. No parameters, no pager.
- **FR-7.2** Each row renders, per the brief's own example:
  - the role **title**, linking to `/jobs/[roleId]`
  - **Applied:** the `createdAt` date, absolute, via `formatAbsolute`
  - **Status:** the `status` label
  - **Stage:** the `currentStage` label
- **FR-7.3** Status labels — exact copy, no others:

  | `status`   | Label         | Badge variant |
  | ---------- | ------------- | ------------- |
  | `ACTIVE`   | In progress   | default       |
  | `HIRED`    | Hired         | default       |
  | `REJECTED` | Not selected  | secondary     |

- **FR-7.4** Stage labels — exact copy, no others:

  | `currentStage` | Label     |
  | -------------- | --------- |
  | `APPLIED`      | Applied   |
  | `SCREEN`       | Screening |
  | `INTERVIEW`    | Interview |
  | `OFFER`        | Offer     |

- **FR-7.5** Both maps are `Record<ApplicationStatus, …>` / `Record<PipelineStage, …>` — **lookup tables, not
  comparisons** — so a value added to either backend enum is a compile error here, matching `NAV_SECTIONS`.
- **FR-7.6** An unknown value that somehow arrives renders the **raw value**, never a crash and never a
  silent blank. Type-safe code should make this unreachable; a payload is still untrusted input.
- **FR-7.7** The title link points at `/jobs/[roleId]`, which may 404 if the requisition has since closed.
  That is correct and honest: the application remains, the position does not.
- **FR-7.8** The page heading is **"My applications"**.
- **FR-7.9** **Nothing else is rendered from the row**, and the client must not request anything else. There
  is no expandable detail, no stage timeline, and no link to a recruiter or interviewer.

### FR-8 — Profile (`/profile`)

- **FR-8.1** Renders from `useAuth()`'s already-cached user — **no new request**, no new query key, no new API
  wrapper. `getMe` already owns this data.
- **FR-8.2** Shows: **Name**, **Email**, **Role** (a human label), **Member since** (`createdAt`, absolute).
- **FR-8.3** Role labels: `CANDIDATE` → **Candidate**, `INTERVIEWER` → **Interviewer**, `RECRUITER` →
  **Recruiter**. A `Record<UserRole, string>` (FR-1.2).
- **FR-8.4** **There is no Edit button, and no disabled Edit button.** No endpoint writes a `User` row, so an
  affordance would promise something that does not exist. The absence is the honest rendering.
- **FR-8.5** The page renders for every role, not only candidates.
- **FR-8.6** The page heading is **"Profile"**.

### FR-9 — What this client must never do

- **FR-9.1** Never filter a `CLOSED` requisition out of a job list client-side. The API cannot return one to a
  candidate; if one appears, **report it as a backend bug** (XBE-5).
- **FR-9.2** Never render, store, or type a field an application payload should not contain — `feedback`,
  `rating`, `notes`, `interviewer`, `overrideReason`, `stageHistory`. The `Application` type must not declare
  them, so a payload carrying one fails type-checking as well as review.
- **FR-9.3** Never write a role, a token, a name or an email to `localStorage`, `sessionStorage`, or a cookie
  this client sets.
- **FR-9.4** Never derive authorization from the sidebar or a route guard. Both are rendering decisions.

---

## Frontend Requirements

### File structure

```
src/
  app/
    (auth)/
      signup/page.tsx                      NEW   — renders <SignupForm>
    (app)/
      jobs/
        layout.tsx                         NEW   — <RequireRole allow={CANDIDATE_USER_ROLES}>
        page.tsx                           NEW   — <JobsListView>
        [jobId]/page.tsx                   NEW   — <JobDetailView>
      applications/
        layout.tsx                         NEW   — <RequireRole allow={CANDIDATE_USER_ROLES}>
        page.tsx                           NEW   — <ApplicationsListView>
      profile/page.tsx                     NEW   — <ProfileView>, no role guard
      pipeline/page.tsx                    MOD   — wrapped in <RequireRole allow={['RECRUITER']}>
      my-interviews/page.tsx               MOD   — wrapped in <RequireRole allow={['INTERVIEWER']}>
      layout.tsx                           MOD   — NAV_SECTIONS gains CANDIDATE + a Profile link per role
  features/
    auth/
      types.ts                             MOD   — UserRole gains 'CANDIDATE'
      redirect.ts                          MOD   — ROLE_LANDING gains CANDIDATE: '/jobs'
      api/auth.api.ts                      MOD   — adds signup(); doc comment updated
      components/SignupForm.tsx            NEW
      components/LoginForm.tsx             MOD   — adds the /signup link
    jobs/
      types.ts                             NEW   — Job, JobsListResponse, JobResponse
      permissions.ts                       NEW   — CANDIDATE_USER_ROLES
      search-params.ts                     NEW   — parse/build for ?q= and ?page=
      api/jobs.api.ts                      NEW   — listJobs, getJob
      hooks/useJobsQuery.ts                NEW
      hooks/useJobQuery.ts                 NEW
      components/JobsListView.tsx          NEW
      components/JobCard.tsx               NEW
      components/JobsSearch.tsx            NEW   — debounced input
      components/JobDetailView.tsx         NEW
      components/JobNotFound.tsx           NEW   — data 404, not NotFoundView
      components/ApplyAction.tsx           NEW
    applications/
      types.ts                             NEW   — Application, ApplicationStatus, PipelineStage
      labels.ts                            NEW   — the two Record<> label maps (FR-7.3/7.4)
      api/applications.api.ts              NEW   — listApplications, createApplication
      hooks/useApplicationsQuery.ts        NEW   — the shared key, also read by ApplyAction
      hooks/useApplyMutation.ts            NEW
      components/ApplicationsListView.tsx  NEW
      components/ApplicationCard.tsx       NEW
      components/ApplicationStatusBadge.tsx NEW
    profile/
      components/ProfileView.tsx           NEW
  lib/
    schemas/auth.ts                        MOD   — adds signupSchema
```

Primitives are reused from `components/ui/`: `Card`, `Button`, `Input`, `Label`, `Field`, `Badge`,
`Separator`, `Skeleton`, `sonner`. **No new primitive is added, and no new dependency.**

### State matrix — `/signup`

| State                | Trigger                       | Renders                                                                       |
| -------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| Bootstrapping        | auth still resolving          | The `/login` loading treatment, unchanged                                     |
| Already signed in    | `user !== null`               | Immediate redirect to `ROLE_LANDING[user.role]`; nothing flashes              |
| Idle                 | first render                  | Three empty fields, Submit **enabled** (validation is on submit, as on login) |
| Invalid              | client zod failure            | Per-field message under the field; no request sent                            |
| Submitting           | request in flight             | Submit shows **"Creating account…"**, disabled; fields disabled               |
| `400 VALIDATION_ERROR` | server rejected a field     | `details` mapped onto fields via `fieldMessage`; focus the first failing field |
| `409 EMAIL_TAKEN`    | email exists                  | Under Email: **"An account with this email already exists."** plus a `/login` link |
| Network / `500`      | `ApiError` without a known code | Error toast **"Could not create your account. Try again."**; fields stay filled |
| Success              | `201`                         | Redirect to `/login` + success toast **"Account created. Sign in to continue."** |

### State matrix — `/jobs`

| State           | Trigger                        | Renders                                                                                   |
| --------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Loading         | first fetch                    | Six `Skeleton` cards; the search input stays live and keeps focus                          |
| Success         | `roles.length > 0`             | Card list + pager                                                                          |
| Empty, no search | `roles: []` and no `?q=`      | **"No open positions right now."** / *"Check back later — new roles are posted here."*     |
| Empty, searching | `roles: []` with `?q=`        | **"No positions match "{q}"."** with a **Clear search** button                             |
| Refetching      | `q` or `page` changed          | Previous list dimmed, pager disabled — never an empty flash between pages                  |
| `401`           | token expired                  | Handled by `apiFetch` — one refresh, then retry; on failure, redirect to `/login`          |
| Error           | any other `ApiError`           | **"Could not load open positions."** with a **Try again** button that refetches            |

### State matrix — `/jobs/[jobId]`

| State            | Trigger                     | Renders                                                                            |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| Loading          | first fetch                 | Skeleton title, three skeleton description lines, skeleton button                    |
| Success          | `200`                       | Title, posted date, full description, Apply button, FR-5.5 line if applicable         |
| Data 404         | `404`, or a non-numeric id  | `JobNotFound`: **"This position is no longer open"** + **Back to open positions**    |
| Apply idle       | —                           | Button reads **Apply**                                                               |
| Apply submitting | request in flight           | Button reads **"Applying…"**, disabled                                               |
| Apply success    | `201`                       | Toast **"Application submitted."**; FR-5.5 line appears or increments                 |
| Apply 404        | requisition closed meanwhile | Toast **"This position is no longer open."**; the page switches to `JobNotFound`     |
| Apply 403        | unreachable behind FR-3.4   | `onForbidden` → `/forbidden`                                                         |
| Apply error      | any other `ApiError`        | Toast **"Could not submit your application. Try again."**; button returns to idle    |

### State matrix — `/applications`

| State    | Trigger                 | Renders                                                                                                 |
| -------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Loading  | first fetch             | Three `Skeleton` cards                                                                                   |
| Success  | `applications.length > 0` | Cards, newest first, in server order — **the client does not re-sort**                                 |
| Empty    | `applications: []`      | **"You have not applied to anything yet."** / *"Browse open positions to get started."* + a `/jobs` button |
| Error    | any `ApiError`          | **"Could not load your applications."** + **Try again**                                                  |

### State matrix — `/profile`

| State   | Trigger                  | Renders                                                            |
| ------- | ------------------------ | ------------------------------------------------------------------ |
| Loading | `RequireAuth` bootstrapping | The shared loading treatment; this page adds none of its own    |
| Success | user present             | Four labelled rows. **No edit affordance of any kind** (FR-8.4)    |
| Error   | —                        | Unreachable: a failed `getMe` is already an auth failure upstream  |

### Other frontend rules

- **FE-1** Every new view is a client component under a `page.tsx` that renders it. Pages stay thin, matching
  the roles feature.
- **FE-2** Search and page live in the URL, never in component state (FR-4.3). Component state holds only the
  in-flight input value before the debounce fires.
- **FE-3** Query keys: `['jobs','list',{q,page}]`, `['jobs','detail',jobId]`, `['applications','list']`. The
  applications key is shared by `/applications` and `ApplyAction` (FR-5.6) so one invalidation updates both.
- **FE-4** Dates render through [`formatAbsolute`](../../../src/lib/format-date.ts). No new date helper, and
  no date library.
- **FE-5** Every empty, loading and error state above has exact copy specified. "Show an error" is not a
  requirement and none is left implied.
- **FE-6** Card lists collapse to one column below `md`. The sidebar's existing icon-rail behaviour is
  unchanged, so a candidate has every destination on a phone without a drawer.
- **FE-7** Every interactive control keeps the existing focus-visible ring treatment. The search input is
  labelled for screen readers even though the label is visually hidden.
- **FE-8** Style from theme tokens only (`bg-background`, `text-muted-foreground`, …). The app is dark-only
  and **no color is hardcoded**.
- **FE-9** There is still **no `middleware.ts` / `proxy.ts`**, and `/signup` does not change that. The refresh
  cookie is scoped `Path=/api/auth`, so a frontend route request never carries it and a cookie-presence gate
  would read "signed out" for everyone.

---

## Backend Requirements

The guarantees this client depends on. If any changes, this spec breaks. Source:
[../../../../backend/specs/features/candidate/spec.md](../../../../backend/specs/features/candidate/spec.md).

- **XBE-1** `POST /api/auth/signup` accepts `{ name, email, password }` and returns `201 { user }` with
  `role: "CANDIDATE"`, **no `accessToken` and no `Set-Cookie`**. FR-2.4 depends on the absence of both.
- **XBE-2** Signup's `details` keys are `name`, `email`, `password`. **`role` is not a possible key** — the
  form has no field to map it to.
- **XBE-3** `GET /api/roles` keeps the envelope `{ roles, pagination: { page, pageSize, total, totalPages } }`
  and `GET /api/roles/:roleId` keeps `{ role }`. **The keys stay `roles`/`role` even though this client calls
  them jobs.** Renaming them on the wire breaks every existing recruiter view.
- **XBE-4** Those two endpoints require authentication only. An anonymous call is `401`, never `403`.
- **XBE-5** A `CANDIDATE`'s role responses contain **only `OPEN` rows**, enforced in the query. FR-9.1 depends
  on this; a `CLOSED` row in a candidate payload is a backend bug to report.
- **XBE-6** A `CANDIDATE`'s role rows carry `id`, `title`, `description`, `status`, `createdAt` and **not
  `updatedAt`**. The `Job` type declares exactly that.
- **XBE-7** `GET /api/roles?q=` matches `title` case-insensitively. An empty `q` behaves as no `q`, so
  clearing the search box needs no special case (FR-4.3).
- **XBE-8** `GET /api/roles/:roleId` answers `404 NOT_FOUND` for a candidate when the role is `CLOSED` **or**
  does not exist, indistinguishably. FR-5.4's copy depends on not being able to tell them apart.
- **XBE-9** `POST /api/applications` accepts `{ roleId }`, returns `201 { application }`, and answers `404`
  when the role is missing or not `OPEN`. It never returns `409` — repeat applications succeed (D-6).
- **XBE-10** `GET /api/applications` returns `200 { applications }` — **the caller's own only**, scoped in the
  query — ordered `createdAt` descending. An empty result is `200` with `[]`, never `404`.
- **XBE-11** An application row carries exactly `id`, `status`, `currentStage`, `createdAt`, and
  `role: { id, title }`. FR-9.2 depends on there being nothing else.
- **XBE-12** `status` is one of `ACTIVE | HIRED | REJECTED`; `currentStage` is one of
  `APPLIED | SCREEN | INTERVIEW | OFFER`. The two sets do not overlap. FR-7.3/7.4 are exhaustive over them.
- **XBE-13** Both application endpoints are `CANDIDATE`-only and answer `403 FORBIDDEN` to an interviewer or
  recruiter — **not** an empty list.
- **XBE-14** `GET /api/auth/me` is the only profile source and returns `{ id, name, email, role, createdAt }`.
  There is no `/api/profile` and none is coming (FR-8.1).
- **XBE-15** The error body stays `{ code, message, details? }` with `details: Record<string, string[]>`, and
  `code` stays the stable contract. The client branches on `code`, never on `message`.
- **XBE-16** CORS stays `origin: FRONTEND_ORIGIN, credentials: true`, and the refresh cookie stays
  `Path=/api/auth`. FE-9 depends on the path.

---

## API Contract

| Call                          | When                                          | Sends                             | Expects                                    |
| ----------------------------- | --------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `POST /api/auth/signup`       | Signup form submitted                         | `{ name, email, password }`       | `201 { user }` · `400` · `409`             |
| `GET /api/roles?q=&page=`     | `/jobs` mounts; `q` or `page` changes         | —                                 | `200 { roles, pagination }` · `400` · `401` |
| `GET /api/roles/:roleId`      | `/jobs/[jobId]` mounts                        | —                                 | `200 { role }` · `401` · `404`             |
| `POST /api/applications`      | Apply clicked                                 | `{ roleId }`                      | `201 { application }` · `403` · `404`      |
| `GET /api/applications`       | `/applications` mounts; `ApplyAction` reads cache | —                             | `200 { applications }` · `403`             |
| `GET /api/auth/me`            | Already called by `AuthProvider` — **not re-called** | —                          | `200 { user }`                             |

Client-side rules:

- **API-1** Every call goes through `apiFetch`. No component assembles a path, a header or a token.
- **API-2** Every call is wrapped in a feature `api/` module: `features/jobs/api/jobs.api.ts`,
  `features/applications/api/applications.api.ts`, and `signup` in the existing `auth.api.ts`.
- **API-3** Query keys are exactly FE-3's. `useApplyMutation` invalidates `['applications','list']` and
  nothing else — the job list and the job detail are unaffected by an application.
- **API-4** `/profile` adds **no** call (FR-8.1). An `api/profile.api.ts` must not be created.
- **API-5** The client calls **eleven** endpoints after this feature: login, refresh, me, logout, **signup**,
  the four roles routes, **and the two application routes**. `GET /api/users` still has no wrapper and must
  not gain one.
- **API-6** The default `staleTime` of 30 s applies to jobs and applications. Neither is polled (PERF-4).

---

## Data Model Changes

Client state only. Nothing new is persisted.

| State                       | Where it lives                                  | Lifetime                        | Persisted?              |
| --------------------------- | ----------------------------------------------- | ------------------------------- | ----------------------- |
| Access token                | Module variable in `features/auth/access-token` | Tab session; cleared on logout  | **Never** — memory only |
| Signed-in user (incl. role) | TanStack Query cache, key `['auth','me']`       | Until logout or cache clear     | No                      |
| Job list page               | TanStack Query, `['jobs','list',{q,page}]`      | 30 s stale, GC on unmount       | No                      |
| Job detail                  | TanStack Query, `['jobs','detail',jobId]`       | 30 s stale                      | No                      |
| Applications list           | TanStack Query, `['applications','list']`       | 30 s stale; invalidated on apply | No                      |
| Search term / page          | **The URL** (`?q=`, `?page=`)                   | As long as the URL              | Only in browser history |
| Debounce buffer             | `useState` in `JobsSearch`                      | Until the debounce fires        | No                      |
| Signup form values          | `react-hook-form` state                         | Until unmount                   | No                      |

- **DM-1** **Nothing** in this feature is written to `localStorage`, `sessionStorage`, or IndexedDB — not the
  token, not the role, not the user, not a draft application, not the last search. The existing app persists
  nothing and that must not change here.
- **DM-2** The search term appears in the URL and therefore in browser history. That is acceptable: it is a
  public job title, not user data.
- **DM-3** No new React context and no new provider. `AuthProvider` and `QueryProvider` cover everything.

---

## Authentication / Authorization

**This matrix is UX, not a control.** Every row describes what renders; the backend re-authorizes every
request behind it.

| Route            | Anonymous          | Candidate | Interviewer | Recruiter |
| ---------------- | ------------------ | --------- | ----------- | --------- |
| `/login`         | ✅                  | → landing | → landing   | → landing |
| `/signup`        | ✅                  | → landing | → landing   | → landing |
| `/jobs`          | → `/login`         | ✅         | app 404     | app 404   |
| `/jobs/[jobId]`  | → `/login`         | ✅         | app 404     | app 404   |
| `/applications`  | → `/login`         | ✅         | app 404     | app 404   |
| `/profile`       | → `/login`         | ✅         | ✅           | ✅         |
| `/roles`         | → `/login`         | app 404   | app 404     | ✅         |
| `/pipeline`      | → `/login`         | app 404   | app 404     | ✅         |
| `/my-interviews` | → `/login`         | app 404   | ✅           | app 404   |
| `/forbidden`     | → `/login`         | ✅         | ✅           | ✅         |

- **AZ-1** **None of the above is a security control.** `<RequireAuth>` and `<RequireRole>` decide what
  renders. A candidate who calls `GET /api/roles` with a hand-made request gets the API's answer — `OPEN` rows
  only — regardless of what this table says about `/roles`.
- **AZ-2** A refused route renders `NotFoundView`, **not** `/forbidden`. `/forbidden` is for a server `403` on
  a route the user may legitimately open.
- **AZ-3** `/signup` redirects an authenticated visitor away (FR-2.7) using the same guard shape as
  `LoginForm`, for the same reason: a signed-in user on a signup form is a confusing state, not a dangerous
  one.
- **AZ-4** The role that drives all of this comes from `GET /api/auth/me` and nowhere else — never from a
  token decoded in the browser, never from `localStorage`, never from a query parameter.
- **AZ-5** `resolveRedirect`'s open-redirect guard is unchanged: a `?next=` target is honoured only when it is
  a same-origin relative path. A candidate arriving via `?next=/roles` is redirected there and then renders
  the app's 404, which is correct.
- **AZ-6** FR-3.6 closes the `/pipeline` and `/my-interviews` gaps. Those routes were reachable by any
  authenticated user; with a third, lower-privileged role in the system, leaving them open would mean a
  candidate rendering the recruiter's pipeline shell.

---

## Validation

### `signupSchema` — new, in [`lib/schemas/auth.ts`](../../../src/lib/schemas/auth.ts)

| Field      | Rule                                            | Message                                     |
| ---------- | ----------------------------------------------- | ------------------------------------------- |
| `name`     | string, trimmed, 1–100                          | `Name is required` / `Name must be at most 100 characters` |
| `email`    | string, trimmed, valid email, ≤254              | `Enter a valid email address`               |
| `password` | string, ≥8 chars **and** ≤72 bytes              | `Password must be at least 8 characters` / `Password must be at most 72 bytes` |

- **VAL-1** **Client validation is UX, never authorization.** It mirrors the backend so the form can respond
  without a round trip; where the two disagree, the backend is correct.
- **VAL-2** Signup's password rules **do** include a minimum, unlike `loginSchema`'s, and this asymmetry is
  deliberate. On login, a minimum would reveal that no account can have a short password; on signup, the rule
  is public by definition — it is what the user is being asked to satisfy.
- **VAL-3** The 72-**byte** ceiling is measured in bytes, not characters, matching bcrypt's silent truncation
  point. A multi-byte password hits it sooner than its length suggests, and the message says bytes.
- **VAL-4** There is **no `role` field and no `confirmPassword` field.** The first would be a privilege
  selector; the second is not in the backend contract and would invent a validation rule the server does not
  have.
- **VAL-5** `?q=` from the URL is sanitised before use, following `parseRolesSearchParams`: trimmed, and
  truncated at 120 characters so a hand-typed URL cannot produce a `400` the user cannot see the cause of. A
  `page` that is not an integer ≥1 becomes 1.
- **VAL-6** `[jobId]` is validated as a positive integer before any request is made (FR-5.8). An invalid
  segment renders the data-404 panel rather than producing an avoidable `400`.
- **VAL-7** Server `details` are read through [`fieldMessage`](../../../src/lib/error-details.ts), never
  passed to `setError` directly — each value is an **array** of messages.

---

## Error Handling

| Status | `code`                | Where                | UI behaviour                                                                     |
| ------ | --------------------- | -------------------- | -------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Signup               | Map `details` onto fields; focus the first failing field. No toast                |
| 400    | `VALIDATION_ERROR`    | Jobs list (bad `q`)  | Unreachable — VAL-5 sanitises first. If it happens: the generic list error state  |
| 401    | `UNAUTHENTICATED`     | Any                  | `apiFetch` refreshes once; on failure `onAuthFailure` clears the cache → `/login` |
| 403    | `FORBIDDEN`           | Any                  | `onForbidden` → `/forbidden`. Unreachable for a candidate behind FR-3.4           |
| 404    | `NOT_FOUND`           | Job detail           | `JobNotFound` panel — **"This position is no longer open"** + back link            |
| 404    | `NOT_FOUND`           | Apply                | Error toast **"This position is no longer open."** + switch to the panel          |
| 409    | `EMAIL_TAKEN`         | Signup               | Field-level message on Email + a link to `/login`. No toast                        |
| 500    | `INTERNAL_ERROR`      | Any                  | The view's error state, or a toast for a mutation. Never a raw message            |
| —      | network failure       | Any                  | Same as `500`. `ApiError` normalises both                                          |

- **ERR-1** **Branch on `code`, never on `message`.** `message` is copy that may change without being a
  breaking change.
- **ERR-2** A **query** failure renders an inline error state with a retry. A **mutation** failure raises a
  toast and leaves the form or button as it was — the user's input is never discarded by a failed request.
- **ERR-3** A raw `ApiError.message` is never rendered. Every user-facing string in this spec is specified
  above.
- **ERR-4** A `404` on a route the user may open is a **data 404** (`JobNotFound`), never `NotFoundView` and
  never `/forbidden`. The three "nothing here" renderings stay distinct, as the roles feature established.
- **ERR-5** An error toast never contains a role, an id, or an email.
- **ERR-6** `onForbidden` and `onAuthFailure` are the existing handlers in `lib/api.ts`. This feature
  registers no new global handler.

---

## Edge Cases

| ID        | Case                                                                | Behaviour                                                                                                                     |
| --------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **EC-01** | Signed-in user opens `/signup` directly                             | Immediate redirect to `ROLE_LANDING[role]`. The form never flashes (FR-2.7)                                                     |
| **EC-02** | Signup succeeds, user hits Back                                     | `/signup` renders again, empty. There is no session, so EC-01 does not apply and this is correct                                |
| **EC-03** | Signup submitted twice by double-click                              | The button is disabled while in flight; the second click does nothing                                                          |
| **EC-04** | Two tabs, one signs up, the other is on `/login`                    | No shared state to desync — the signup tab holds no session                                                                    |
| **EC-05** | Candidate reloads `/jobs?q=engineer&page=2`                         | Renders that exact search and page. The URL is the source of truth (FR-4.3)                                                    |
| **EC-06** | Candidate types fast, then clears the search box                    | One request after the debounce settles; the cleared box produces the same result as no `q` (XBE-7)                             |
| **EC-07** | Candidate opens `/jobs/abc`                                         | `JobNotFound` panel, **no request sent** (FR-5.8, VAL-6)                                                                       |
| **EC-08** | Candidate opens `/jobs/999999`                                      | One request, `404`, `JobNotFound` panel                                                                                        |
| **EC-09** | Recruiter closes a requisition while a candidate has it open        | The page still renders from cache; **Apply** answers `404`, the toast fires and the page switches to the panel (FR-6.4)        |
| **EC-10** | Candidate applies twice to the same job                             | Both succeed. The FR-5.5 line changes to the "{n} times" form. **The button stays enabled** (D-6, FR-5.7)                      |
| **EC-11** | Candidate applies in one tab, reads `/applications` in another      | The second tab is up to 30 s stale, then refetches on focus. Acceptable; an application is not time-critical to the second      |
| **EC-12** | Access token expires mid-apply                                      | `apiFetch`'s single-flight refresh runs; the apply retries once. Exactly one `POST /api/auth/refresh`, not one per query        |
| **EC-13** | Candidate signs out, then hits Back into `/applications`            | `RequireAuth` finds no user and redirects to `/login`. The query cache was cleared by `onAuthFailure`, so nothing renders first |
| **EC-14** | Recruiter types `/jobs`                                             | The app's 404 (FR-3.4) — not `/forbidden`, and not a redirect                                                                  |
| **EC-15** | Candidate types `/pipeline`                                         | The app's 404 (FR-3.6). Before this feature it rendered                                                                        |
| **EC-16** | A job's description is 5,000 characters                             | Clamped to two lines on the card; rendered in full on the detail page, wrapping, never truncated there                          |
| **EC-17** | Candidate has 200 applications                                      | All render — there is no pager (XBE-10). Slow but correct; PERF-5 states when to revisit                                        |
| **EC-18** | Application whose requisition was deleted                           | Cannot happen: the API refuses to delete a requisition with applications (backend FR-8.2)                                      |
| **EC-19** | An application row arrives with an unknown `currentStage`           | The raw value renders. No crash, no blank (FR-7.6)                                                                             |
| **EC-20** | Offline                                                             | `apiFetch` throws; queries show their error state with **Try again**, mutations toast. No spinner is left hanging              |

---

## Security Requirements

- **SEC-1** **No role selector, ever.** `/signup` has three fields, and the request body has three keys. A
  role input on a public form is a privilege-escalation surface even when the server ignores it, because the
  next person to read the code will assume the server does not.
- **SEC-2** The access token stays in a module variable. It is never written to `localStorage`,
  `sessionStorage`, a cookie this client sets, or a URL (DM-1).
- **SEC-3** Role is read from `GET /api/auth/me` and nowhere else — never decoded from the token in the
  browser (AZ-4).
- **SEC-4** **No restricted field is hidden by the UI.** There is no conditional render standing between a
  candidate and a field they should not have; the payload does not contain one. FR-9.1 and FR-9.2 make this
  a reporting obligation rather than a filtering one.
- **SEC-5** The `Job` and `Application` TypeScript types declare **only** the fields the backend promises. A
  payload carrying `feedback` or `updatedAt` fails type-checking, so a leak is caught by the compiler as well
  as by review.
- **SEC-6** `?next=`'s open-redirect guard is unchanged (AZ-5) and applies to the signup → login → landing
  path too.
- **SEC-7** No user-supplied string is rendered as HTML. Descriptions and search terms render as text; React
  escapes them and no `dangerouslySetInnerHTML` is introduced.
- **SEC-8** No error message, toast, or console line contains a token, a password, an email, or another
  user's identity.
- **SEC-9** **Known accepted gaps.**
  1. **Route guards are client-side only** and always have been. A candidate can render `/roles`'s shell by
     disabling JavaScript-level guards; they still cannot read a requisition write endpoint, because the
     backend refuses it. This is the documented POC posture (FE-9).
  2. **The signup form has no CAPTCHA, no rate limit and no email verification.** The backend has none either
     (backend SEC-12). Anyone who can reach the app can create unlimited candidate accounts.
  3. **Applying is unlimited** (D-6). The UI does nothing to slow it and the server does not either
     (backend SEC-11).
  4. **The search term enters browser history** (DM-2). Public job titles only, accepted.

---

## Performance Requirements

- **PERF-1** `/jobs` issues **exactly one** request on mount, and **one** per settled search or page change.
- **PERF-2** Search is debounced 300 ms (FR-4.4), so typing "engineer" is **one** request, not eight.
- **PERF-3** `/jobs/[jobId]` issues **one** request for the job, plus **at most one** for the applications
  list — and **zero** for it when arriving from `/applications`, because the cache key is shared (FR-5.6).
- **PERF-4** **Nothing is polled.** No `refetchInterval` anywhere in this feature. Data refreshes on mount,
  on window focus after the 30 s stale time, and on explicit invalidation after an apply.
- **PERF-5** `/applications` is unpaged by design (XBE-10) and renders every row. Revisit if a candidate ever
  exceeds ~200 applications — which requires the backend's SEC-11 gap to be exploited (EC-17).
- **PERF-6** Applying issues **exactly two** requests: the `POST`, and the one refetch its invalidation
  triggers. No optimistic write, no manual `setQueryData` (FR-6.7).
- **PERF-7** Exactly **one** `POST /api/auth/refresh` per expiry event, however many queries are in flight —
  guaranteed by the existing single-flight promise in `lib/api.ts`, which this feature does not touch.
- **PERF-8** p95, warm cache, local backend: `/jobs` interactive under 400 ms; `/applications` under 300 ms;
  Apply feedback (toast) under 500 ms of the click.
- **PERF-9** Page transitions never render an empty flash. Refetching a new page or search keeps the previous
  list visible and dimmed.

---

## Acceptance Criteria

Verified by hand, in the browser, with DevTools open. There is no test suite. Roles used:
**C** = candidate, **I** = interviewer, **R** = recruiter, all seeded by `npm run db:seed`.

### Signup

- **AC-F01** — **Given** a signed-out visitor, **when** they open `/login`, **then** a **"New here? Create an
  account"** link renders and navigates to `/signup`.
- **AC-F02** — **Given** `/signup`, **when** it renders, **then** there are exactly **three** inputs — Name,
  Email, Password — and **no role selector anywhere on the page** (SEC-1).
- **AC-F03** — **Given** `/signup`, **when** Submit is pressed with every field empty, **then** three
  field-level messages render and the Network tab shows **no request**.
- **AC-F04** — **Given** a 7-character password, **when** Submit is pressed, **then** *"Password must be at
  least 8 characters"* renders under Password and **no request** is sent.
- **AC-F05** — **Given** a valid form, **when** Submit is pressed, **then** the Network tab shows exactly one
  `POST /api/auth/signup` whose request body has **exactly three keys** — no `role` (FR-2.3).
- **AC-F06** — **Given** that request returns `201`, **when** it settles, **then** the app navigates to
  `/login` and the toast **"Account created. Sign in to continue."** appears.
- **AC-F07** — **Given** the same, **when** the Network tab is inspected, **then** the response carried **no**
  `Set-Cookie` and **no** `accessToken`, and **no** follow-up `POST /api/auth/login` was sent (FR-2.4).
- **AC-F08** — **Given** an email that already exists, **when** Submit is pressed, **then** *"An account with
  this email already exists."* renders under Email with a link to `/login`, and the other fields keep their
  values.
- **AC-F09** — **Given** the new candidate's credentials, **when** they sign in, **then** the app lands on
  **`/jobs`** (FR-1.3).
- **AC-F10** — **Given** a signed-in user of any role, **when** they open `/signup` directly, **then** they
  are redirected to their landing route and the form never renders (EC-01).
- **AC-F11** — **Given** the signup request in flight, **when** the button is observed, **then** it reads
  **"Creating account…"** and is disabled.

### Navigation and guards

- **AC-F12** — **Given** C is signed in, **when** the sidebar is read, **then** it offers exactly **Jobs**,
  **My Applications** and **Profile** — no Pipeline, no Roles, no My interviews.
- **AC-F13** — **Given** R is signed in, **then** the sidebar offers **Pipeline**, **Roles** and **Profile**.
- **AC-F14** — **Given** I is signed in, **then** the sidebar offers **My interviews** and **Profile**.
- **AC-F15** — **Given** R, **when** they type `/jobs`, **then** the app's 404 renders — not `/forbidden`, not
  a redirect (EC-14). Same for `/applications`.
- **AC-F16** — **Given** C, **when** they type `/roles`, **then** the app's 404 renders.
- **AC-F17** — **Given** C, **when** they type `/pipeline`, **then** the app's 404 renders (FR-3.6, EC-15).
- **AC-F18** — **Given** C, **when** they type `/my-interviews`, **then** the app's 404 renders.
- **AC-F19** — **Given** a signed-out visitor, **when** they open `/jobs`, **then** they are redirected to
  `/login`, **not** shown a 404.
- **AC-F20** — **Given** the codebase, **when** `UserRole` gains `'CANDIDATE'` **before** `NAV_SECTIONS` and
  `ROLE_LANDING` are updated, **then** `npm run typecheck` **fails** on both (FR-1.2). Verify by making the
  change in that order once.

### Job list

- **AC-F21** — **Given** C on `/jobs` with the seeded data, **then** the heading reads **"Open positions"**,
  **two** job cards render, and **no** card shows the seeded `CLOSED` requisition.
- **AC-F22** — **Given** the same, **when** the Network tab's `GET /api/roles` response is read, **then** it
  contains **no** row with `"status":"CLOSED"` (FR-9.1 — verified in the payload, not the DOM).
- **AC-F23** — **Given** the same response, **when** a row is inspected, **then** it has **no** `updatedAt`
  key (XBE-6).
- **AC-F24** — **Given** `/jobs`, **when** "backend" is typed into the search box, **then** after ~300 ms the
  URL becomes `/jobs?q=backend`, **exactly one** request is sent, and only matching cards remain (PERF-2).
- **AC-F25** — **Given** `/jobs?q=backend`, **when** the page is reloaded, **then** the search box is
  prefilled and the same filtered list renders (EC-05).
- **AC-F26** — **Given** a search with no matches, **then** **"No positions match "{term}"."** renders with a
  **Clear search** button that returns to `/jobs`.
- **AC-F27** — **Given** an empty database of open roles, **then** **"No open positions right now."** renders —
  not an error and not a spinner.
- **AC-F28** — **Given** the search box is cleared, **then** the URL returns to `/jobs` and the full list
  renders (EC-06).
- **AC-F29** — **Given** `/jobs` on first load, **then** skeleton cards render and the search input is
  focusable throughout.
- **AC-F30** — **Given** a page change, **when** the new page loads, **then** the previous list stays visible
  and dimmed — **no empty flash** (PERF-9).

### Job detail and applying

- **AC-F31** — **Given** C clicks a job card, **then** `/jobs/[jobId]` renders the title, the posted date, the
  **full** description, and an **Apply** button.
- **AC-F32** — **Given** `/jobs/abc`, **then** the **"This position is no longer open"** panel renders and the
  Network tab shows **no** `GET /api/roles/abc` (EC-07).
- **AC-F33** — **Given** `/jobs/<the CLOSED role's id>`, **then** one request is sent, `404` comes back, and
  the same panel renders — with copy that does **not** claim whether it existed (FR-5.4).
- **AC-F34** — **Given** Apply is clicked, **then** the button reads **"Applying…"** and is disabled until the
  request settles.
- **AC-F35** — **Given** the apply returns `201`, **then** the toast **"Application submitted."** appears and
  the Network tab shows exactly one `POST /api/applications` and one refetch of `GET /api/applications`
  (PERF-6).
- **AC-F36** — **Given** the `POST` body, **when** inspected, **then** it is exactly `{"roleId":<n>}`.
- **AC-F37** — **Given** C has applied once, **when** the page is revisited, **then** **"You applied to this
  position on {date}."** renders above the button, and the button is **still enabled** (FR-5.7).
- **AC-F38** — **Given** C applies a second time, **then** it succeeds, the line becomes **"You have applied
  to this position 2 times, most recently on {date}."**, and no error appears (EC-10, D-6).
- **AC-F39** — **Given** C arrives at a job page **from** `/applications`, **then** the Network tab shows
  **zero** `GET /api/applications` — the cache key is shared (PERF-3, FR-5.6).
- **AC-F40** — **Given** R closes the requisition while C has the page open, **when** C clicks Apply, **then**
  the toast **"This position is no longer open."** appears and the page switches to the panel (EC-09).

### My applications

- **AC-F41** — **Given** C with no applications, **then** **"You have not applied to anything yet."** renders
  with a button to `/jobs` — not an error, not a `404`.
- **AC-F42** — **Given** the seeded candidate, **then** `/applications` renders one card per application,
  newest first, each showing the role title, **Applied:** a date, **Status:** a label, **Stage:** a label.
- **AC-F43** — **Given** the seeded `(ACTIVE, INTERVIEW)` application, **then** its card reads **Status: In
  progress** and **Stage: Interview** — the brief's own example (FR-7.3, FR-7.4).
- **AC-F44** — **Given** the seeded `(REJECTED, SCREEN)` application, **then** it reads **Status: Not
  selected** and **Stage: Screening**, with the secondary badge variant.
- **AC-F45** — **Given** any card, **when** the title is clicked, **then** it navigates to `/jobs/[roleId]`.
- **AC-F46** — **Given** an application whose requisition was later closed, **when** its title is clicked,
  **then** the **"This position is no longer open"** panel renders — and the application card is still there
  on Back (FR-7.7).
- **AC-F47** — **Given** the `GET /api/applications` response, **when** inspected, **then** each row has
  exactly `id`, `status`, `currentStage`, `createdAt`, `role`, and `role` has exactly `id` and `title` — and
  **none** of `feedback`, `rating`, `notes`, `interviewer`, `overrideReason`, `stageHistory` appears (FR-9.2).
- **AC-F48** — **Given** the page, **then** there is **no** expander, no timeline, no interviewer name, and no
  "days at stage" anywhere on it (FR-7.9).
- **AC-F49** — **Given** C in two tabs, **when** one applies, **then** the other shows the new application
  after a focus-triggered refetch — not immediately, and not never (EC-11).

### Profile

- **AC-F50** — **Given** C on `/profile`, **then** Name, Email, **Role: Candidate**, and **Member since**
  render, and the Network tab shows **no new request** (FR-8.1, API-4).
- **AC-F51** — **Given** `/profile`, **then** there is **no Edit button and no disabled Edit button** anywhere
  on the page (FR-8.4).
- **AC-F52** — **Given** R on `/profile`, **then** the page renders with **Role: Recruiter** (FR-8.5). Same
  for I with **Role: Interviewer**.

### Cross-cutting invariants

- **AC-F53** — **Given** a full session as C — signup, login, jobs, search, detail, apply, applications,
  profile — **when** `localStorage`, `sessionStorage` and `document.cookie` are read in the console at the
  end, **then** **none** contains a token, a role, a name, or an email (DM-1, SEC-2).
- **AC-F54** — **Given** every response C receives during that session, **when** each payload is searched,
  **then** `"status":"CLOSED"` appears in **none** of them (SEC-4).
- **AC-F55** — **Given** the same, **when** each payload is searched, **then** none of `feedback`, `rating`,
  `notes`, `interviewer`, `overrideReason`, `stageHistory` appears as a key (SEC-4).
- **AC-F56** — **Given** the whole session, **when** the Network tab is filtered to `/api/`, **then** exactly
  these paths appear and no others: `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`,
  `/api/auth/me`, `/api/auth/logout`, `/api/roles`, `/api/roles/:id`, `/api/applications`. **No
  `/api/users`** (API-5).
- **AC-F57** — **Given** the access token is expired and three queries mount at once, **then** exactly
  **one** `POST /api/auth/refresh` is sent (PERF-7, EC-12).
- **AC-F58** — **Given** the whole session, **then** no network request repeats on a timer — there is no
  polling anywhere (PERF-4).
- **AC-F59** — **Given** `npm run lint` and `npm run typecheck`, **when** both are run, **then** both pass
  with no new warnings.
- **AC-F60** — **Given** every new view at a 400 px viewport, **then** each renders in one column with no
  horizontal scroll, and the sidebar is its icon rail (FE-6).

---

## Out of Scope

| Excluded                                          | Why                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Editing any profile field                         | D-12 — no backend endpoint writes a `User` row, so an edit form would have nowhere to send               |
| Phone, resume upload, cover letter                | D-2/D-12 — no `CandidateProfile` model exists; apply takes `roleId` and nothing else                     |
| Withdrawing an application                        | D-8 — `WITHDRAWN` is not in the backend enum, and no endpoint writes one                                 |
| A stage timeline or "days at stage"               | D-13 — the payload is flat by design; showing ageing to an applicant is a product decision not taken      |
| Disabling Apply after applying                    | D-6/FR-5.7 — a client rule the server does not have is a lie the UI tells                                |
| Description, location or department filters       | D-11 — `Role` has no such columns and adding them changes the recruiter's shipped forms                  |
| Pagination on `/applications`                     | XBE-10 — the API has no pager; adding one client-side would page a list it already returned in full      |
| Interviewer or recruiter application views        | Backend defers them to the pipeline feature, which owns the aggregates and ageing                        |
| A `/team` page, interviewer provisioning UI, `/api/users` | This repo's existing rule, and **only the signup half of it is being reversed**                 |
| Password reset, email verification, "remember me" | No backend contract exists for any of them (backend SEC-12)                                              |
| A `middleware.ts` route gate                      | FE-9 — the refresh cookie is `Path=/api/auth`, so a cookie-presence gate reads "signed out" for everyone |
| Light mode / a theme toggle                       | The app is dark-only by design; this feature does not change that                                        |
| Automated tests                                   | Repo-wide decision — verification is manual, in-browser (CLAUDE.md)                                      |

---

## Dependencies

**Blocked by:** [../../../../backend/specs/features/candidate/spec.md](../../../../backend/specs/features/candidate/spec.md).
**Nothing in this spec can be verified until that backend ships** — `/signup` needs the role-free contract,
`/jobs` needs the widened read guard, and `/applications` needs two endpoints that do not exist yet.

**Also depends on:** [../authentication/spec.md](../authentication/spec.md) (implemented) ·
[../roles/spec.md](../roles/spec.md) (implemented).

**Blocks:** any future candidate-facing view, and the recruiter pipeline view's candidate drill-down.

**New npm packages:** **none.** TanStack Query, react-hook-form, zod, sonner, lucide-react and the existing
shadcn primitives cover all of it. `Intl` covers dates via the existing `format-date.ts`.

**New env vars:** **none.**

**Modified existing files**

| Path                                                                                      | Change                                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`src/features/auth/types.ts`](../../../src/features/auth/types.ts)                       | `UserRole` gains `'CANDIDATE'`                                               |
| [`src/features/auth/redirect.ts`](../../../src/features/auth/redirect.ts)                 | `ROLE_LANDING` gains `CANDIDATE: '/jobs'`                                    |
| [`src/features/auth/api/auth.api.ts`](../../../src/features/auth/api/auth.api.ts)         | Adds `signup()`; the doc comment's signup prohibition is replaced             |
| [`src/features/auth/components/LoginForm.tsx`](../../../src/features/auth/components/LoginForm.tsx) | Adds the **Create an account** link                                |
| [`src/lib/schemas/auth.ts`](../../../src/lib/schemas/auth.ts)                             | Adds `signupSchema` + `SignupValues`                                         |
| [`src/app/(app)/layout.tsx`](../../../src/app/(app)/layout.tsx)                           | `NAV_SECTIONS` gains `CANDIDATE`; a `Profile` link is added to all three      |
| [`src/app/(app)/pipeline/page.tsx`](../../../src/app/(app)/pipeline/page.tsx)             | Wrapped in `<RequireRole allow={['RECRUITER']}>`                             |
| [`src/app/(app)/my-interviews/page.tsx`](../../../src/app/(app)/my-interviews/page.tsx)   | Wrapped in `<RequireRole allow={['INTERVIEWER']}>`                           |
| [`CLAUDE.md`](../../../CLAUDE.md)                                                         | Feature table; actors table; the "no account-creation surface" and "roles are recruiter-only" paragraphs; the endpoint count |
| [`../roles/spec.md`](../roles/spec.md)                                                    | `Revision 3` — the API's roles reads are no longer recruiter-only            |

**New files:** as listed in the file-structure block under **Frontend Requirements**.

**Next.js 16 note.** [`AGENTS.md`](../../../AGENTS.md) carries the generated Next.js agent block: this is not
the Next.js in your training data, so read `node_modules/next/dist/docs/` before writing routing code rather
than assuming an API. Two specifics this feature depends on, both already demonstrated by
[`(app)/roles/[roleId]/page.tsx`](../../../src/app/(app)/roles/[roleId]/page.tsx):

- **`params` is a Promise.** `/jobs/[jobId]/page.tsx` must be an `async` server component that `await`s
  `props.params`, typed with the globally generated `PageProps<'/jobs/[jobId]'>` — no import, and no
  synchronous destructure.
- **The raw segment is passed straight through** to the client view, which decides whether it is a valid id
  (VAL-6, FR-5.8) — the component that renders the answer owns the check. `JobDetailView` therefore takes
  `jobId: string`, not `number`.

`searchParams` is likewise a Promise, but `/jobs` does not use it: the search and page are read client-side
through `useSearchParams`, matching `/roles` (FE-2).

**External services:** none.
