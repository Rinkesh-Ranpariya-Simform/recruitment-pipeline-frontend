# Frontend specs — Recruitment Pipeline

Feature specifications for the Next.js 16 App Router client. Parent brief:
[../../recruitment-pipeline.md](../../recruitment-pipeline.md). Conventions and the standing rules
every spec inherits: [../CLAUDE.md](../CLAUDE.md) and [../AGENTS.md](../AGENTS.md).

This project follows Spec-Driven Development. Each feature owns a folder under `features/` holding
`spec.md` (what & why) and, once the spec is approved, `plan.md` (how). Each phase is approved
before the next begins.

---

## Status

| Feature                                               | spec        | plan                                            | code           |
| ----------------------------------------------------- | ----------- | ----------------------------------------------- | -------------- |
| [authentication](features/authentication/spec.md)     | ✅ approved | [✅ drafted](features/authentication/plan.md)   | ✅ implemented |
| [roles](features/roles/spec.md)                       | ✅ approved | [✅ drafted](features/roles/plan.md)            | ✅ implemented |
| [candidate](features/candidate/spec.md)               | ✅ approved | ⬜ skipped (implemented straight from the spec) | ✅ implemented |
| [audit](features/audit/spec.md)                       | ✅ approved | ⬜ skipped                                      | ✅ implemented |
| [pipeline](features/pipeline/spec.md)                 | ✅ approved | ⬜ skipped                                      | ✅ implemented |
| [interviews](features/interviews/spec.md)             | 🟡 draft    | ⬜ not started                                  | ⬜ not started |
| [feedback](features/feedback/spec.md)                 | 🟡 draft    | ⬜ not started                                  | ⬜ not started |
| [candidate-access](features/candidate-access/spec.md) | 🟡 draft    | ⬜ not started                                  | ⬜ not started |

---

## Build order

The same order as the backend, and for the same reasons — each frontend spec is blocked by its own
backend counterpart, which is blocked by the one before it:

```
audit ──► pipeline ──► interviews ──► feedback ──► candidate-access
```

**Nothing in these five specs can be verified until its backend counterpart ships.** Every one of
them is a client for an API that does not exist yet; the acceptance criteria are written to be
driven through the browser against a running, seeded backend.

See [../../backend/specs/README.md](../../backend/specs/README.md) for why the order is what it is.
`candidate-access` is the feature the brief names first and the one built last, because its interviewer
scoping depends on a table three features away.

---

## What each feature adds to this client

| Feature            | Routes                                                                                                     | Nav                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `audit`            | `/audit` **NEW**                                                                                           | Recruiter → Audit                                              |
| `pipeline`         | `/dashboard` **NEW** · `/pipeline` **fills the existing stub**                                             | Recruiter → Dashboard; recruiter landing moves to `/dashboard` |
| `interviews`       | `/interviews` **NEW** · `/interviews/[interviewId]` **NEW** · `/my-interviews` **fills the existing stub** | Recruiter → Interviews; interviewer unchanged                  |
| `applications`     | `/applications` **MOD** (recruiter projection) · `/interviews/[applicationId]` **NEW** · `/interviews/[applicationId]/[interviewId]` **MOD from `/interviews/[interviewId]`** · `/my-interviews/[interviewId]` **NEW** | Recruiter → Applications, before Interviews |
| `feedback`         | none — components on `/interviews/[interviewId]` and `/candidates/[candidateId]`                           | none                                                           |
| `candidate-access` | `/candidates` **NEW** · `/candidates/[candidateId]` **NEW** · `/roles/[roleId]` **MOD**                    | Recruiter → Candidates; interviewer → Candidates               |

The `applications` row **supersedes the `interviews` row above it.** The recruiter's surfaces were
rearranged into three levels — the list of processes, one candidate's process, one round — and the
interviewer's round page moved under `/my-interviews`, where their list already lived. The reasoning
is [Amendment A](features/applications/spec.md#amendment-a--the-routing-revised-after-the-walkthrough)
in the applications spec.

Two of these fill routes that already exist. [`(app)/pipeline/page.tsx`](<../src/app/(app)/pipeline/page.tsx>)
and [`(app)/my-interviews/page.tsx`](<../src/app/(app)/my-interviews/page.tsx>) are placeholder pages
that are **also the landing routes** for recruiters and interviewers — so a recruiter logging in
today lands on an empty screen. Filling them is not new surface; it is finishing what the
authentication feature stubbed.

The final navigation, per the walkthrough:

| Role        | Sections                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Recruiter   | **Hiring** — Dashboard, Pipeline, Roles, Candidates, Interviews · **Records** — Audit · **Account** — Profile |
| Interviewer | **Interviews** — My interviews, Candidates · **Account** — Profile                                            |
| Candidate   | **Jobs** — Jobs, My applications · **Account** — Profile _(unchanged)_                                        |

---

## The one rule these five specs exist to honour

[../CLAUDE.md](../CLAUDE.md) states it, and every spec below restates it as a numbered requirement:

> If an interviewer-facing view ever has contact fields available in its response payload at all,
> that's a **backend bug to flag**, not something to conditionally hide here.

So no spec in this folder contains a conditional render of a contact field, and none declares a type
with an optional `email?`. An optional field invites a component to render it; two separate
interfaces do not. Each spec's **Backend Requirements** (`XBE-n`) names the guarantee it depends on,
and its counterpart's **Frontend Requirements** (`XFE-n`) is the other half of the same sentence.

Guards are the second half of the same idea. `<RequireRole>` in a route `layout.tsx` decides what
renders; it is **UX, never security**. Every route matrix in these specs opens by saying so.

---

## Reading order for a reviewer

1. This file.
2. [features/candidate-access/spec.md](features/candidate-access/spec.md) § _Frontend Requirements_ — the two
   candidate views, and why they are two components rather than one with a role check.
3. [features/pipeline/spec.md](features/pipeline/spec.md) § _Functional Requirements_ — the board,
   the move, and the override dialog that will not submit without a reason.
4. [features/feedback/spec.md](features/feedback/spec.md) § _Error Handling_ — what the client does
   with the `409` that the concurrency policy produces.

The backend counterparts live at [../../backend/specs/README.md](../../backend/specs/README.md). The
two repos share one API contract: a change to an endpoint, a response shape, an error code, or a
cookie/header name must be made in both.
