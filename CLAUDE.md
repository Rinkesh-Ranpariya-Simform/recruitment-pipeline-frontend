@AGENTS.md

# Frontend — Recruitment Pipeline

Next.js (App Router) client for the Recruitment Pipeline POC. Full spec:
[../recruitment-pipeline.md](../recruitment-pipeline.md).

## What this system is

Candidates move through a fixed pipeline against open roles; interviewers leave structured
feedback per round, recruiters see the full pipeline and can override a candidate's stage. The
spec's center of gravity is that restricted data (candidate contact details) is excluded at the
source, not filtered client-side — this frontend should never rely on hiding a field in the UI as
the only thing standing between an interviewer and a candidate's email/phone. If an
interviewer-facing view ever has contact fields available in its response payload at all, that's
a backend bug to flag, not something to conditionally hide here.

## Actors

| Role                     | Sees                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Candidate                | Open positions only, their own applications, their own profile. Never feedback, interviewers, or recruiter internals |
| Interviewer              | Only candidates/rounds they're assigned to; never contact details. May read open requisitions, but is not offered a link to them |
| Recruiter                | Full pipeline, all candidates, contact details, can assign interviewers + override stages |
| Hiring manager (stretch) | Pipeline/ageing for their own open roles                                                  |

Build views and API calls per the current user's role — don't build one "candidate view" that
conditionally renders contact fields based on a client-side role check.

## Stack & conventions

- Next.js 16 App Router, React 19, TypeScript
- Components: declare props as an `interface` named `<ComponentName>Props` (not a type alias, not
  inline), and write the component as an arrow function typed `React.FC<…Props>` with the props
  destructured in the signature:

  ```tsx
  interface JobCardProps {
    job: Job;
  }

  export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  ```

- Arrow functions everywhere they work — components, hooks, handlers, helpers, callbacks. Use a
  `function` declaration only where an arrow genuinely can't go (Next.js `page.tsx` /
  `layout.tsx` default exports, generics that need a `this`, hoisting that's actually required)
- Styling: Tailwind v4 + shadcn/ui primitives in `src/components/ui/` (base-ui under the hood) —
  use/extend these rather than hand-rolling new primitives
- Theme: the palette, radii and fonts in `src/app/globals.css` track the `sdd` project. `dark` is
  pinned on `<html>` in `layout.tsx` and there is **no theme provider** — the app is dark-only, so
  style from the tokens (`bg-background`, `text-muted-foreground`, …) and never hardcode a color
- Fonts: Inter as `--font-sans`, JetBrains Mono as `--font-geist-mono`; `globals.css` maps both
  into Tailwind, so use `font-sans` / `font-mono` rather than naming a family
- Data fetching/mutations: TanStack Query (`src/components/providers/query-provider.tsx` wraps
  the app); call the backend only through `apiFetch` in `src/lib/api.ts`, which normalizes
  non-2xx responses into `ApiError`
- Forms: `react-hook-form` + `@hookform/resolvers/zod`, with schemas under `src/lib/schemas/`
  (see `auth.ts` for the pattern) — validate on the client, but never treat client
  validation as a substitute for the backend's authorization/validation
- Toasts: `sonner`
- `npm run dev` runs on port 3001; backend is expected at `NEXT_PUBLIC_API_URL`
  (`.env.example` → `http://localhost:3000`)
- `npm run lint` / `lint:fix`, `npm run format` / `format:check`

## Views this POC needs

- **Pipeline view** (recruiter/hiring manager): candidate counts per stage per role, plus ageing
  (time at current stage) — driven by a backend aggregate endpoint, not computed by fetching every
  candidate client-side.
- **Candidate detail**: stage history, assigned interviewers/rounds, feedback. Contact details
  render only when the API response actually includes them (recruiter-scoped call).
- **Feedback submission** (interviewer): rating + notes tied to a specific round; only reachable
  for rounds the current user is assigned to — attempting another candidate's round by URL/ID
  should hit a backend 403/404, and the UI should handle that response rather than assume it
  can't happen.
- **Stage override** (recruiter): requires a reason; surfaces who performed it and when once
  recorded.

## Verification

**This project has no automated test suite.** Verification is manual: every acceptance criterion is
signed off by driving the running app with DevTools open. Automated tests are a deliberate later
decision — do not add a test runner, test files, or test dependencies unless asked.

For UI changes, run the dev server and exercise the flow as both an interviewer and a recruiter
(or whatever role-switching mechanism the auth layer ends up using) — confirm the interviewer
path never receives or renders contact fields, and that requesting an unassigned candidate by ID
is rejected by the API rather than just unlinked in the UI.

## Development process (Spec-Driven Development)

Feature specs live in `specs/features/<feature>/`, each holding `spec.md` (what & why) and
`plan.md` (how). Phases run in that order and each is approved before the next begins; if implementation reveals
the spec is wrong, update the spec and get it re-approved rather than letting code and spec drift.

| Feature                                                 | spec        | plan                                                | code                                                                                                                    |
| ------------------------------------------------------- | ----------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [authentication](specs/features/authentication/spec.md) | ✅ approved | [✅ drafted](specs/features/authentication/plan.md) | ✅ implemented — unverified against a running backend                                                                   |
| [roles](specs/features/roles/spec.md)                   | ✅ approved | [✅ drafted](specs/features/roles/plan.md)          | ✅ implemented — API contract verified against the running seeded backend; the in-browser AC pass is not yet signed off |
| [candidate](specs/features/candidate/spec.md)           | ✅ approved | ⬜ skipped (implemented straight from the spec)     | ✅ implemented — lint/typecheck/build clean; **the in-browser AC pass (AC-F01…AC-F60) is not yet signed off**            |

The **candidate** feature added `/signup`, a `CANDIDATE` role, and the Jobs / My Applications / Profile
views. It **deliberately reversed two rules that used to be stated below**; both paragraphs are now rewritten
to match the code. No `plan.md` was written — it was implemented straight from the spec.

The roles plan renames the exported `Role` type to `UserRole`, so `Role` can mean _open requisition_. No
request or response field moves — `/api/auth/me` still returns `role`. It also corrects
`ApiErrorBody.details` from `Record<string, string>` to `Record<string, string[]>`, which is what the API
has always sent; the mismatch is masked only by a backend defect that the roles feature fixes.

**The app chrome is a sidebar with role-based sections** (spec FR-7, revised during implementation).
`(app)/layout.tsx` holds `NAV_SECTIONS`, a `Record<UserRole, NavSection[]>` — a **lookup table, not a
comparison**, so a user role is named in exactly one place (`features/roles/permissions.ts`,
`features/jobs/permissions.ts`). A recruiter is offered **Pipeline** and **Roles**; an interviewer **My
interviews**; a candidate **Jobs** and **My applications**. **Profile is offered to all three**, since
`/profile` renders for every role. **The sidebar still gates no route** — every guard is a `<RequireRole>` in
that route's own `layout.tsx`, and `/pipeline` and `/my-interviews` gained one with the candidate feature
(they were previously reachable by any authenticated user). The signed-in user lives in a header account menu
(name, email, Sign out); the old inline role chip is gone.

Adding a role to `UserRole` is a **compile error** in `NAV_SECTIONS` and in `ROLE_LANDING`
(`features/auth/redirect.ts`) until both are filled in. That is the point of keying them by the union; add the
next role the same way and let the compiler find the gaps.

**Roles WRITES are recruiter-only, end to end** (roles spec § Revision, both repos; reads revised again by
the candidate feature — see below). `(app)/roles/layout.tsx` wraps both roles routes in
`<RequireRole allow={ROLES_USER_ROLES}>` so an interviewer gets **the app's 404**, not `/forbidden`: a route
you may not open should look like a route that isn't there. **Three different "nothing here" renderings, and
they are not interchangeable** — `components/not-found-view.tsx` (route 404: unmatched URL *or* refused
route), `features/roles/components/RoleNotFound.tsx` and `features/jobs/components/JobNotFound.tsx` (data 404: a
recruiter's `/roles/9999`, a candidate's closed position), and
`app/forbidden/page.tsx` (a **server** `403` on a route the user may open — still wired to `apiFetch`, still
reachable). None of the three is a security control; the backend re-authorizes every request.

**Revised by the candidate feature (API side only).** The API's two roles **reads** now take any
authenticated user, so `features/jobs/` reads `/api/roles` for the candidate's job board — the wire keys stay
`roles`/`role`, only the concept is renamed. The three writes are still recruiter-only, and `<RequireRole>` on
`/roles` is **unchanged**. The one sentence above that is no longer true: an interviewer's `GET /api/roles` is
a `200` (open requisitions only), not a `403`. They are still not offered the link.

**The app has no account-creation surface.** No signup, no interviewer provisioning, no `/team` page,
no role selector, and no call to `/api/users`. Accounts are provisioned by an operator against the
backend API, so **a seeded database is required to log in at all.** The client calls **eight** endpoints —
login, refresh, me, logout, and the four roles routes. There is no `DELETE /api/roles/:roleId` and no `deleteRole` wrapper, because the
endpoint does not exist: `CLOSED` is a requisition's end state.

**Revised by the candidate feature — the signup half only.** There is now a public `/signup`, which creates
a `CANDIDATE` and nothing else; the backend removed `role` from that endpoint's contract, which is what made a
browser form safe. **The rest of the rule stands**: no interviewer provisioning, no `/team`, **no role
selector — do not add one**, and no `/api/users` wrapper. Interviewers and recruiters still come only from the
backend's seed, so a seeded database is still required to sign in as one. The client now calls **eleven**
endpoints: login, refresh, me, logout, signup, the four roles routes, and the two application routes.

**Candidate views never filter restricted data client-side.** `/jobs` shows only open positions because the
API's query for a non-recruiter cannot return a closed one, and an application row carries no feedback,
rating, interviewer or override reason because those columns are never selected. The `Job` and `Application`
types declare exactly the promised fields, so a widened payload fails type-checking as well as review — if one
ever appears, **report it as a backend bug rather than hiding the field here**.

**There is no `middleware.ts` / `proxy.ts`, and that is deliberate** (spec FE-6, revised during
implementation). The backend scopes the refresh cookie `Path=/api/auth`, so a frontend route request
never carries it and a cookie-presence gate would read "signed out" for everyone. Route protection is
entirely client-side: `<RequireAuth>` for guarded routes, `LoginForm` for redirecting an
already-authenticated visitor away from `/login`. Neither was ever the security control — the backend
re-authorizes every request.

Authentication blocks every other view — there is no anonymous path and no role-switcher, so
nothing renders until a real user is known. The backend counterpart is
[../backend/specs/features/authentication/spec.md](../backend/specs/features/authentication/spec.md);
the two share one API contract, so a change to endpoints, the error shape, or the cookie name
must be made in both.

[recruitment-pipeline.md](../recruitment-pipeline.md) (and an approved spec/plan, where one
exists) is the source of truth for behavior — not assumption, not "what would be nice to have."
Where an approved spec is more specific than the brief, the spec wins; where it is silent, the
brief governs.

**Before implementing:** re-read the relevant part of the spec, inspect existing frontend code for
a pattern that already fits (don't assume a component/hook/util/API/dependency exists — check),
and flag ambiguities or missing requirements instead of guessing at unspecified product behavior.

**While implementing:** stay inside the approved scope. Reuse existing components, hooks, api.ts
helpers, and schema patterns before writing new ones. No unrelated refactors, no speculative
features, no new abstractions the current task doesn't need, no dependency additions unless the
capability genuinely isn't already covered by the existing stack. Preserve existing behavior in
code you touch unless the spec explicitly changes it. Cover the states the spec implies (loading,
empty, success, error, disabled, validation) — don't invent copy or interactions it doesn't call for.

**Frontend validation is UX, not authorization** — mirror the backend's rules for responsiveness,
but never treat a client-side check as a substitute for what the API enforces. If the frontend and
backend contract look inconsistent, check the spec and the actual backend implementation before
changing anything; don't silently invent a new contract on the frontend side.

**Before calling it done:** run lint and type-check, then verify against the spec by hand;
and report back plainly — what changed, what was verified, and any deviation from the spec or
scope you couldn't resolve, rather than papering over it.
