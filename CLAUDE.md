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

| Role | Sees |
|---|---|
| Interviewer | Only candidates/rounds they're assigned to; never contact details |
| Recruiter | Full pipeline, all candidates, contact details, can assign interviewers + override stages |
| Hiring manager (stretch) | Pipeline/ageing for their own open roles |

Build views and API calls per the current user's role — don't build one "candidate view" that
conditionally renders contact fields based on a client-side role check.

## Stack & conventions

- Next.js 16 App Router, React 19, TypeScript
- Styling: Tailwind v4 + shadcn/ui primitives in `src/components/ui/` (base-ui under the hood) —
  use/extend these rather than hand-rolling new primitives
- Data fetching/mutations: TanStack Query (`src/components/providers/query-provider.tsx` wraps
  the app); call the backend only through `apiFetch` in `src/lib/api.ts`, which normalizes
  non-2xx responses into `ApiError`
- Forms: `react-hook-form` + `@hookform/resolvers/zod`, with schemas under `src/lib/schemas/`
  (see `quick-note.ts` for the pattern) — validate on the client, but never treat client
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

## Testing / verification

For UI changes, run the dev server and exercise the flow as both an interviewer and a recruiter
(or whatever role-switching mechanism the auth layer ends up using) — confirm the interviewer
path never receives or renders contact fields, and that requesting an unassigned candidate by ID
is rejected by the API rather than just unlinked in the UI.

## Development process (Spec-Driven Development)

[recruitment-pipeline.md](../recruitment-pipeline.md) (and an approved implementation plan, when
one exists) is the source of truth for behavior — not assumption, not "what would be nice to have."

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

**Before calling it done:** run lint, type-check, and any relevant tests; verify against the spec;
and report back plainly — what changed, what was verified, and any deviation from the spec or
scope you couldn't resolve, rather than papering over it.
