# Pipeline — Dashboard, Board, Stage Moves and Overrides (Frontend)

> **Status:** ✅ Approved and implemented. `plan.md` was skipped — built straight from this spec,
> as `candidate` and `audit` were. See `## Revisions` at the foot for what implementation changed.
> **Feature slug:** `pipeline`
> **Scope:** `frontend/` — Next.js 16 App Router, React 19, TanStack Query
> **Counterpart:** [../../../../backend/specs/features/pipeline/spec.md](../../../../backend/specs/features/pipeline/spec.md)
> **Depends on:** [../authentication/spec.md](../authentication/spec.md) · [../roles/spec.md](../roles/spec.md) — both implemented
> **Backend:** shipped and verified. **Partially blocked by** `candidate-access` — the drill-down
> list (FR-4) and therefore the Move menu's only mount point wait on `GET /api/candidates`.
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md) §3.1, §3.3, §3.5

---

## Goal

1. Replace the recruiter's empty landing page with a **dashboard** that answers "where does hiring
   stand" in four numbers and a stage breakdown.
2. Fill the `/pipeline` stub with a **board**: counts per stage per role, with **ageing** shown where
   it is actionable rather than buried.
3. Make a **stage move** one click, and make an **illegal move impossible to attempt** — by
   rendering only the moves the API says are legal, from the API's own answer.
4. Make an **override** possible but deliberate: a dialog that will not submit without a reason, and
   that says plainly that the action is recorded.
5. Handle the **conflict case** properly: when a colleague moved the same candidate a moment
   earlier, say so and refresh — never leave a recruiter believing their change landed.

Success means: a recruiter logs in, lands on a dashboard with real numbers, opens the pipeline,
advances a candidate, is stopped from skipping a stage, performs that skip through an override with
a typed reason, and sees the board update — while a colleague doing the same thing at the same
instant gets told so rather than silently losing.

---

## Background / Context

The brief asks for the view and for what must not be behind it:

> Recruiters see the full pipeline across all roles and candidates. A view showing candidate counts
> per stage per role, plus how long candidates have been sitting at their current stage (ageing).
> — §3.5

> A candidate cannot skip a stage without an explicit override. The override records who performed
> it, when, and why.
> — §3.1, §3.3

The walkthrough gives the two screens:

```
Dashboard                              Pipeline
Open Jobs: 8                           APPLIED   SCREEN   INTERVIEW   OFFER   HIRED
Total Applicants: 142                  John      Mike     Jane        Tom     Alex
Interviews: 24                         Sarah     David    Bob
Offers: 5
```

**One deviation from that sketch, stated openly.** The walkthrough's pipeline column shows candidate
_names_. `GET /api/pipeline` returns **counts and ageing only** — no names, no candidate array
(backend FR-7.9). That is deliberate on the backend's part: the board's payload is bounded by roles
rather than by people, which is what keeps it usable at 20 000 candidates. So this client renders
the board as **counts with ageing**, and the names live one click away on
`/candidates?roleId=…&stage=…`, which is paginated and owned by the candidate-access feature. The board
answers _where is this role stuck_; the drill-down answers _who_.

### Translation from the request

| Described                        | Built as                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A recruiter "Dashboard" nav item | A new `/dashboard` route; the recruiter's `ROLE_LANDING` moves from `/pipeline` to it                                           |
| The pipeline board               | The existing `/pipeline` stub, filled                                                                                           |
| "Recruiter can move candidates"  | A move control on the drill-down list, not drag-and-drop (D-4)                                                                  |
| "perform valid stage overrides"  | A `<Dialog>` with a required reason field                                                                                       |
| "Jobs" in the recruiter navbar   | The existing `/roles` route — the API's requisitions are this app's jobs, and renaming them would break the shipped roles views |

### Current state of `frontend/`

|                  | Today                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/pipeline`      | A **placeholder page** rendering only the signed-in user's name — and it is the recruiter's `ROLE_LANDING`, so a recruiter logging in lands on it                                          |
| `ROLE_LANDING`   | `{ RECRUITER: '/pipeline', INTERVIEWER: '/my-interviews', CANDIDATE: '/jobs' }` in [`features/auth/redirect.ts`](../../../src/features/auth/redirect.ts)                                   |
| Guards           | `<RequireRole allow={['RECRUITER']}>` already wraps `/pipeline` in its `layout.tsx`                                                                                                        |
| Nav              | `NAV_SECTIONS.RECRUITER` = Hiring (Pipeline, Roles) + Account (Profile)                                                                                                                    |
| Mutation pattern | `useRoleMutations.ts` — a shared `useWriteSuccess()` doing `setQueryData(detailKey)` + `invalidateQueries(LIST_KEY)` + a success `toast`. **No optimistic updates anywhere, deliberately** |
| Dialog pattern   | `RoleFormDialog.tsx` — `react-hook-form` + `zodResolver`, schema in `src/lib/schemas/`                                                                                                     |
| Stage labels     | `features/applications/labels.ts` — `STAGE_LABELS: Record<PipelineStage, string>` and `STATUS_LABELS`, plus tolerant accessors. **Candidate-facing copy** (`REJECTED` → "Not selected")    |
| Primitives       | No tabs, no popover, no tooltip, no calendar, no drag-and-drop library                                                                                                                     |

### Decisions carried from the interview

| #   | Question                            | Decision                                                                                                                                               |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | Where does a recruiter land?        | **`/dashboard`.** `/pipeline` becomes a destination rather than a doorway                                                                              |
| D-2 | Board or table?                     | **A column-per-stage board**, one card per role per stage, showing count and ageing                                                                    |
| D-3 | Are candidate names on the board?   | **No** — the API sends none. Names are one click away on `/candidates`                                                                                 |
| D-4 | Drag-and-drop?                      | **No.** No DnD library is vendored, and a drag that can fail with a `409` is a worse interaction than a menu. A **Move** menu on the drill-down list   |
| D-5 | Where do the legal moves come from? | **The API.** On a `409` the body carries `details.allowed`; the client renders from it and **never owns a copy of the stage graph**                    |
| D-6 | Recruiter-facing stage labels?      | **A separate map.** `features/applications/labels.ts` is candidate copy — "Not selected" is wrong on a recruiter's board, where the word is "Rejected" |
| D-7 | Override reason minimum?            | **10 characters**, mirroring the API, with the count shown live. The client check is UX; the `400` is the control                                      |
| D-8 | New dependency?                     | **None.** Card, Badge, Button, Dialog, Select, Textarea, Table and `lucide-react` cover it                                                             |

---

## Users / Actors

| Actor       | Sees                                            |
| ----------- | ----------------------------------------------- |
| Anonymous   | `/login` with `?next=`                          |
| Candidate   | The app's 404 on both routes                    |
| Interviewer | The app's 404 on both routes                    |
| Recruiter   | Dashboard, board, drill-down, move and override |

**Deliberate trade-offs:** an interviewer has no pipeline view at all — the backend answers `403`,
and a partial board would imply a scope they do not have. There is no hiring-manager role, so
"pipeline for my own roles" is served by the recruiter's unfiltered view.

---

## User Stories

| ID        | Story                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-01** | As a recruiter, I want a landing page with real numbers, so that logging in tells me something.                                              |
| **US-02** | As a recruiter, I want counts per stage per role, so that I can see which role is stuck.                                                     |
| **US-03** | As a recruiter, I want ageing on each cell, so that "eight in Screen" and "eight in Screen for three weeks" look different.                  |
| **US-04** | As a recruiter, I want to advance a candidate in one click.                                                                                  |
| **US-05** | As a recruiter, I want an illegal move to be impossible to attempt, so that I learn the process from the tool.                               |
| **US-06** | As a recruiter, I want to skip a stage by typing a reason, and to be told plainly that it is recorded.                                       |
| **US-07** | As a recruiter, I want to be told when a colleague moved the same candidate first, so that I do not believe a change landed when it did not. |
| **US-08** | As a recruiter, I want to click a stage cell and see who is in it.                                                                           |

---

## Functional Requirements

### FR-1 — Routes and navigation

- **FR-1.1** A new route `/dashboard`, in the `(app)` group, guarded by
  `<RequireRole allow={PIPELINE_USER_ROLES}>` where
  `PIPELINE_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER']`.
- **FR-1.2** `/pipeline` keeps its existing layout guard; its `page.tsx` is **replaced**, not added
  to.
- **FR-1.3** `ROLE_LANDING.RECRUITER` changes from `/pipeline` to `/dashboard` (D-1). Interviewer
  and candidate landings are unchanged.
- **FR-1.4** `NAV_SECTIONS.RECRUITER`'s **Hiring** section becomes, in order: **Dashboard,
  Pipeline, Roles**. Later features insert Candidates and Interviews after Roles; this feature adds
  Dashboard only.
- **FR-1.5** Active-state highlighting is prefix-based, as shipped, so `/pipeline?roleId=3` keeps
  Pipeline highlighted.

### FR-2 — The dashboard

- **FR-2.1** `/dashboard` renders a row of stat tiles from `GET /api/pipeline/summary`, plus a
  compact total-per-stage strip from `GET /api/pipeline`.
- **FR-2.2** Six tiles: **Open roles · Total applicants · Active · Offers · Hired · Rejected**.
  Each is a `<Card>` with a large number and a muted label.
- **FR-2.3** **No Interviews tile in this version.** The API does not send the field until the
  interviews feature ships (XBE-9); a tile rendering `undefined` as `0` states something false.
  The interviews feature adds it.
- **FR-2.4** The stage strip sums each stage across all roles, computed **from the `/api/pipeline`
  response the page already fetched** — not by a second endpoint and not by fetching candidates.
- **FR-2.5** Each tile and each stage in the strip is a link: tiles to `/pipeline`, stages to
  `/pipeline?stage=…`. A number nobody can act on is decoration.
- **FR-2.6** A fresh database with no data renders zeros and an explanatory empty line, not a broken
  layout.

### FR-3 — The board

- **FR-3.1** `/pipeline` renders one section per role. Each section has the role title, its status
  badge, a total-active count, and **four stage cards** in `STAGE_ORDER`: Applied, Screen,
  Interview, Offer.
- **FR-3.2** Stage order comes from the API's array order, which the backend guarantees is
  `STAGE_ORDER` and never alphabetical (XBE-6). **The client does not re-sort.**
- **FR-3.3** Every role carries all four stages, including zero-count ones — the API densifies
  (XBE-6). **The client never invents a missing stage**, because it never has to.
- **FR-3.4** A stage card shows: the stage label, the candidate count as the primary number, and an
  ageing line.
- **FR-3.5** The ageing line reads **"avg 4.2d · oldest 11d"**. When `candidateCount` is `0`, the
  API sends `null` for both, and the card renders **"—"** — **never "0 days"**, which would state
  something false (XBE-7).
- **FR-3.6** Ageing is **emphasised by a badge variant, not by a number alone**: `maxDaysInStage`
  over 14 renders the card's ageing line in a warning tone, over 30 in a destructive tone. Thresholds
  are two named constants in one file, so "what counts as stuck" is a single edit.
- **FR-3.7** A stage card with a non-zero count is a link to
  `/pipeline?roleId={id}&stage={stage}` — the drill-down (FR-4). A zero card is not a link.
- **FR-3.8** Filters, both in the URL: `roleId` and `stage`. `roleId` is a `<Select>` of roles;
  `stage` is a `<Select>` of the four stages.
- **FR-3.9** **The board is not paginated**, because the API is not (XBE-8). Its size is bounded by
  the number of roles.
- **FR-3.10** Roles with zero active applications in every stage still render, with four empty
  cards. A role that nobody has applied to is a fact a recruiter needs.

### FR-4 — The drill-down

- **FR-4.1** With `roleId` **and** `stage` both set, `/pipeline` renders — below the board — a list
  of the candidates in that cell, from `GET /api/candidates?roleId=…&stage=…&status=ACTIVE`.
- **FR-4.2** **That endpoint belongs to the candidate-access feature** and does not exist until it ships.
  Until then, the drill-down renders **"Candidate detail is not available yet."** and the stage
  cards do not link. This is the one place where this feature is knowingly incomplete, and it is
  stated rather than left to be discovered (Out of Scope).
- **FR-4.3** Each drill-down row shows the candidate's name, their time at the current stage, and a
  **Move** control.
- **FR-4.4** The list is paginated, since `GET /api/candidates` is (candidates XBE-9).

### FR-5 — Moving a candidate

- **FR-5.1** The **Move** control is a `<DropdownMenu>` with: **Advance to {next stage}**,
  **Mark hired**, **Mark rejected**, a separator, and **Override stage…**.
- **FR-5.2** **Advance** calls `PATCH /api/applications/:id/stage` with the single next stage. The
  client derives "next" from the API's returned `currentStage` and the **stage order the API's own
  board response gave it** — not from a hard-coded graph (D-5, XBE-2).
- **FR-5.3** **Mark hired** and **Mark rejected** call `PATCH /api/applications/:id/outcome`.
  Rejection opens a small dialog with an **optional** reason; hiring does not, because the API does
  not require one.
- **FR-5.4** **Mark hired** is offered **only** when the application is at `OFFER`. At any other
  stage the item is present but disabled with the muted hint **"Only from Offer."** — the affordance
  teaches the rule instead of hiding it.
- **FR-5.5** On `200`, a success toast — **"Moved to Interview."** — and the board and drill-down
  queries are invalidated. **No optimistic update**, matching every shipped mutation in this app.
- **FR-5.6** On `409 INVALID_STAGE_TRANSITION`, an error toast naming the reason, and the menu is
  rebuilt from `details.allowed` in the error body (D-5, XBE-2). **This client never hard-codes the
  stage graph**, and a grep for a transitions map in `features/pipeline/` must find nothing (FE-8).
- **FR-5.7** On `409 STAGE_CONFLICT`, an error toast — **"Someone else moved this candidate. The
  list has been refreshed."** — and the queries are invalidated **immediately** so the recruiter is
  looking at the true state before they act again (XBE-3).
- **FR-5.8** On `409 APPLICATION_NOT_ACTIVE`, an error toast — **"This application is already
  closed."** — and a refetch. The Move control disappears on the refreshed row, because the API's
  `status` is no longer `ACTIVE` (XBE-4).
- **FR-5.9** While a move is in flight, that row's Move control is disabled and shows a spinner.
  Other rows stay interactive.

### FR-6 — The override dialog

- **FR-6.1** **Override stage…** opens a `<Dialog>` with a **Target stage** `<Select>` and a
  **Reason** `<Textarea>`.
- **FR-6.2** The stage select offers **every stage except the current one** — the override is the
  escape hatch from the graph, and the API accepts any other stage, forwards or backwards
  (XBE-10).
- **FR-6.3** **Submit is disabled until the reason reaches 10 characters after trim** (D-7), with a
  live counter reading **"{n}/10 characters minimum"** below the field.
- **FR-6.4** The dialog carries a standing line, always visible, not a tooltip:
  **"This is recorded against your name and appears in the audit trail."** The brief requires the
  override be genuinely recorded, and a recruiter should know that before they type, not after.
- **FR-6.5** Validation is `react-hook-form` + `zodResolver` against a schema in
  `src/lib/schemas/pipeline.ts`, mirroring `RoleFormDialog`. **The client-side minimum is UX; the
  API's `400` is the control** (XBE-5).
- **FR-6.6** On `201`, the dialog closes, a success toast reads **"Stage overridden. Reason
  recorded."**, and the board and drill-down are invalidated.
- **FR-6.7** On `400` with `details.reason`, the message renders **under the Reason field** via the
  shipped `fieldMessage` helper, and **the dialog stays open with the typed text intact**. A failed
  request never discards what a recruiter wrote.
- **FR-6.8** On `409 STAGE_CONFLICT`, the dialog closes, the conflict toast of FR-5.7 shows, and the
  queries are invalidated — the target stage the recruiter chose may no longer make sense.
- **FR-6.9** While submitting, Submit reads **"Recording override…"** and both fields are disabled.

### FR-7 — Labels

- **FR-7.1** A new `features/pipeline/labels.ts` holds **recruiter-facing** copy:
  `PIPELINE_STAGE_LABELS: Record<PipelineStage, string>` and
  `PIPELINE_STATUS_LABELS: Record<ApplicationStatus, string>`.
- **FR-7.2** It is **separate from** `features/applications/labels.ts` (D-6), which is candidate
  copy: that map renders `REJECTED` as **"Not selected"**, which is the right word for a candidate
  and the wrong one for a recruiter's board, where it is **"Rejected"**.
- **FR-7.3** Both maps are `Record<Union, string>` — total, so a new enum value is a compile error
  rather than a blank cell.

### FR-8 — What this client must never do

- **FR-8.1** It must never own a copy of the stage-transition graph (D-5, FR-5.6).
- **FR-8.2** It must never render a candidate's email or phone. No response in this feature carries
  one (XBE-11); **if one ever appears, that is a backend bug to report, not a field to hide here.**
- **FR-8.3** It must never fetch a list of candidates to compute a count or an age. Both come from
  the aggregate.
- **FR-8.4** It must never treat the route guard as the access control (AZ-1).

---

## Frontend Requirements

### File structure

```
src/
  app/
    (app)/
      dashboard/
        layout.tsx                            NEW   — <RequireRole allow={PIPELINE_USER_ROLES}>
        page.tsx                              NEW   — <DashboardView />
      pipeline/
        page.tsx                              MOD   — placeholder replaced by <Suspense><PipelineView /></Suspense>
        layout.tsx                            —     — unchanged; already guards RECRUITER
      layout.tsx                              MOD   — Hiring section becomes Dashboard, Pipeline, Roles
  features/
    pipeline/
      api/pipeline.api.ts                     NEW   — getPipeline, getPipelineSummary, moveStage, overrideStage, setOutcome
      hooks/usePipelineQuery.ts               NEW   — usePipelineQuery, usePipelineSummaryQuery, key factories
      hooks/usePipelineMutations.ts           NEW   — useMoveStage, useOverrideStage, useSetOutcome
      components/DashboardView.tsx            NEW
      components/DashboardTiles.tsx           NEW   — FR-2.2
      components/DashboardStageStrip.tsx      NEW   — FR-2.4
      components/PipelineView.tsx             NEW   — filters + board + drill-down
      components/PipelineFilters.tsx          NEW
      components/PipelineRoleSection.tsx      NEW   — FR-3.1
      components/PipelineStageCard.tsx        NEW   — FR-3.4 – FR-3.7
      components/StageAgeingBadge.tsx         NEW   — FR-3.5, FR-3.6
      components/StageMoveMenu.tsx            NEW   — FR-5.1
      components/StageOverrideDialog.tsx      NEW   — FR-6
      components/OutcomeDialog.tsx            NEW   — FR-5.3
      labels.ts                               NEW   — FR-7
      permissions.ts                          NEW   — PIPELINE_USER_ROLES
      search-params.ts                        NEW   — parsePipelineSearchParams / buildPipelineHref
      ageing.ts                               NEW   — the two thresholds, FR-3.6
      types.ts                                NEW
  lib/
    schemas/pipeline.ts                       NEW   — overrideSchema, outcomeSchema
  features/auth/redirect.ts                   MOD   — ROLE_LANDING.RECRUITER → '/dashboard'
```

Primitives reused: `Card`, `Badge`, `Button`, `Dialog`, `DropdownMenu`, `Select`, `Textarea`,
`Table`, `Skeleton`, `Separator`. **No new primitive, no new dependency** (D-8).

### State matrix — `/dashboard`

| State           | Trigger                    | Renders                                                                                                                            |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Loading         | first fetch                | Six tile skeletons and a strip skeleton                                                                                            |
| Loaded          | both `200`                 | Six tiles + the stage strip, each linking into `/pipeline`                                                                         |
| Empty           | all counts zero            | Tiles showing `0` plus the line **"No applications yet. Open a role and share it to get started."**                                |
| Partial failure | summary `200`, board fails | Tiles render; the strip shows an inline **"Could not load stage totals."** with **Try again**. One failure does not blank the page |
| Both fail       | —                          | A single error card: **"Could not load the dashboard."** with **Try again**                                                        |

### State matrix — `/pipeline`

| State                  | Trigger                              | Renders                                                                               |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| Loading                | first fetch                          | Three role-section skeletons, each with four card placeholders                        |
| Loaded                 | `200` with roles                     | Filters + one section per role                                                        |
| Empty, no filters      | `roles: []`                          | **"No roles yet."** with a **Create a role** link to `/roles`                         |
| Empty, filtered        | `roles: []`, a filter set            | **"No candidates match these filters."** plus **Clear filters**                       |
| Filtered to one role   | `?roleId=3`                          | Only that section; the filter select shows the role title                             |
| Drill-down open        | `?roleId=3&stage=SCREEN`             | The board, then a candidate list below it, with the cell highlighted                  |
| Drill-down unavailable | candidate-access feature not shipped | **"Candidate detail is not available yet."** and the stage cards do not link (FR-4.2) |
| Error                  | non-2xx other than 401/403           | Inline error card: **"Could not load the pipeline."** with **Try again**              |

### State matrix — the Move menu

| State                          | Trigger      | Renders                                                                                                                |
| ------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Idle, at Applied               | —            | **Advance to Screen** · Mark hired _(disabled, "Only from Offer.")_ · Mark rejected · **Override stage…**              |
| Idle, at Offer                 | —            | Advance _(absent — no next stage)_ · **Mark hired** · Mark rejected · **Override stage…**                              |
| In flight                      | a move fired | The trigger is disabled and shows a spinner; other rows stay interactive                                               |
| `200`                          | —            | Toast **"Moved to Interview."**; board and list invalidated                                                            |
| `409 INVALID_STAGE_TRANSITION` | —            | Toast **"A candidate at Applied cannot move to Offer without an override."**; the menu rebuilds from `details.allowed` |
| `409 STAGE_CONFLICT`           | —            | Toast **"Someone else moved this candidate. The list has been refreshed."**; immediate invalidation                    |
| `409 APPLICATION_NOT_ACTIVE`   | —            | Toast **"This application is already closed."**; refetch; the control disappears from the refreshed row                |

### State matrix — the override dialog

| State                        | Trigger                     | Renders                                                                                                                                                                   |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open                         | **Override stage…** clicked | Target-stage select (current stage absent), empty Reason, Submit **disabled**, the standing line **"This is recorded against your name and appears in the audit trail."** |
| Reason too short             | < 10 chars after trim       | Submit stays disabled; counter reads **"4/10 characters minimum"**                                                                                                        |
| Reason valid                 | ≥ 10 chars                  | Submit enabled                                                                                                                                                            |
| Submitting                   | request in flight           | Submit reads **"Recording override…"**, both fields disabled                                                                                                              |
| `201`                        | —                           | Dialog closes; toast **"Stage overridden. Reason recorded."**; queries invalidated                                                                                        |
| `400` `details.reason`       | —                           | Message under the Reason field; **dialog stays open, text intact**                                                                                                        |
| `409 STAGE_CONFLICT`         | —                           | Dialog closes; the conflict toast; queries invalidated                                                                                                                    |
| `409 APPLICATION_NOT_ACTIVE` | —                           | Dialog closes; toast **"This application is already closed."**                                                                                                            |

### Other frontend rules

- **FE-1** `PipelineView` is the only component reading `useSearchParams()`, and `page.tsx` wraps it
  in `<Suspense>` — **without which `next build` fails**.
- **FE-2** All calls go through `features/pipeline/api/pipeline.api.ts`. Five exported functions,
  one per endpoint, and no more — an exported wrapper for an endpoint with no UI is how a removed
  feature comes back by accident.
- **FE-3** Query keys: `pipelineKey(params) = ['pipeline', 'board', params]`,
  `PIPELINE_SUMMARY_KEY = ['pipeline', 'summary']`, and the prefix
  `PIPELINE_BOARD_KEY = ['pipeline', 'board']` for invalidation.
- **FE-4** Every mutation invalidates **both** `PIPELINE_BOARD_KEY` and `PIPELINE_SUMMARY_KEY`, plus
  the candidates list key once that feature ships. A move changes a count on both screens.
- **FE-5** Invalidation is `onSettled`, **not** `onSuccess` — matching the shipped `useApplyMutation`
  — so a `409` also corrects a stale view rather than leaving the recruiter looking at what they
  thought was true.
- **FE-6** **No optimistic updates**, matching every shipped mutation. A stage move can fail three
  distinct ways, and an optimistic board would show all three as a flicker.
- **FE-7** Success → toast; failure → a toast for a menu action, an **inline message** for a dialog
  field error (FR-6.7). A form error belongs next to the field that caused it.
- **FE-8** **There is no stage-transition map in `features/pipeline/`.** `STAGE_ORDER` for _display_
  comes from the API's array order (FR-3.2); _legality_ comes from the API's `details.allowed`
  (FR-5.6). Verified by grep (AC-F31).
- **FE-9** `ageing.ts` exports `AGEING_WARN_DAYS = 14` and `AGEING_ALERT_DAYS = 30`, and the badge
  component is the only consumer.
- **FE-10** The board is a CSS grid: four columns at `lg`, two at `md`, one below. **No horizontal
  scroll on a phone**, per the layout rule this app follows everywhere.
- **FE-11** Types are mirrored by hand in `features/pipeline/types.ts`; nothing is imported across
  repos. `PipelineStage` and `ApplicationStatus` already exist in
  [`features/applications/types.ts`](../../../src/features/applications/types.ts) and are
  **re-exported**, not redeclared — two declarations of one union eventually disagree.

---

## Backend Requirements

The guarantees this client depends on. If any changes, this spec breaks. Source:
[../../../../backend/specs/features/pipeline/spec.md](../../../../backend/specs/features/pipeline/spec.md).

- **XBE-1** All five endpoints are **recruiter-only**; every other role gets `403`.
- **XBE-2** `409 INVALID_STAGE_TRANSITION` carries `details: { toStage: [...], allowed: [stage, …] }`.
  **The client renders the legal moves from `allowed` and owns no copy of the graph** (FR-5.6,
  FE-8).
- **XBE-3** `409 STAGE_CONFLICT` means _someone else moved this candidate_. Its remedy is refetch,
  not retry-as-is, and it is a **different code** from `INVALID_STAGE_TRANSITION` precisely so the
  client can say the right thing.
- **XBE-4** `409 APPLICATION_NOT_ACTIVE` means the application is `HIRED` or `REJECTED`. Terminal.
- **XBE-5** The override endpoint rejects a missing or short `reason` with `400` and
  `details.reason`. The client's own minimum is UX; this is the control.
- **XBE-6** `GET /api/pipeline` is **densified**: every role carries all four stages, in
  `STAGE_ORDER`, including zero-count ones. The client renders the array directly.
- **XBE-7** `avgDaysInStage` and `maxDaysInStage` are `number | null`, and `null` **exactly when**
  `candidateCount` is `0`. Formatting `null` as `0 days` would state something false.
- **XBE-8** `GET /api/pipeline` is **unpaginated** and returns **no candidate names** — only counts
  and ageing. The board is not a candidate list; names come from `GET /api/candidates`.
- **XBE-9** `GET /api/pipeline/summary` has **no `interviews` key** in this version. The interviews
  feature adds it; until then the client must not render a tile for a field the API does not send
  (FR-2.3).
- **XBE-10** The override endpoint accepts **any `PipelineStage` other than the current one**,
  forwards or backwards. `toStage === currentStage` is a `400`.
- **XBE-11** **No response from any endpoint in this feature contains a candidate's `email`,
  `phone` or `name`.** The only `name` any of them returns is `override.performedBy.name`, which is
  a recruiter's. **If a candidate contact field ever appears, that is a backend bug to report, not a
  field to hide client-side.**
- **XBE-12** Every successful write returns the updated application as
  `{ application: { id, status, currentStage, stageEnteredAt, role: { id, title } } }` — enough to
  update a row without a refetch, though this client invalidates instead (FE-6).

---

## API Contract

| Call                                        | When                                                     | Sends                                         | Expects                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /api/pipeline`                         | `/pipeline` mounts; a filter changes; after any mutation | `roleId`, `stage` — omitted at their defaults | `200 { roles }` · `400` · `403`                                                                              |
| `GET /api/pipeline/summary`                 | `/dashboard` mounts; after any mutation                  | —                                             | `200 { summary }` · `403`                                                                                    |
| `PATCH /api/applications/:id/stage`         | **Advance** clicked                                      | `{ toStage }`                                 | `200 { application }` · `409 INVALID_STAGE_TRANSITION` · `409 STAGE_CONFLICT` · `409 APPLICATION_NOT_ACTIVE` |
| `POST /api/applications/:id/stage-override` | Override dialog submitted                                | `{ toStage, reason }`                         | `201 { application, override }` · `400` · `409`                                                              |
| `PATCH /api/applications/:id/outcome`       | **Mark hired** / **Mark rejected**                       | `{ status, reason? }`                         | `200 { application }` · `409 INVALID_STAGE_TRANSITION` · `409`                                               |
| `GET /api/candidates`                       | drill-down opens _(candidate-access feature)_            | `roleId`, `stage`, `status=ACTIVE`, `page`    | `200 { candidates, pagination }`                                                                             |

### Client-side rules

- **API-1** Every call goes through `apiFetch`. No component calls `fetch` directly.
- **API-2** Every call is wrapped in `features/pipeline/api/pipeline.api.ts`; no component assembles
  a path.
- **API-3** Query strings use `URLSearchParams`, with parameters omitted at their defaults so the
  request matches the URL the recruiter sees.
- **API-4** Error codes are read with `errorBodyOf(error)?.code`, **never by matching on the
  message copy** — the shipped `error-details.ts` helper exists for this.
- **API-5** `details.allowed` is read from the same error body. It is the only source of stage
  legality in this client (FE-8).
- **API-6** The drill-down's `GET /api/candidates` call is imported from the **candidates**
  feature's api module once it exists. This feature does not declare a second wrapper for it.

---

## Data Model Changes

Client state only.

| State                             | Where it lives                                               | Lifetime                            | Persisted?              |
| --------------------------------- | ------------------------------------------------------------ | ----------------------------------- | ----------------------- |
| `roleId`, `stage`, `page`         | The URL                                                      | Until navigation                    | **In the URL only**     |
| Board and summary data            | TanStack Query cache                                         | Until invalidated or the tab closes | **Never** — memory only |
| Override dialog fields            | `react-hook-form` state                                      | Until the dialog closes             | **Never**               |
| Which row's mutation is in flight | The mutation's own `isPending` plus the row id in `useState` | Until settled                       | **Never**               |

- **DM-1** No token, name, email or role is written to `localStorage`, `sessionStorage` or a cookie.
- **DM-2** **No override reason is written to browser storage**, not even as a draft. It is a
  recruiter's statement about a person's process and it belongs on the server or nowhere.
- **DM-3** No optimistic cache writes (FE-6).

---

## Authentication / Authorization

**This matrix is UX, not a control.** Every row describes what renders; the backend re-authorizes
every request behind it.

| Route        | Anonymous                  | Candidate | Interviewer | Recruiter |
| ------------ | -------------------------- | --------- | ----------- | --------- |
| `/dashboard` | → `/login?next=/dashboard` | app 404   | app 404     | ✅        |
| `/pipeline`  | → `/login?next=/pipeline`  | app 404   | app 404     | ✅        |

- **AZ-1** **None of the above is a security control.** `<RequireAuth>` and `<RequireRole>` decide
  what renders; the `403` from all five endpoints is what protects them.
- **AZ-2** The Dashboard and Pipeline nav links render for recruiters only, from `NAV_SECTIONS` — a
  lookup table, not a permission check.
- **AZ-3** A disallowed role reaching either route gets `<NotFoundView />`, not `/forbidden`.
- **AZ-4** Disabling **Mark hired** outside `OFFER` (FR-5.4) is **UX**. The API returns
  `409 INVALID_STAGE_TRANSITION` regardless, and that is what enforces it.
- **AZ-5** The override dialog's 10-character minimum is **UX**. The API's `400` is the control
  (XBE-5).
- **AZ-6** Changing `ROLE_LANDING` (FR-1.3) changes where a recruiter is sent, not what they may
  reach. Every route keeps its own guard.

---

## Validation

### `overrideSchema` — new, in [`lib/schemas/pipeline.ts`](../../../src/lib/schemas/pipeline.ts)

| Field     | Rule                                             | Message                                                                                       |
| --------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `toStage` | one of the four `PipelineStage` values, required | **"Choose a target stage."**                                                                  |
| `reason`  | trimmed, 10–1000 characters, required            | **"Give a reason of at least 10 characters."** / **"Keep the reason under 1000 characters."** |

### `outcomeSchema`

| Field    | Rule                            | Message                                      |
| -------- | ------------------------------- | -------------------------------------------- |
| `status` | `HIRED` or `REJECTED`           | — (set by the menu item, never typed)        |
| `reason` | trimmed, max 1000, **optional** | **"Keep the reason under 1000 characters."** |

- **VAL-1** Both schemas mirror the API's rules exactly (XBE-5). **The client validates for the
  recruiter's benefit; the API validates for correctness.** Neither substitutes for the other.
- **VAL-2** The override's minimum is enforced on `trim()`, so ten spaces do not satisfy it — the
  same rule the API applies.
- **VAL-3** The target-stage select never offers the current stage (FR-6.2), so the API's
  `toStage === currentStage` `400` is unreachable through the UI and is handled anyway.
- **VAL-4** URL parameters are **sanitised, not forwarded**: `?stage=BANANA&roleId=-1` renders the
  unfiltered board, matching `parseRolesSearchParams`.
- **VAL-5** The outcome reason is optional, matching the API (XBE re: pipeline FR-3.6). The dialog
  says **"Optional"** beside the label rather than leaving a recruiter guessing.

---

## Error Handling

| Status / `code`                | Where           | UI behaviour                                                                                                 |
| ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `401`                          | any call        | `apiFetch` refreshes once and replays; a second `401` redirects to `/login?next=…`                           |
| `403`                          | any call        | `apiFetch` redirects to `/forbidden`. Unreachable through the UI; handled                                    |
| `400 VALIDATION_ERROR`         | override dialog | `details.reason` renders **under the field**; the dialog stays open with the text intact (FR-6.7)            |
| `409 INVALID_STAGE_TRANSITION` | move / outcome  | Error toast; the menu rebuilds from `details.allowed` (FR-5.6)                                               |
| `409 STAGE_CONFLICT`           | any write       | Toast **"Someone else moved this candidate. The list has been refreshed."**; immediate invalidation (FR-5.7) |
| `409 APPLICATION_NOT_ACTIVE`   | any write       | Toast **"This application is already closed."**; refetch; the control disappears (FR-5.8)                    |
| `404`                          | any write       | Toast **"That application no longer exists."**; refetch                                                      |
| `500` / network                | reads           | Inline error card with **Try again**                                                                         |
| `500` / network                | writes          | Error toast; **the dialog and its text are left as they were**                                               |

- **ERR-1** A **query** failure renders an inline error state with a retry. A **mutation** failure
  raises a toast and leaves the form or menu as it was — **the recruiter's input is never discarded
  by a failed request.**
- **ERR-2** The three `409`s have three distinct messages, because they have three distinct remedies
  — _this move is not allowed_, _refetch and look again_, _this is over_. Collapsing them would make
  the message wrong two times in three (XBE-3).
- **ERR-3** Codes are read from `errorBodyOf(error)?.code`, never from the message string (API-4).
- **ERR-4** A partial dashboard failure degrades one panel, not the page (dashboard state matrix).

---

## Edge Cases

| ID        | Case                                                                                          | Behaviour                                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **EC-01** | A role has no applications at all                                                             | Its section renders with four zero cards, each showing `—` for ageing (FR-3.5, FR-3.10)                                                 |
| **EC-02** | A stage has `candidateCount: 0`                                                               | Ageing renders `—`, **never "0 days"**, and the card is not a link (FR-3.5, FR-3.7, XBE-7)                                              |
| **EC-03** | A candidate entered a stage one minute ago                                                    | `avgDaysInStage` is `0.0` and renders **"avg 0d"**. Zero means _no time_; `—` means _no candidates_                                     |
| **EC-04** | `maxDaysInStage` is 35                                                                        | The ageing line renders in the destructive tone (FR-3.6, `AGEING_ALERT_DAYS`)                                                           |
| **EC-05** | Two recruiters advance the same candidate at the same instant                                 | One sees the success toast; the other sees the conflict toast and a refreshed list showing the true stage (FR-5.7, XBE-3)               |
| **EC-06** | A recruiter opens the override dialog, and a colleague moves the candidate before they submit | `409 STAGE_CONFLICT`; the dialog closes, the conflict toast shows, queries invalidate (FR-6.8)                                          |
| **EC-07** | **Mark hired** at `SCREEN`                                                                    | The item is disabled with **"Only from Offer."** If fired anyway via the API, the `409` toast names the allowed outcomes (FR-5.4, AZ-4) |
| **EC-08** | An override reason of ten spaces                                                              | Submit stays disabled — the check is on `trim()` (VAL-2)                                                                                |
| **EC-09** | The API rejects a reason the client accepted                                                  | The message renders under the field and the dialog stays open with the text (FR-6.7, ERR-1)                                             |
| **EC-10** | `?stage=BANANA&roleId=-1` from a stale bookmark                                               | The unfiltered board renders; neither parameter is sent (VAL-4)                                                                         |
| **EC-11** | A `CLOSED` role with live applications                                                        | It appears on the board with its counts and a `CLOSED` status badge. Hiding it is how people get forgotten (backend AZ-6)               |
| **EC-12** | The interviews feature has not shipped                                                        | No Interviews tile renders. The summary's six keys are all that are read (FR-2.3, XBE-9)                                                |
| **EC-13** | The candidate-access feature has not shipped                                                  | Stage cards do not link, and the drill-down area shows **"Candidate detail is not available yet."** (FR-4.2)                            |
| **EC-14** | A recruiter's session expires mid-move                                                        | One `401`, one refresh, one replay. On a second `401`, redirect to `/login?next=/pipeline`                                              |
| **EC-15** | 200 roles on the board                                                                        | All render; the response is bounded by roles, not candidates, and the grid scrolls vertically (XBE-8, FR-3.9)                           |
| **EC-16** | A move succeeds while the dashboard is in another tab                                         | That tab is stale until it refetches on focus. Accepted — the two tabs do not share a query client                                      |
| **EC-17** | A recruiter logs in for the first time after this ships                                       | They land on `/dashboard`, not `/pipeline` (FR-1.3)                                                                                     |

---

## Security Requirements

- **SEC-1** Route guards and nav entries are **UX**. The `403` on all five endpoints is the control
  (AZ-1).
- **SEC-2** **This client renders no candidate contact field in this feature**, because no response
  carries one (XBE-11). There is no conditional hiding of such a field anywhere in
  `features/pipeline/`, and a grep for `email` in that folder must find nothing (AC-F33).
- **SEC-3** **No override reason is written to browser storage** (DM-2), not even as an unsent
  draft.
- **SEC-4** An override reason and a role title are rendered as **text nodes**. No
  `dangerouslySetInnerHTML` appears in this feature.
- **SEC-5** Disabled menu items and the client-side reason minimum are **affordances, not
  controls** (AZ-4, AZ-5). Both are re-checked by the API, and AC-M02 proves it from the console.
- **SEC-6** The client owns no copy of the stage graph (FE-8), so it cannot disagree with the
  server about what is legal — which is a correctness property as much as a security one.
- **SEC-7** **Known accepted gaps.** (a) Board and summary data stay in the query cache until the
  tab closes, so a shared machine shows the last-viewed pipeline after a `Back`; the session
  redirect on `401` is what bounds it. (b) There is no client throttle on the write endpoints — a
  recruiter can fire moves as fast as they can click, and the server accepts them. (c) An override
  reason is sent in the request body over whatever transport is configured; on localhost that is
  plain HTTP. All three are accepted for a localhost POC.

---

## Performance Requirements

- **PERF-1** `/dashboard` issues **exactly two** requests on mount: `GET /api/pipeline/summary` and
  `GET /api/pipeline`. The stage strip is computed from the second, **never from a third call and
  never from fetching candidates** (FR-2.4, FR-8.3).
- **PERF-2** `/pipeline` issues **exactly one** request on mount, and **exactly one** per filter
  change. There is no per-role and no per-stage call.
- **PERF-3** A successful move issues **exactly three** requests: the `PATCH`, and the two
  invalidation refetches (board + summary). **No optimistic write, no manual `setQueryData`** (FE-6).
- **PERF-4** A failed move issues the same three — invalidation is `onSettled` (FE-5), so a `409`
  also corrects the stale view.
- **PERF-5** **No polling anywhere.** Refetching happens on mount, on a filter change, on a
  mutation settling, and on window focus (TanStack's default).
- **PERF-6** The board renders 200 role sections — 800 cards — without virtualisation, under 400 ms
  on a mid-range laptop. Cards are cheap; if this is ever exceeded, the fix is pagination on the API
  side, which the backend's PERF-5 names at 500 roles.
- **PERF-7** `placeholderData: (previous) => previous` on the board query, so a filter change keeps
  the previous board visible rather than flashing a skeleton.
- **PERF-8** The label maps and the ageing thresholds are module-level constants, not rebuilt per
  render.

---

## Acceptance Criteria

Verified by hand, in the browser, with DevTools open. Roles: **R** = recruiter, **I** = interviewer,
**C** = candidate, all seeded by `npm run db:seed`.

`AC-F*` are functional checks driven through the UI. `AC-M*` additionally require a running backend
and a seeded database.

### Routes and navigation

- **AC-F01** — **Given** a fresh login as R, **when** the redirect settles, **then** the browser is
  at **`/dashboard`**, not `/pipeline` (FR-1.3, EC-17).
- **AC-F02** — **Given** R, **when** the sidebar is read, **then** the Hiring section lists
  **Dashboard, Pipeline, Roles** in that order (FR-1.4).
- **AC-F03** — **Given** I, **when** `/pipeline` is typed into the address bar, **then** the app's
  404 renders and the Network tab shows **no** `/api/pipeline` request (AZ-3).
- **AC-F04** — **Given** C, **when** `/dashboard` is opened, **then** the app's 404 renders
  (AZ-3).
- **AC-F05** — **Given** no session, **when** `/pipeline` is opened, **then** the browser lands on
  `/login?next=%2Fpipeline` (AZ-1).

### Dashboard

- **AC-F06** — **Given** R on a seeded database, **when** `/dashboard` loads, **then** six tiles
  render — Open roles, Total applicants, Active, Offers, Hired, Rejected (FR-2.2).
- **AC-F07** — **Given** the same, **when** the tiles are read, **then** there is **no Interviews
  tile** (FR-2.3, XBE-9, EC-12).
- **AC-F08** — **Given** the same, **when** the Network tab is read, **then** there are **exactly
  two** requests: `/api/pipeline/summary` and `/api/pipeline` (PERF-1).
- **AC-F09** — **Given** the stage strip, **when** a stage is clicked, **then** the browser
  navigates to `/pipeline?stage=…` and the board filters to it (FR-2.5).
- **AC-F10** — **Given** the summary API is stopped but the board API responds, **when**
  `/dashboard` loads, **then** an error card renders in the tiles area **and the stage strip still
  renders** (ERR-4).

### The board

- **AC-F11** — **Given** R, **when** `/pipeline` loads, **then** each role section shows **four**
  stage cards in the order Applied, Screen, Interview, Offer (FR-3.1, FR-3.2).
- **AC-F12** — **Given** a role with no applications, **when** its section renders, **then** four
  cards show `0` and their ageing lines read **`—`** (EC-01, EC-02).
- **AC-F13** — **Given** a stage card with `candidateCount: 0`, **when** it is clicked, **then**
  nothing navigates — it is not a link (FR-3.7).
- **AC-F14** — **Given** a cell whose `maxDaysInStage` exceeds 30 (backdate one via `psql`), **when**
  the card renders, **then** its ageing line is in the destructive tone (FR-3.6, EC-04).
- **AC-F15** — **Given** the board, **when** the DOM is inspected, **then** **no** candidate name
  appears anywhere on it (XBE-8, D-3).
- **AC-F16** — **Given** `?roleId=<id>`, **when** the page loads, **then** only that role's section
  renders and the filter select shows its title (FR-3.8).
- **AC-F17** — **Given** `?stage=BANANA&roleId=-1`, **when** the page loads, **then** the unfiltered
  board renders and the request carries **neither** parameter (VAL-4, EC-10).
- **AC-F18** — **Given** a filter change, **when** the Network tab is read, **then** **exactly one**
  request fires and the previous board stays visible during it (PERF-2, PERF-7).
- **AC-F19** — **Given** a `CLOSED` role with live applications, **when** the board renders, **then**
  it appears with a `CLOSED` badge and its counts (EC-11).

### Moving

- **AC-F20** — **Given** an application at Applied in the drill-down, **when** the Move menu is
  opened, **then** it offers **Advance to Screen**, a **disabled Mark hired** with
  **"Only from Offer."**, **Mark rejected**, and **Override stage…** (FR-5.1, FR-5.4).
- **AC-F21** — **Given** that menu, **when** **Advance to Screen** is clicked, **then** a success
  toast **"Moved to Screen."** shows and the board count updates (FR-5.5).
- **AC-F22** — **Given** the same, **when** the Network tab is read, **then** **exactly three**
  requests fired: the `PATCH`, and the board and summary refetches — **no optimistic write**
  (PERF-3, FE-6).
- **AC-F23** — **Given** an application at Offer, **when** the menu is opened, **then**
  **Mark hired** is **enabled** and there is no Advance item (FR-5.4).
- **AC-F24** — **Given** a move in flight, **when** the row is inspected, **then** its control is
  disabled with a spinner and **other rows remain interactive** (FR-5.9).

### Overrides

- **AC-F25** — **Given** an application at Applied, **when** **Override stage…** is clicked, **then**
  the dialog opens with **Applied absent** from the target-stage select, Submit **disabled**, and
  the standing line **"This is recorded against your name and appears in the audit trail."**
  (FR-6.2, FR-6.3, FR-6.4).
- **AC-F26** — **Given** the dialog, **when** four characters are typed, **then** the counter reads
  **"4/10 characters minimum"** and Submit is still disabled (FR-6.3).
- **AC-F27** — **Given** the dialog, **when** ten spaces are typed, **then** Submit stays disabled
  (VAL-2, EC-08).
- **AC-F28** — **Given** a valid reason and a target stage, **when** Submit is pressed, **then**
  Submit reads **"Recording override…"**, then the dialog closes and a toast reads **"Stage
  overridden. Reason recorded."** (FR-6.6, FR-6.9).
- **AC-F29** — **Given** a `400` forced by intercepting the request, **when** it returns, **then**
  the message renders **under the Reason field**, the dialog **stays open**, and the typed text is
  **intact** (FR-6.7, ERR-1, EC-09).

### Structure

- **AC-F30** — **Given** the repository, **when** `grep -rn "useSearchParams" src/features/pipeline/`
  is run, **then** the only match is in `PipelineView.tsx`, and `pipeline/page.tsx` wraps it in
  `<Suspense>` (FE-1).
- **AC-F31** — **Given** the repository, **when**
  `grep -rniE "APPLIED.*SCREEN|allowedTransitions|STAGE_GRAPH" src/features/pipeline/` is run,
  **then** **no transition map is found** — only display labels and the API's own arrays (FE-8,
  FR-8.1, SEC-6).
- **AC-F32** — **Given** the repository, **when** `features/pipeline/labels.ts` is read, **then**
  `REJECTED` maps to **"Rejected"**, distinct from `features/applications/labels.ts`, which maps it
  to **"Not selected"** (FR-7.2, D-6).
- **AC-F33** — **Given** the repository, **when** `grep -rniE "email|phone" src/features/pipeline/`
  is run, **then** it returns **nothing** (SEC-2, FR-8.2).

### Cross-cutting invariants

- **AC-M01** — **Given** a full session as R across the dashboard, the board and every mutation,
  **when** every response body in the Network tab is searched, **then** the strings `"email"` and
  `"phone"` appear **zero** times, and **no candidate name** appears in any `/api/pipeline` response.
  _Verified in the payload, not the DOM_ (XBE-11, XBE-8, SEC-2).
- **AC-M02** — **Given** an **interviewer** session, **when**
  `fetch('<API>/api/pipeline', …)` and
  `fetch('<API>/api/applications/1/stage', { method: 'PATCH', … })` are issued **by hand from the
  DevTools console**, **then** both are **`403`**. _This is the criterion that proves neither the
  hidden nav links nor the route guard is what is protecting the endpoints_ (AZ-1, SEC-1, XBE-1).
- **AC-M03** — **Given** an R session, **when** an override with a **1-character reason** is fired
  **by hand from the console**, bypassing the disabled Submit, **then** the response is **`400`**
  with `details.reason`. _This proves the disabled button is not the control_ (AZ-5, SEC-5, XBE-5).
- **AC-M04** — **Given** an R session at Applied, **when** a move to `OFFER` is fired **by hand from
  the console**, **then** the response is **`409 INVALID_STAGE_TRANSITION`** carrying
  `details.allowed` (XBE-2, SEC-6).
- **AC-M05** — **Given** two browser windows both showing the same candidate at Applied, **when**
  both press **Advance** at the same moment, **then** one shows the success toast and the other
  shows **"Someone else moved this candidate. The list has been refreshed."** — and after both
  settle, **both windows show the same stage** (EC-05, FR-5.7, XBE-3).
- **AC-M06** — **Given** a full R session, **when** `localStorage`, `sessionStorage` and
  `document.cookie` are read in the console at the end, **then** none contains a token, a name, an
  email, **or an override reason** (DM-1, DM-2, SEC-3).
- **AC-M07** — **Given** an R session with an expired access token, **when** a move is fired,
  **then** the Network tab shows one `401`, one `POST /api/auth/refresh`, and one successful replay
  (EC-14).

---

## Out of Scope

| Excluded                                    | Why                                                                                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate names on the board                | The API sends none, deliberately — the board's payload is bounded by roles, not people (XBE-8, D-3). Names are one click away on `/candidates`                  |
| **The drill-down candidate list itself**    | It calls `GET /api/candidates`, owned by the candidate-access feature. Until that ships, FR-4.2's placeholder renders. Stated here rather than discovered later |
| Drag-and-drop between columns               | D-4. No DnD library is vendored, and a drag that can fail three ways is a worse interaction than a menu                                                         |
| Bulk moves                                  | Multiplies the conflict surface for a convenience nobody asked for                                                                                              |
| An Interviews dashboard tile                | The API does not send the field yet; the interviews feature adds it (FR-2.3)                                                                                    |
| A "stuck beyond N days" alert view          | Brief §8 optional work. `maxDaysInStage` is the input such a view would need, and it is already rendered                                                        |
| Un-rejecting or reopening a candidate       | The API has no such path — terminal is terminal                                                                                                                 |
| Charts or trend lines                       | The brief asks for counts and ageing. A chart is a different question                                                                                           |
| Per-role ownership or a hiring-manager view | Optional in the brief (§2) and absent from the requirements this pass covers                                                                                    |
| Polling or live board updates               | PERF-5. The conflict toast handles the case that matters — two people acting at once                                                                            |

---

## Dependencies

**Blocked by:**
[../../../../backend/specs/features/pipeline/spec.md](../../../../backend/specs/features/pipeline/spec.md).
**Nothing here can be verified until that ships.**

**Partially blocked by:** [../candidate-access/spec.md](../candidate-access/spec.md) — the drill-down list
(FR-4) calls `GET /api/candidates`. The board, the dashboard, moves and overrides all work without
it; only the "who is in this cell" list waits.

**Blocks:** [../interviews/spec.md](../interviews/spec.md) — which revises FR-2.3 to add the
Interviews tile. [../candidate-access/spec.md](../candidate-access/spec.md) — which links back into
`/pipeline?roleId=`.

**New npm dependencies:** **none.** `Card`, `Badge`, `Button`, `Dialog`, `DropdownMenu`, `Select`,
`Textarea`, `Table`, `Skeleton` and `Separator` are already vendored in
[`src/components/ui/`](../../../src/components/ui/), and `react-hook-form` + `@hookform/resolvers`

- `zod` + `sonner` already ship.

**Environment variables:** none.

**Modified existing files**

| Path                                                                            | Change                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`src/app/(app)/pipeline/page.tsx`](<../../../src/app/(app)/pipeline/page.tsx>) | The placeholder is **replaced** by the board                                  |
| [`src/app/(app)/layout.tsx`](<../../../src/app/(app)/layout.tsx>)               | Hiring section becomes Dashboard, Pipeline, Roles                             |
| [`src/features/auth/redirect.ts`](../../../src/features/auth/redirect.ts)       | `ROLE_LANDING.RECRUITER` → `/dashboard`                                       |
| [`CLAUDE.md`](../../../CLAUDE.md)                                               | Feature table row; the "Views this POC needs" pipeline bullet now points here |

**Framework note.** **This is Next.js 16; its APIs differ from older versions.** `PipelineView` reads
`useSearchParams()`, so `pipeline/page.tsx` **must** wrap it in `<Suspense>` or `next build` fails
(FE-1). Route `params` are a Promise in this version; neither route here has a dynamic segment, but
the rule holds for the features that follow. `LayoutProps<'/dashboard'>` and `PageProps<'/pipeline'>`
are globally generated and are the types the new files use.

**External dependencies:** none.

**Cross-repo:** a change to the five endpoints, the three `409` codes, the densified board shape, or
the summary's field list must be made in **both** specs — see
[../../../../backend/specs/features/pipeline/spec.md](../../../../backend/specs/features/pipeline/spec.md).

---

## Revisions

Recorded during implementation, per this repo's rule that a spec proven wrong is corrected rather
than left to drift from the code.

### R-1 — FR-5 and FR-6 ship built but unreachable

The Move menu, the override dialog and the outcome dialog are **implemented in full** —
`StageMoveMenu.tsx`, `StageOverrideDialog.tsx`, `OutcomeDialog.tsx`, wired to all three write
endpoints with the three `409` messages, the reason counter and the field-level `400` handling.

**They have no mount point.** Their only surface is a drill-down row, and the drill-down calls
`GET /api/candidates`, which belongs to the candidate-access feature and does not exist yet
(FR-4.2). The board shows counts, not people, so there is no other row in this feature to hang a
Move control on.

The spec already conceded this ("the one place where this feature is knowingly incomplete") but
listed FR-5 and FR-6 as in scope anyway. Both readings are now true and the consequence is stated:
**AC-F20 through AC-F29, and AC-M03 through AC-M05 via the UI, cannot be walked until
candidate-access ships.** What candidate-access has to do is render rows and pass each one's
`application` plus `role.stages.map(cell => cell.stage)` into `<StageMoveMenu />`, and flip
`DRILL_DOWN_AVAILABLE` in `PipelineView.tsx` from `false` to `true`. The console-driven halves of
AC-M03–M05 are verifiable today against the backend, and were.

### R-2 — AC-F31 and AC-F33 have benign grep hits

Both criteria are greps, and both now return lines. Neither is the thing they were written to catch,
so they are recorded rather than "fixed" by contorting the code around a regex.

- **AC-F31** (`APPLIED.*SCREEN|allowedTransitions|STAGE_GRAPH`) hits two lines: a prose sentence in
  `PipelineRoleSection.tsx` explaining why the board never re-sorts, and
  `const STAGES: ReadonlyArray<PipelineStage> = ['APPLIED', 'SCREEN', 'INTERVIEW', 'OFFER']` in
  `search-params.ts`. **That array is display order, not a transition graph**: it exists so the
  stage filter has options and so `?stage=BANANA` can be rejected before a request, exactly as
  `AUDIT_ACTIONS` does in the audit feature. What the criterion was actually written to forbid — a
  map saying which move is legal from where — **does not exist**, and legality is read only from
  `details.allowed` in `StageMoveMenu.tsx`.
- **AC-F33** (`email|phone`) hits two prose comments: "phone scrolls vertically" in a layout note,
  and "no email or phone anywhere in this feature's types" in `types.ts`. **No type, no component
  and no request in `features/pipeline/` names either field**, which is the property the criterion
  is for.

Both criteria should be re-worded against what they mean rather than loosened.
