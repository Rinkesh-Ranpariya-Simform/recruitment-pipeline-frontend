---
description: Spec-Driven Development phase 3 — implement the approved spec + plan, verify every acceptance criterion
argument-hint: [feature-name]
---

We are now in the **implementation phase** for the frontend.

Feature:

$ARGUMENTS

If I gave you no feature name above, list the folders under `specs/features/` and ask me which one to implement.

---

## Step 1 — Read the spec and the plan

Read both in full. They are the source of truth; nothing you build may exceed or contradict them.

- `specs/features/[feature-name]/spec.md` — **what** and **why**
- `specs/features/[feature-name]/plan.md` — **how**, including the Acceptance Criteria Mapping table

Also read, for cross-boundary context (paths relative to this repo's root; skip any not present):

- `../backend/specs/features/[feature-name]/spec.md` — if it exists it **is** the API contract; do not invent one
- `CLAUDE.md` — conventions, and the rule that role-specific views beat conditionally hidden fields
- `AGENTS.md` — **this is Next.js 16; its APIs differ from older versions.** Before writing routing, `middleware.ts`, layouts or server components, read the relevant guide in `node_modules/next/dist/docs/` rather than relying on remembered Next conventions
- `../recruitment-pipeline.md` — the POC brief

**If the plan is not approved, or is insufficient to implement reliably, stop.** Do not fill gaps by assuming. List the exact questions, then wait. Where the spec and the plan disagree, **the spec wins** — say so and stop rather than picking one silently.

---

## Rules

1. **Do not expand scope.** Only what the plan lists gets built. No extra routes, no redesigns, no unrelated refactors.
2. **Do not invent unspecified product behavior.** Copy, empty-state text, redirect targets and error messages come from the spec. If the spec is silent, stop and ask — do not write placeholder copy and move on.
3. **Do not silently modify the specification.** If implementation proves the spec wrong, say so, propose the spec change, and get it approved before coding around it.
4. **Follow the existing project architecture.** App Router under `src/app/`, feature modules for components/hooks/api, every backend call through `apiFetch` in `src/lib/api.ts`, zod schemas in `src/lib/schemas/`, TanStack Query for server state, `react-hook-form` for forms, `sonner` for toasts.
5. **Reuse existing patterns.** **Never hand-roll a primitive that exists in `src/components/ui/`.** Add no runtime dependency the approved plan didn't list. The plan's **reuses** entries are binding.
6. **Make the smallest clean changes necessary.** A change to a shared file (`src/lib/api.ts`, root `layout.tsx`, `middleware.ts`) must not alter behaviour for existing callers.
7. **Implement acceptance criteria one by one**, in the plan's **## Implementation Order**.
8. **Verify every acceptance criterion by hand** after implementation, using the plan's manual verification table (see Step 3).
9. Run linting and type checking.
10. Run the production build where appropriate.

**Guards are UX, never security.** Never rely on hiding a field in the UI to protect restricted data. If an interviewer-facing response payload contains candidate contact fields **at all**, that is a backend bug to flag — do not conditionally hide it here.

**Never put a token in `localStorage`**, and never add an `eslint-disable`, `any`, or `@ts-expect-error` to make a check pass.

---

## Step 2 — Implement

Work through **## Implementation Order** from `plan.md`. Types and schemas before components; the api module before the hooks that use it; shared-file changes before the features that depend on them. Each step must leave the app building and type-checking.

For **each acceptance criterion** (`AC-F01…`, `AC-M01…`):

1. **Implement it** — the files named in the plan's **## Frontend Changes**, and no others. If you need a file the plan doesn't list, that's a scope question: stop and ask.
2. **Fix failures** — fix the cause, not the symptom. A failure that reveals a spec gap goes back to rule 3.
3. **Verify it** — run the criterion's exact row from the plan's manual verification table and observe the real result: rendered copy, Network call counts, Application › Cookies and Storage.

Every interactive view must render **all** the states the spec's state matrix lists — loading, empty, error per `code`, disabled/in-flight, unauthorized. A view shipped without its empty or error state is incomplete, not a follow-up.

Branch on the backend's error `code`, never on message copy. Respect the server/client component boundary the plan sets.

Track progress with a todo list — one item per acceptance criterion — so the state of the work is visible.

---

## Step 3 — Verify

Run the commands from the plan's **## Verification Commands**, in order. At minimum:

```bash
npm run lint            # eslint
npx tsc --noEmit        # type check
npm run format:check    # prettier
npm run build           # production build (next build)
npm run dev             # port 3001, for the manual pass
```

State what must be running first — the backend on port 3000 (`NEXT_PUBLIC_API_URL`) and a seeded database for any `AC-M*` row.

Then work the **manual verification table** row by row in the browser with DevTools open. Cover, explicitly:

- **Every state** — loading, empty, error, disabled, unauthorized. Not just the happy path.
- **Absence** — no role selector, no token in `localStorage`, no restricted field in any interviewer-facing payload.
- **Counts** — where the spec states a request count ("exactly one refresh per expiry event"), confirm it in the Network tab.
- **Both roles** — exercise the flow as an interviewer and as a recruiter; confirm the interviewer path never receives contact fields, and that requesting an unassigned candidate by ID is rejected by the API rather than merely unlinked in the UI.

**Do not claim something is verified unless you actually ran it and saw the result.** If a check can't be run — the backend isn't implemented, the database isn't seeded, no real session exists — say exactly that and mark the criterion **unverified**. `AC-M*` criteria blocked on the backend are an expected outcome; report them as blocked, not as passed.

---

## Step 4 — After implementing

1. Confirm **every** acceptance criterion in `spec.md` — `AC-F*` and `AC-M*` alike — is either implemented and verified, or explicitly listed as unverified/blocked with the reason.
2. Confirm no file was changed that the plan didn't call for, and that no new component duplicates a primitive in `src/components/ui/`.
3. Confirm the calls as built match `spec.md` **## API Contract** exactly — path, method, status codes, error `code` values, header and cookie names. Any divergence breaks the backend agreement; flag it loudly and note that both repos must change together.
4. Update the feature status table in `CLAUDE.md` (the `code` column).
5. Report plainly:
   - what you changed, by path
   - which acceptance criteria are verified, and the evidence for each
   - which are unverified or blocked on the backend, and why
   - lint / type-check / build results, as they actually came out
   - any deviation from the spec or plan, and any question still open

Do not paper over a gap between the spec and what got built.
