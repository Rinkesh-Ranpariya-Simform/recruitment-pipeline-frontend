---
description: Spec-Driven Development phase 2 — read the approved spec, then write specs/features/<feature>/plan.md
argument-hint: [feature-name]
---

We are now in the **planning phase** for the frontend.

Feature:

$ARGUMENTS

If I gave you no feature name above, list the folders under `specs/features/` and ask me which one to plan.

**Do NOT modify production code.** The only file you create is `plan.md`. Do not make speculative changes.

---

## Step 1 — Read the spec

Read `specs/features/[feature-name]/spec.md` in full. It is the source of truth for this plan; the plan explains *how*, never *what* or *why*.

Also read, for cross-boundary context (paths relative to this repo's root; skip any not present):

- `../backend/specs/features/[feature-name]/spec.md` — if it exists, it **is** the API contract; do not invent one
- `CLAUDE.md` — conventions, and the rule that role-specific views beat conditionally hidden fields
- `AGENTS.md` — **this is Next.js 16.** Before planning routing, `middleware.ts`, layouts or server components, read the relevant guide in `node_modules/next/dist/docs/` rather than relying on remembered Next conventions
- `../recruitment-pipeline.md` — the POC brief

**If the specification is insufficient to create a reliable plan, stop.** Do not fill gaps by assuming. List the exact questions that need answers, then wait. A plan built on a guess is worse than no plan.

---

## Step 2 — Explore the existing codebase

Ground every proposed change in what actually exists:

- `src/app/` — current routes, layouts, providers
- `src/components/ui/` — the shadcn primitives already available. **Never plan a new primitive where one exists** — name the existing one and its path
- `src/lib/api.ts` — `apiFetch` / `ApiError`; every backend call goes through it
- `src/lib/schemas/` — the zod + `z.infer` pattern
- `src/components/providers/` — TanStack Query wiring
- `package.json` — what is installed, what scripts exist (never assume a dependency exists)
- `specs/features/` — plans for features this one builds on

Actively look for existing components, hooks and utilities to **reuse**. Plan a new dependency only where the existing stack (Next, React, Tailwind, shadcn, TanStack Query, RHF, zod, sonner) genuinely cannot do it.

---

## Step 3 — Write the plan

Create `specs/features/[feature-name]/plan.md` with **exactly these headings, in this order**:

```
# Implementation Plan — <Feature Name> (Frontend)
## Architecture Impact
## Frontend Changes
## Backend Changes
## Database Changes
## API Changes
## Shared Types / Contracts
## Verification Commands
## Risks
## Implementation Order
## Acceptance Criteria Mapping
```

### Section contents

**## Architecture Impact**
What structurally changes in this repo: new routes or route groups, new layouts, changes to the provider tree, `middleware.ts` matcher changes, new feature modules. Call out anything that changes an existing pattern rather than extending it, and any change to a shared file (`src/lib/api.ts`, root `layout.tsx`) that other features depend on.

**## Frontend Changes**
The bulk of the plan. For **each** change, give:

- **file/path** — exact, e.g. `src/features/auth/components/LoginForm.tsx`
- **component/module** — what it is: page, layout, component, hook, api module, schema, middleware
- **responsibility** — one sentence on what this file owns
- **required modification** — new file, or the precise change to an existing one
- **states rendered** — which of loading / empty / error / disabled / success this file is responsible for
- **reuses** — the existing primitives, hooks or utilities it builds on, with paths

Group by route or feature module. Mark each entry **NEW** or **MODIFIED**. State server component vs client component where it matters.

**## Backend Changes**
This is a frontend plan, so this section records **only what the backend must provide or change** for this frontend work — endpoints consumed, response shapes relied on, error codes handled. Link to `../backend/specs/features/[feature-name]/plan.md` for the actual backend plan. If the backend needs no change, **state that explicitly** rather than leaving the section empty.

**## Database Changes**
**State explicitly that the frontend has no database.** Then document client-side state ownership instead: TanStack Query keys and their invalidation triggers, in-memory module state, URL/search-param state, form state, and anything in browser storage — including what must **never** be written there.

**## API Changes**
For every endpoint this feature calls: endpoint · HTTP method · request shape sent · response shape expected · errors handled and the UI behaviour for each · authentication/authorization required. Mark each as consumed-unchanged, or note if this feature requires a backend change. State the query key for each read.

**## Shared Types / Contracts**
What must stay in sync between Next.js and Express: response shapes, error `code` values, enum values, header and cookie names, status-code semantics. Name the TypeScript types that mirror the backend contract and where they live. State what breaks here if the backend changes each one. Remember these are two separate repos — nothing is shared by import, only by agreement.

**## Verification Commands**
The exact commands to run, in order, with what each proves. Include install, lint, type-check, build, and `npm run dev`. State what must be running first (the backend on port 3000, a seeded database).

**This project writes no automated tests** — every acceptance criterion is signed off by hand. So follow the commands with a **manual verification table**: one row per criterion, giving the exact steps to perform in the browser, what to observe (rendered copy, DevTools Network call counts, Application › Cookies and Storage), and the criterion ID it proves. Cover every state — loading, empty, error, disabled, unauthorized — and the assertions on **absence** (no role selector, no token in `localStorage`) and on **request counts** where they matter.

**## Risks**
Technical risks and compatibility concerns, each with an impact and a mitigation. Cover at least: Next.js 16 API differences from older versions, changes to the shared `src/lib/api.ts` affecting other callers, hydration and server/client component boundaries, cache invalidation correctness, and any new dependency.

**## Implementation Order**
The safest sequence, as numbered steps. Types and schemas before components; the api module before the hooks that use it; shared-file changes (`src/lib/api.ts`) before the features that depend on them. Each step should leave the app building and type-checking. Note which steps are independent, and which are blocked on the backend being implemented first.

**## Acceptance Criteria Mapping**
A table with **every** acceptance criterion from `spec.md` — `AC-F*` and `AC-M*` alike, none omitted:

| Acceptance Criterion | Implementation | Manual Verification |
| -------------------- | -------------- | ------------------- |
| AC-F01 — empty email blocks submit | `src/features/auth/components/LoginForm.tsx`, `src/lib/schemas/auth.ts` | Submit with the email empty — a field message renders and the Network tab shows no request |
| AC-M01 — refresh cookie is HttpOnly | `src/lib/api.ts` (no cookie access) | DevTools › Application › Cookies — `refresh_token` flagged HttpOnly |

Reference implementation entries by the file paths used in **## Frontend Changes**, so the table and the plan agree.

---

## Step 4 — After writing

1. Verify every heading is present and in order.
2. Verify **every** acceptance criterion in `spec.md` appears in the mapping table — a missing row means unplanned work.
3. Confirm every view in the plan has a planned loading, empty and error state.
4. Confirm every planned file is either NEW or a named modification to a real existing path, and that no new UI primitive duplicates one in `src/components/ui/`.
5. Report plainly: what the plan covers, anything in the spec you could not plan reliably, whether it is blocked on backend implementation, and any question still open.

Do not start implementing.

**Reference:** `specs/features/authentication/spec.md` shows the spec standard these plans are derived from.
