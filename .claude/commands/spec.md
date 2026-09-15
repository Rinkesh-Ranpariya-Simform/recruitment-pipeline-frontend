---
description: Spec-Driven Development phase 1 — interview me, then write specs/features/<feature>/spec.md
argument-hint: [feature description]
---

We are following Spec-Driven Development.

I want to build the following frontend feature:

$ARGUMENTS

**Do NOT write production code.**

Your job in this phase is to help me produce a complete frontend feature specification. If I gave you no feature description above, ask me what feature to spec before doing anything else.

---

## Step 1 — Explore the codebase, only as necessary

Read enough to ground the spec in what actually exists. Do not read the whole repo. All paths are relative to this repo's root (`frontend/`).

- `CLAUDE.md` — conventions, and the rule that role-specific views beat conditionally hidden fields
- `AGENTS.md` — **this is Next.js 16; its APIs differ from older versions.** Before specifying routing, `middleware.ts`, layouts, or server components, read the relevant guide in `node_modules/next/dist/docs/` rather than relying on remembered Next conventions
- `../recruitment-pipeline.md` — the POC brief and source of truth (sits above this repo; skip if not present)
- `src/lib/api.ts` — `apiFetch` / `ApiError`; every backend call goes through it
- `src/components/ui/` — the shadcn primitives that already exist. **Never spec a new primitive where one exists**
- `src/lib/schemas/` — the zod + `z.infer` schema pattern
- `package.json` — what is actually installed (never assume a dependency exists)
- `../backend/specs/features/[feature-name]/spec.md` — if the backend spec exists, it **is** the API contract; read it before inventing one (skip if that repo isn't checked out alongside)
- `specs/features/` — existing specs this builds on

Prefer one `Explore` subagent over many individual reads when the scope is uncertain.

Then report what you found in one short paragraph — particularly anything that **contradicts or constrains** what I asked for. If I described React Router, Redux, a REST shape the backend doesn't serve, or a component that doesn't exist, say so in your first message rather than silently translating it.

---

## Step 2 — Interview me

Ask in **rounds of up to 4 questions**, using `AskUserQuestion` with concrete options and a recommended default. Use the `preview` field to show layout or flow sketches when comparing UI approaches. Continue until the requirements are unambiguous — usually 3–5 rounds. Never ask about something you can determine yourself from the code.

**Do not make important assumptions silently. If something is ambiguous, ask me.**

Cover these, skipping only what genuinely does not apply:

**Product & scope** — business goal (what I can't do today) · users/roles (**separate views per role, or one view with a role check?** the brief wants separate) · user behavior (entry points, primary path, what happens after success) · out-of-scope behavior

**Structure & flow** — frontend behavior (routes, components, step-by-step flow) · navigation (where it's reached from, where it goes, deep-linking, back button) · API contracts (which endpoints, when, which query keys) · data model (client state: cached, in memory, in the URL, in a form; what survives reload)

**States — ask about each explicitly, they are the usual gap** — loading states (skeleton vs spinner vs optimistic; first load vs refetch) · empty states (exact copy, and is there a call to action) · failure states (per error code: inline, toast, full-page, retry) · disabled/in-flight states (how double-submit is made impossible) · unauthorized state (403 view or redirect — **a silent redirect is indistinguishable from a bug**)

**Correctness & non-functional** — validation (client rules, and where they deliberately differ from the server's) · error cases (each backend `code` → a specific UI behaviour) · edge cases (reload, stale cache, concurrent tabs, slow network, offline, back button, open redirect) · authentication (what this needs from the session layer) · authorization (which routes are guarded — **guards are UX, never security**) · security (token handling, open redirects, data that must never reach this client) · performance (request counts, caching, perceived latency, what must not be polled) · accessibility (keyboard path, focus management, error association) · notifications (what deserves a toast — successful actions, not failures) · backwards compatibility (does this change a route, URL shape, or existing component contract) · verification (the manual browser checks that will prove each acceptance criterion)

**For this POC specifically, always resolve:**

- Does this view need data that **must never reach an interviewer** (candidate contact details)? If so, spec **separate role-scoped calls**, not a shared payload with conditional rendering.
- If a restricted field could ever arrive in this client's payload, the spec must say that is **a backend bug to flag**, not something to hide in the UI.
- Does the UI handle a `403` correctly even on a route the client believes is permitted?

---

## Step 3 — Write the spec

Create `specs/features/[feature-name]/spec.md` (kebab-case slug) with **exactly these headings, in this order**:

```
# <Feature Name> (Frontend)
## Goal
## Background / Context
## Users / Actors
## User Stories
## Functional Requirements
## Frontend Requirements
## Backend Requirements
## API Contract
## Data Model Changes
## Authentication / Authorization
## Validation
## Error Handling
## Edge Cases
## Security Requirements
## Performance Requirements
## Acceptance Criteria
## Out of Scope
## Dependencies
```

### What each section must contain

- **Goal** — what this makes true, as a numbered list. Not a restatement of the title.
- **Background / Context** — why now, a table of the current state of this repo, the decisions settled during the interview, and **any translation you had to make** from my description (e.g. React Router → App Router) stated openly.
- **Users / Actors** — a table of what each role sees and can reach.
- **User Stories** — numbered `US-01…`, "As a … I want … so that …".
- **Functional Requirements** — numbered and hierarchical (`FR-1.1`), each independently checkable.
- **Frontend Requirements** — the bulk of the spec, numbered `FE-1…`. Include a **file-structure block** (routes, components, hooks, api module, schemas), and a **state matrix table per interactive view** covering idle / invalid / submitting / each error code / success. Name the existing shadcn primitives being used.
- **Backend Requirements** — **not a stub.** Numbered `XBE-1…`: the exact guarantees this client depends on (response shapes, status-code semantics, `details` keying, header and cookie names, empty-list behaviour). State that if any change, this spec breaks. Link to `../backend/specs/features/[feature-name]/spec.md`.
- **API Contract** — a table of call / when / sends / expects, plus client-side rules: everything through `apiFetch`, calls wrapped in a feature `api/` module, and the query keys.
- **Data Model Changes** — client state only, as a table of state / where it lives / lifetime / persisted. State plainly what must **never** be written to `localStorage`.
- **Authentication / Authorization** — a full route × role matrix, plus rules (`AZ-1…`) beginning with the fact that this matrix is UX and not a control.
- **Validation** — the zod schemas as field tables, plus rules (`VAL-1…`) explaining where client rules deliberately differ from the server's and why.
- **Error Handling** — a table mapping each status / `code` to a specific UI behaviour, plus rules (`ERR-1…`). Branch on `code`, never on message copy.
- **Edge Cases** — a numbered table (`EC-01…`): reload, stale cache, multiple tabs, slow network, offline, back button after logout, malicious URL params.
- **Security Requirements** — numbered (`SEC-1…`), ending with a **"known accepted gaps"** entry.
- **Performance Requirements** — numbered (`PERF-1…`) with p95 numbers and **request counts** (e.g. "exactly one refresh per expiry event"), plus what must not be polled.
- **Acceptance Criteria** — see below.
- **Out of Scope** — a table of exclusions, each with a one-line reason.
- **Dependencies** — what this blocks, what blocks it, new npm packages (**runtime deps only if the existing stack genuinely can't do it**), env vars, modified existing files as a table with paths, and the Next.js 16 note from `AGENTS.md`.

### Acceptance criteria

Write them in precise **Given / When / Then** form, numbered `AC-F01…`.

**This project writes no automated tests — every criterion is verified by hand**, so each one must be checkable by a person driving the running app with DevTools open. Write the _observable_ outcome, not an assertion.

- **Every state gets one** — loading, empty, error, disabled, unauthorized. A view whose empty state has no AC is not specced.
- State **counts** where they matter ("exactly one request", observed in the Network tab), not just outcomes.
- State what must be **absent**: no signup link, no role selector, no `role` key in a payload, no token in `localStorage`.
- Add `AC-M01…` for criteria that additionally need a **running backend and a seeded database** — real cookie flags, real reload behaviour — so they can be sequenced after the backend ships.

### Style

- Link files as clickable relative paths from the spec's own location (e.g. `../../../src/lib/api.ts`).
- Tables for matrices and state machines; fenced blocks for structure and payloads; ASCII arrows for flows.
- Every requirement gets a stable ID so `plan.md` can reference it.
- Specify **exact user-facing copy** for empty states and error messages. "Show an error" is not a requirement.
- Be decisive. A spec that says "consider using…" is not finished.

---

## Step 4 — After writing

1. Verify all 19 headings are present and in order.
2. Confirm every interview decision is reflected, with no silent additions.
3. Confirm every view has a specified loading, empty, and error state.
4. Update the feature status table in `CLAUDE.md`.
5. Say that the two specs share one API contract — a change to endpoints, error shape, or cookie/header names must be made in both repos.
6. Report plainly: what you wrote, which decisions I made, any translation you applied to my description, and any assumption you had to state rather than resolve.

**Reference example:** `specs/features/authentication/spec.md` is an approved spec written to this standard. Match its depth and precision.

`plan.md` is a **later phase** — do not write it now unless I explicitly ask.
