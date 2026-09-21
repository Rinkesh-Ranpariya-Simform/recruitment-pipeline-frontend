# Interviews — Rounds, Panels and My Interviews (Frontend)

> **Status:** Draft — awaiting approval. `plan.md` is a later artifact and does not exist yet.
> **Feature slug:** `interviews`
> **Scope:** `frontend/` — Next.js 16 App Router, React 19, TanStack Query
> **Counterpart:** [../../../../backend/specs/features/interviews/spec.md](../../../../backend/specs/features/interviews/spec.md)
> **Depends on:** [../authentication/spec.md](../authentication/spec.md) · [../roles/spec.md](../roles/spec.md) — implemented · [../pipeline/spec.md](../pipeline/spec.md) — must ship first
> **Revises:** [../pipeline/spec.md](../pipeline/spec.md) FR-2.3 — the dashboard gains an Interviews tile
> **Blocked by:** the backend counterpart. **Nothing here can be verified until that ships.**
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md) §3.2

---

## Goal

1. Replace the interviewer's empty landing page with **My Interviews** — the rounds they are
   assigned to, and nothing else.
2. Give recruiters a way to **schedule a round** against an application and **build a panel** on it.
3. Build the interviewer's screens so that they render **only what their payload carries** — which
   is a name, a role title and a round. There is no contact field to conditionally hide, because
   none arrives.
4. Handle a `404` on a round the interviewer is not assigned to as an ordinary not-found, since
   that is genuinely all the client can know.

Success means: a recruiter schedules a Technical round and assigns two interviewers; each of them
opens My Interviews and sees exactly that round; and a third interviewer who pastes the round's URL
gets the app's not-found view, because the API told them the round does not exist.

---

## Background / Context

> An interviewer can view and act on only the candidates and rounds they are assigned to — this is
> the core hard case of this POC.
> — §3.2

The walkthrough gives both sides:

```
Interviewer — My Interviews             Recruiter — Candidate Details
Candidate    Role              Round    Interviews:
John Smith   Backend Engineer  Technical  Technical Interview
Jane Doe     Frontend Eng.     System D.    ├── Interviewer A
                                            └── Interviewer B
```

and is explicit about what must not be on the interviewer's screen:

> Importantly, email/phone should **not be sent to the interviewer at all**, because the POC
> explicitly requires candidate contact details to be recruiter-only.

That is a backend obligation this client depends on (XBE-10) — and the reason this spec declares
**two separate TypeScript interfaces** rather than one with optional contact fields. An optional
field invites a component to render it; a type that has no such field cannot.

### Translation from the request

| Described | Built as |
|---|---|
| Interviewer navbar: "My Interviews" | The existing `/my-interviews` stub, filled |
| Recruiter navbar: "Interviews" | A new `/interviews` route — the same API endpoint, the recruiter's projection |
| "Interview Details" with a Submit Feedback button | `/interviews/[interviewId]`, shared by both roles with two different views. The feedback form itself is the feedback feature |
| "Assign interviewer" | A `<Dialog>` on the recruiter's round detail, sourcing its picker from the shipped `GET /api/users` |

## Revision to the pipeline spec — the dashboard gains an Interviews tile

**What changes:** [../pipeline/spec.md](../pipeline/spec.md) FR-2.3 states there is no Interviews
tile because the API does not send the field. It sends it now. `/dashboard` renders a **seventh
tile**, *Interviews*, from `summary.interviews` — the count of scheduled rounds — linking to
`/interviews`.

**What this reverses:** pipeline FR-2.3, pipeline XBE-9, and pipeline AC-F07, which asserted the
tile's absence.

**Why it is being overridden:** the walkthrough's dashboard has four headline tiles and *Interviews*
is one of them. It was deferred purely on build order.

**What makes it safe:** one additional key on a response the page already fetches. No new request,
no new authorization surface.

**What it costs, named plainly:** the pipeline spec's tile count changes from six to seven, and its
AC-F07 inverts. Both are edited in the same pass rather than left to contradict each other.

**What must change alongside this spec:** pipeline FR-2.2 (seven tiles), FR-2.3 (replaced by this
revision), XBE-9 (inverted), AC-F06 and AC-F07. The backend counterpart is revised in the same pass.

### Current state of `frontend/`

|                | Today |
| -------------- | ------ |
| `/my-interviews` | A **placeholder page** rendering the signed-in user's name — and it is the interviewer's `ROLE_LANDING`, so an interviewer logging in lands on it |
| Guards | `<RequireRole allow={['INTERVIEWER']}>` already wraps `/my-interviews` in its `layout.tsx` |
| Nav | Interviewer sees **My interviews** + Profile. Recruiter sees Dashboard, Pipeline, Roles (after the pipeline feature) |
| `GET /api/users` | Shipped, recruiter-gated, returns **interviewers only**. **It has had no frontend caller** — this feature is its first |
| Primitives | **No calendar or date-picker component is vendored.** `Input type="datetime-local"` is the option available |
| Dialog pattern | `RoleFormDialog.tsx` — `react-hook-form` + `zodResolver`, schema in `src/lib/schemas/` |

### Decisions carried from the interview

| # | Question | Decision |
|---|---|---|
| D-1 | One detail route or two? | **One route, `/interviews/[interviewId]`, two views.** The API returns two shapes by role; the route renders `<RecruiterInterviewDetail>` or `<InterviewerInterviewDetail>` by role. **Not one component with conditional fields** |
| D-2 | Two types or one with optionals? | **Two interfaces.** `InterviewerInterview` has no `email`, no `assignments`. A type with `assignments?` is a component away from rendering a panel to someone who was not sent one |
| D-3 | Where does a recruiter schedule a round? | On the **candidate detail page** (candidate-access feature) and on the recruiter's `/interviews` list. Both call the same dialog |
| D-4 | Date input? | **`Input type="datetime-local"`.** No calendar primitive is vendored and adding a date library for one field is not worth it |
| D-5 | Past dates? | **Allowed**, matching the API. Backfilling a round that already happened is normal (XBE-9) |
| D-6 | Where does the interviewer picker get its list? | **`GET /api/users`**, which returns interviewers only. Already-assigned people are disabled in it — UX, with the `409` as the control |
| D-7 | Does the interviewer see their panel colleagues? | **No.** Their payload carries no `assignments` (XBE-3). They learn who else wrote what from the **feedback** list, which is the feedback feature |
| D-8 | New dependency? | **None** |

---

## Users / Actors

| Actor | Sees |
|---|---|
| Anonymous | `/login` with `?next=` |
| Candidate | The app's 404 on every route here |
| Interviewer | `/my-interviews` and `/interviews/[id]` **for assigned rounds only** — name, role title, round, no panel, no contact |
| Recruiter | `/interviews`, any round's detail with its panel, scheduling and assignment |

**Deliberate trade-offs:** an interviewer sees neither their panel colleagues (D-7) nor the
candidate's other rounds. A candidate has no interview surface at all — the walkthrough gives them
Jobs and My Applications.

---

## User Stories

| ID | Story |
|---|---|
| **US-01** | As an interviewer, I want my own list of rounds on login, so that I know what I am doing this week. |
| **US-02** | As an interviewer, I want the round's detail to tell me who and for what, so that I can prepare. |
| **US-03** | As an interviewer, I want no way to reach a round I am not on, so that the boundary is the system's. |
| **US-04** | As a recruiter, I want to schedule a typed round against an application. |
| **US-05** | As a recruiter, I want to put two interviewers on one round, so that a panel is representable. |
| **US-06** | As a recruiter, I want a duplicate assignment refused clearly, so that a double-click is not a mystery. |
| **US-07** | As a recruiter, I want to remove an interviewer, so that a reassignment is possible. |
| **US-08** | As a recruiter, I want an Interviews count on my dashboard, so that the tile the walkthrough shows is there. |

---

## Functional Requirements

### FR-1 — Routes and navigation

- **FR-1.1** `/my-interviews` keeps its existing `<RequireRole allow={['INTERVIEWER']}>` layout; its
  `page.tsx` is **replaced**.
- **FR-1.2** A new route `/interviews`, guarded by
  `<RequireRole allow={INTERVIEWS_RECRUITER_ROLES}>` where that constant is `['RECRUITER']`.
- **FR-1.3** A new route `/interviews/[interviewId]`, guarded by
  `<RequireRole allow={INTERVIEW_DETAIL_ROLES}>` where that constant is
  `['RECRUITER', 'INTERVIEWER']` — **both roles reach the route; the API decides what each sees**
  (XBE-2).
- **FR-1.4** `NAV_SECTIONS.RECRUITER`'s Hiring section gains **Interviews** after Roles.
  `NAV_SECTIONS.INTERVIEWER` is **unchanged** — an interviewer's entry point stays My interviews.
- **FR-1.5** `ROLE_LANDING.INTERVIEWER` stays `/my-interviews`. It is no longer a placeholder.

### FR-2 — My Interviews

- **FR-2.1** `/my-interviews` renders a table of the signed-in interviewer's rounds from
  `GET /api/interviews`, newest first, paginated.
- **FR-2.2** Columns: **Candidate · Role · Round · When · Status**, matching the walkthrough.
- **FR-2.3** **Candidate** renders `interview.candidate.name` — the only candidate field the payload
  carries (XBE-3). There is no email column, no phone column, and **no conditional that could add
  one**.
- **FR-2.4** **Round** renders a type label from `INTERVIEW_TYPE_LABELS: Record<InterviewType,
  string>` — a total map, so a new backend type is a compile error.
- **FR-2.5** **When** renders an absolute date and time, with a relative hint. Past rounds are
  normal (D-5) and are not styled as errors.
- **FR-2.6** **Status** renders a `<Badge>`: `SCHEDULED` neutral, `COMPLETED` secondary,
  `CANCELLED` **destructive** — a cancelled round must be visibly cancelled, not quietly listed
  (XBE-6).
- **FR-2.7** A `?status=` filter, in the URL, so an interviewer can hide completed rounds. Default:
  no filter, everything.
- **FR-2.8** Each row links to `/interviews/{id}`.
- **FR-2.9** An empty list renders **"You have no interviews assigned."** with the sub-line
  **"A recruiter will assign you to interview rounds. They will appear here."** — an interviewer
  with nothing to do should not wonder whether the page is broken.

### FR-3 — The interviewer's round detail

- **FR-3.1** `/interviews/[interviewId]` renders `<InterviewerInterviewDetail>` for an interviewer.
- **FR-3.2** It shows: the candidate's **name**, the role **title**, the round type, the stage the
  round is for, the scheduled time, and the status.
- **FR-3.3** **It renders nothing else about the candidate**, because the payload carries nothing
  else (XBE-3). The component receives an `InterviewerInterview`, a type with **no `email`, no
  `phone`, no `assignments`** (D-2) — so there is no field to hide and no branch that could reveal
  one.
- **FR-3.4** It shows **no panel list** (D-7, XBE-4). The interviewer learns who else contributed
  from the feedback list, which the feedback feature renders on this same page.
- **FR-3.5** A `CANCELLED` round renders a prominent banner — **"This interview was cancelled."** —
  above everything else.
- **FR-3.6** The feedback form and list are mounted here by the **feedback** feature. This spec
  leaves a named slot and specifies nothing about them.
- **FR-3.7** A `404` — whether the round does not exist or the interviewer is not assigned —
  renders `<NotFoundView />`. **The client cannot and must not distinguish the two** (XBE-5).

### FR-4 — The recruiter's list

- **FR-4.1** `/interviews` renders a table of every round, paginated, newest first.
- **FR-4.2** Columns: **Candidate · Role · Round · When · Status · Panel**.
- **FR-4.3** **Panel** renders the assigned interviewers' names as `<Badge>`s from
  `interview.assignments`, or **"Unassigned"** in a warning tone when empty — a scheduled round with
  nobody on it is the thing a recruiter most needs to see.
- **FR-4.4** Filters in the URL: `status`, `roleId`, `applicationId`.
- **FR-4.5** Each row links to `/interviews/{id}`.

### FR-5 — The recruiter's round detail

- **FR-5.1** `<RecruiterInterviewDetail>` shows everything the interviewer's view shows, plus the
  application's stage and status, a link to the candidate, and the **panel**.
- **FR-5.2** The panel is a list of assigned interviewers, each with a **Remove** action, plus an
  **Assign interviewer** button.
- **FR-5.3** A status control offers **Mark completed** and **Cancel interview**. Both call
  `PATCH /api/interviews/:id`. **Cancel asks for confirmation** in a `<Dialog>`, saying that
  assignments and feedback are kept (XBE-7).
- **FR-5.4** Once a round is `COMPLETED` or `CANCELLED`, both status actions are hidden — the API
  answers `409 INVALID_STAGE_TRANSITION`, and offering an action that always fails is worse than
  offering none.
- **FR-5.5** The feedback **list** is mounted here by the feedback feature. A recruiter sees
  feedback but has no form; that is the feedback feature's rule and this spec does not restate it as
  a control.

### FR-6 — Scheduling a round

- **FR-6.1** A `<Dialog>` with **Type** (`<Select>`), **Stage** (`<Select>`), and **Date and time**
  (`<Input type="datetime-local">` — D-4).
- **FR-6.2** It is opened from the recruiter's `/interviews` list and from the candidate detail page
  (D-3). **One component, two call sites** — a second copy is a second place for the validation to
  drift.
- **FR-6.3** **Stage defaults to the application's current stage** but is freely changeable: the API
  does not require them to match, because a recruiter routinely schedules ahead (XBE-8).
- **FR-6.4** Past dates are **accepted without warning** (D-5, XBE-9). A confirmation prompt for a
  normal action is noise.
- **FR-6.5** On `201`, the dialog closes, a toast reads **"Interview scheduled."**, and the
  interviews and candidate queries are invalidated.
- **FR-6.6** On `409 APPLICATION_NOT_ACTIVE`, a toast reads **"This application is closed. Reopen
  it before scheduling."** and the dialog closes.
- **FR-6.7** The dialog is only reachable where the application's `status` is `ACTIVE`. That is
  **UX**; the `409` is the control.

### FR-7 — Assigning a panel

- **FR-7.1** **Assign interviewer** opens a `<Dialog>` with a `<Select>` of interviewers from
  `GET /api/users` (D-6) — the shipped recruiter-gated endpoint that returns interviewers only, and
  which this feature gives its first caller.
- **FR-7.2** Interviewers already on the round are **disabled** in the select with the suffix
  **"— already assigned"**. That is UX; `409 ALREADY_ASSIGNED` is the control (XBE-11).
- **FR-7.3** On `201`, the dialog closes, a toast reads **"{name} assigned."**, and the detail query
  is invalidated.
- **FR-7.4** On `409 ALREADY_ASSIGNED`, a toast reads **"That interviewer is already on this
  round."** and the detail is invalidated — the disabled state was evidently stale.
- **FR-7.5** On `400 NOT_AN_INTERVIEWER`, a toast reads **"That user cannot be assigned as an
  interviewer."** This should be unreachable, since the picker's source returns interviewers only
  (XBE-12) — and it is handled, because an unreachable error is the one worth having.
- **FR-7.6** **Remove** calls `DELETE …/assignments/:userId` behind a confirmation dialog, whose
  body states: **"They will lose access to this candidate immediately. Feedback they have already
  submitted is kept."** Both halves are true and both are surprising (XBE-13).
- **FR-7.7** On `204`, a toast reads **"{name} removed."** and the detail is invalidated. The api
  wrapper is typed `Promise<void>`, matching the shipped `deleteRole` — `apiFetch` resolves a `204`
  to `''` (XBE-14).
- **FR-7.8** On `404` from a remove, a toast reads **"That interviewer is no longer on this
  round."** and the detail is invalidated.

### FR-8 — The dashboard revision

- **FR-8.1** `/dashboard` gains a seventh tile, **Interviews**, from `summary.interviews`, linking
  to `/interviews`. See the Revision section above.
- **FR-8.2** Pipeline FR-2.3 and XBE-9 are superseded; pipeline AC-F07 inverts.

### FR-9 — What this client must never do

- **FR-9.1** It must never declare a type with an optional contact field on an interviewer-facing
  shape (D-2, FE-4).
- **FR-9.2** It must never render a panel list on the interviewer's view (FR-3.4).
- **FR-9.3** It must never distinguish "not found" from "not assigned" — the API does not, and
  guessing would undo the point (FR-3.7).
- **FR-9.4** It must never treat a route guard as the access control (AZ-1).

---

## Frontend Requirements

### File structure

```
src/
  app/
    (app)/
      my-interviews/
        page.tsx                              MOD   — placeholder replaced by <Suspense><MyInterviewsView /></Suspense>
        layout.tsx                            —     — unchanged; already guards INTERVIEWER
      interviews/
        layout.tsx                            NEW   — <RequireRole allow={INTERVIEW_DETAIL_ROLES}>
        page.tsx                              NEW   — <RequireRole allow={INTERVIEWS_RECRUITER_ROLES}><InterviewsListView/>
        [interviewId]/page.tsx                NEW   — role-dispatched detail
      layout.tsx                              MOD   — Hiring section gains Interviews
      dashboard/page.tsx                      MOD   — the seventh tile (FR-8.1)
  features/
    interviews/
      api/interviews.api.ts                   NEW   — listInterviews, getInterview, createInterview,
                                                      updateInterviewStatus, assignInterviewer, unassignInterviewer
      api/users.api.ts                        NEW   — listInterviewers() → GET /api/users (its first caller)
      hooks/useInterviewsQuery.ts             NEW   — useInterviewsQuery, useInterviewQuery, key factories
      hooks/useInterviewMutations.ts          NEW
      hooks/useInterviewersQuery.ts           NEW
      components/MyInterviewsView.tsx         NEW   — FR-2
      components/InterviewsListView.tsx       NEW   — FR-4
      components/InterviewsTable.tsx          NEW
      components/InterviewerInterviewDetail.tsx  NEW — FR-3
      components/RecruiterInterviewDetail.tsx    NEW — FR-5
      components/InterviewPanel.tsx           NEW   — FR-7
      components/ScheduleInterviewDialog.tsx  NEW   — FR-6
      components/AssignInterviewerDialog.tsx  NEW   — FR-7.1
      components/InterviewStatusBadge.tsx     NEW   — FR-2.6
      components/InterviewNotFound.tsx        NEW   — FR-3.7
      labels.ts                               NEW   — INTERVIEW_TYPE_LABELS, INTERVIEW_STATUS_LABELS
      permissions.ts                          NEW   — INTERVIEWS_RECRUITER_ROLES, INTERVIEW_DETAIL_ROLES
      search-params.ts                        NEW
      types.ts                                NEW   — TWO detail interfaces (FE-4)
  lib/
    schemas/interview.ts                      NEW   — scheduleInterviewSchema, assignInterviewerSchema
```

Primitives reused: `Table`, `Card`, `Badge`, `Button`, `Dialog`, `Select`, `Input`, `Skeleton`,
`Separator`, `DropdownMenu`. **No new primitive, no new dependency** (D-8).

### State matrix — `/my-interviews`

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Loading | first fetch | A 6-row skeleton table |
| Loaded | `200` with rows | The table; each row links to the detail |
| Empty | `200`, `total: 0` | **"You have no interviews assigned."** + **"A recruiter will assign you to interview rounds. They will appear here."** |
| Empty, filtered | `?status=COMPLETED`, none | **"No interviews match this filter."** + **Clear filter** |
| Cancelled row present | `status: CANCELLED` | A destructive badge on that row; the row is still listed and still clickable (XBE-6) |
| Error | non-2xx other than 401/403 | Inline error card **"Could not load your interviews."** + **Try again** |

### State matrix — `/interviews/[interviewId]`, interviewer

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Loading | first fetch | A detail skeleton |
| Loaded, assigned | `200` | Candidate **name**, role title, round type, stage, time, status. **No panel, no contact fields** (FR-3.3) |
| Cancelled | `status: CANCELLED` | A banner **"This interview was cancelled."** above the detail |
| `404` | not found **or** not assigned | `<NotFoundView />` — **indistinguishable, deliberately** (FR-3.7, XBE-5) |
| Error | `500` / network | Inline error card + **Try again** |

### State matrix — `/interviews/[interviewId]`, recruiter

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Loaded | `200` | The interviewer's fields plus application stage/status, a candidate link, the panel, and status actions |
| Unassigned panel | `assignments: []` | **"No interviewers assigned yet."** in a warning tone, plus **Assign interviewer** |
| Terminal round | `COMPLETED` / `CANCELLED` | Status actions hidden; the panel stays read-write (FR-5.4) |
| `404` | no such round | `<NotFoundView />` |

### State matrix — Schedule interview dialog

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Open | **Schedule interview** clicked | Type select (no default), Stage select **defaulted to the application's current stage**, empty datetime, Submit disabled |
| Incomplete | any field empty | Submit disabled; field messages on blur |
| Past date entered | — | **Accepted with no warning** (FR-6.4, D-5) |
| Submitting | in flight | Submit reads **"Scheduling…"**, fields disabled |
| `201` | — | Dialog closes; toast **"Interview scheduled."**; queries invalidated |
| `400` | — | Field messages via `fieldMessage`; **dialog stays open, values intact** |
| `409 APPLICATION_NOT_ACTIVE` | — | Dialog closes; toast **"This application is closed. Reopen it before scheduling."** |

### State matrix — Assign interviewer dialog

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Open | **Assign interviewer** clicked | A select of interviewers; already-assigned ones **disabled** with **"— already assigned"** |
| Loading the list | `GET /api/users` in flight | The select is disabled with placeholder **"Loading interviewers…"** |
| No interviewers exist | `users: []` | **"No interviewer accounts exist yet."**; Submit disabled |
| Submitting | in flight | Submit reads **"Assigning…"** |
| `201` | — | Dialog closes; toast **"{name} assigned."**; detail invalidated |
| `409 ALREADY_ASSIGNED` | — | Toast **"That interviewer is already on this round."**; detail invalidated |
| `400 NOT_AN_INTERVIEWER` | — | Toast **"That user cannot be assigned as an interviewer."** |

### State matrix — Remove interviewer

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Confirm | **Remove** clicked | Dialog: **"Remove {name} from this interview?"** and the body **"They will lose access to this candidate immediately. Feedback they have already submitted is kept."** |
| Submitting | in flight | Confirm reads **"Removing…"** |
| `204` | — | Dialog closes; toast **"{name} removed."**; detail invalidated |
| `404` | — | Toast **"That interviewer is no longer on this round."**; detail invalidated |

### Other frontend rules

- **FE-1** `MyInterviewsView` and `InterviewsListView` are the only components reading
  `useSearchParams()`; both pages wrap them in `<Suspense>` — **without which `next build` fails**.
- **FE-2** All calls go through `features/interviews/api/`. `users.api.ts` is separate because
  `GET /api/users` is not an interviews endpoint — it is a shipped endpoint this feature happens to
  be the first to call.
- **FE-3** Query keys: `interviewsListKey(params) = ['interviews', 'list', params]`,
  `interviewDetailKey(id) = ['interviews', 'detail', id]`,
  `INTERVIEWS_LIST_KEY = ['interviews', 'list']`, `INTERVIEWERS_KEY = ['users', 'interviewers']`.
- **FE-4** **`types.ts` declares two detail interfaces, not one with optional fields** (D-2, FR-9.1):

  ```ts
  // Everything the API sends an assigned interviewer. There is no email here,
  // no phone, and no assignments array — the payload has none (XBE-3).
  export interface InterviewerInterview {
    id: number;
    type: InterviewType;
    stage: PipelineStage;
    scheduledAt: string;
    status: InterviewStatus;
    role: { id: number; title: string };
    candidate: { id: number; name: string };
  }

  export interface RecruiterInterview {
    id: number;
    type: InterviewType;
    stage: PipelineStage;
    scheduledAt: string;
    status: InterviewStatus;
    application: {
      id: number;
      currentStage: PipelineStage;
      status: ApplicationStatus;
      role: { id: number; title: string };
      candidate: { id: number; name: string };
    };
    assignments: Array<{ id: number; interviewer: { id: number; name: string } }>;
  }
  ```

  A single interface with `assignments?` would be one `&&` away from rendering a panel to someone
  the API did not send one to.
- **FE-5** `[interviewId]/page.tsx` dispatches on `useAuth().role` to one of the two components
  (D-1). **Neither component takes the other's type**, so a mistaken dispatch is a compile error
  rather than a leak.
- **FE-6** `INTERVIEW_TYPE_LABELS` and `INTERVIEW_STATUS_LABELS` are `Record<Union, string>` — total
  maps, so a new backend value is a compile error (FR-2.4).
- **FE-7** Mutations share a `useWriteSuccess()` doing `invalidateQueries` + a success toast,
  matching `useRoleMutations`. Invalidation is `onSettled`, not `onSuccess`, so a `409` also
  corrects a stale view.
- **FE-8** **No optimistic updates**, matching every shipped mutation.
- **FE-9** `unassignInterviewer` is typed `Promise<void>` (FR-7.7).
- **FE-10** `parseInterviewId` mirrors the shipped `parseRoleId`, and `useInterviewQuery` sets
  `enabled: interviewId !== null` and `retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2`
  — matching `useJobQuery`, so a `404` is not retried.
- **FE-11** Next.js 16 makes route `params` a **Promise**. `[interviewId]/page.tsx` awaits it and
  passes the raw segment through to `parseInterviewId` — see the Framework note.

---

## Backend Requirements

The guarantees this client depends on. If any changes, this spec breaks. Source:
[../../../../backend/specs/features/interviews/spec.md](../../../../backend/specs/features/interviews/spec.md).

- **XBE-1** Creation, the per-application list, status changes, assignment and unassignment are
  **recruiter-only**; every other role gets `403`.
- **XBE-2** `GET /api/interviews` and `GET /api/interviews/:id` serve **both** roles and return
  **two different shapes**, chosen by the caller's role. This is why FE-4 declares two interfaces.
- **XBE-3** An interviewer's row or detail carries `candidate: { id, name }` and **no `email`, no
  `phone`**. **If either ever appears, that is a backend bug to report, not a field to hide
  client-side.**
- **XBE-4** An interviewer's payload carries **no `assignments` array** (FR-3.4).
- **XBE-5** `GET /api/interviews/:id` for an unassigned interviewer is **`404`, not `403`**, and the
  body is byte-identical to a round that does not exist. The client cannot distinguish them and must
  not try (FR-3.7).
- **XBE-6** `InterviewStatus` includes `CANCELLED`, and a cancelled round **still appears** in an
  assigned interviewer's list.
- **XBE-7** Cancelling a round does **not** delete its assignments or feedback (FR-5.3).
- **XBE-8** `Interview.stage` need **not** equal the application's `currentStage`. A round scheduled
  ahead is normal (FR-6.3).
- **XBE-9** `scheduledAt` may be in the **past**; there is no `.min(now)` on the API (FR-6.4).
- **XBE-10** `InterviewType` and `InterviewStatus` are stable enum strings; the client's label maps
  are keyed on them.
- **XBE-11** `409 ALREADY_ASSIGNED` is the duplicate-assignment answer. The disabled option in the
  picker is UX; this is the control.
- **XBE-12** `400 NOT_AN_INTERVIEWER` means the chosen user does not exist or is not an
  interviewer — the **same** response either way, so it reveals nothing about which.
- **XBE-13** Unassignment revokes read access **immediately**, on the interviewer's next request,
  and **does not delete feedback they already submitted**. Both facts go in the confirmation copy
  (FR-7.6).
- **XBE-14** `DELETE …/assignments/:userId` answers `204` with an **empty body**; `apiFetch`
  resolves it to `''` (FR-7.7).
- **XBE-15** `GET /api/pipeline/summary` now carries `interviews` (FR-8.1). This supersedes pipeline
  XBE-9.
- **XBE-16** `GET /api/users` is shipped, recruiter-gated, and returns **interviewers only** — which
  is why the picker cannot normally produce a `NOT_AN_INTERVIEWER`.

---

## API Contract

| Call | When | Sends | Expects |
|---|---|---|---|
| `GET /api/interviews` | `/my-interviews` or `/interviews` mounts; a filter or page changes | `status`, `roleId`, `applicationId`, `page` — omitted at defaults | `200 { interviews, pagination }` · `400` · `403` |
| `GET /api/interviews/:id` | detail mounts | — | `200 { interview }` · `404` |
| `POST /api/applications/:id/interviews` | Schedule submitted | `{ type, stage, scheduledAt }` | `201 { interview }` · `400` · `409 APPLICATION_NOT_ACTIVE` |
| `PATCH /api/interviews/:id` | Mark completed / Cancel | `{ status }` | `200 { interview }` · `409 INVALID_STAGE_TRANSITION` |
| `POST /api/interviews/:id/assignments` | Assign submitted | `{ interviewerId }` | `201 { assignment }` · `400 NOT_AN_INTERVIEWER` · `409 ALREADY_ASSIGNED` |
| `DELETE /api/interviews/:id/assignments/:userId` | Remove confirmed | — | `204` · `404` |
| `GET /api/users` | Assign dialog opens | — | `200 { users }` · `403` |

### Client-side rules

- **API-1** Every call goes through `apiFetch`.
- **API-2** Every call is wrapped in `features/interviews/api/`; no component assembles a path.
- **API-3** Query strings use `URLSearchParams`, parameters omitted at their defaults.
- **API-4** Error codes are read with `errorBodyOf(error)?.code`, never by matching message copy.
- **API-5** `GET /api/users` is fetched **only when the assign dialog opens** — `enabled` is bound
  to the dialog's open state, so an unopened dialog costs nothing.
- **API-6** `unassignInterviewer` is typed `Promise<void>`; `apiFetch` resolves the `204` to `''`
  (XBE-14).

---

## Data Model Changes

Client state only.

| State | Where it lives | Lifetime | Persisted? |
|---|---|---|---|
| `status`, `roleId`, `applicationId`, `page` | The URL | Until navigation | **In the URL only** |
| Interview list and detail | TanStack Query cache | Until invalidated or the tab closes | **Never** — memory only |
| The interviewer list for the picker | Query cache, `['users','interviewers']` | Until the tab closes | **Never** |
| Dialog form fields | `react-hook-form` state | Until the dialog closes | **Never** |

- **DM-1** No token, name, email or role is written to `localStorage`, `sessionStorage` or a cookie.
- **DM-2** **No candidate data is persisted anywhere on the client.**
- **DM-3** No optimistic cache writes (FE-8).

---

## Authentication / Authorization

**This matrix is UX, not a control.** Every row describes what renders; the backend re-authorizes
every request behind it.

| Route | Anonymous | Candidate | Interviewer | Recruiter |
|---|---|---|---|---|
| `/my-interviews` | → `/login?next=…` | app 404 | ✅ | app 404 |
| `/interviews` | → `/login?next=…` | app 404 | app 404 | ✅ |
| `/interviews/[id]` | → `/login?next=…` | app 404 | ✅ **assigned only → app 404** | ✅ |

- **AZ-1** **None of the above is a security control.** `<RequireAuth>` and `<RequireRole>` decide
  what renders; the API's `403` and `404` are what protect the data.
- **AZ-2** `/interviews/[id]` admits **both** privileged roles at the route (FR-1.3). **The scoping
  is the API's**, and the client's not-found view is a rendering of the API's answer, not a decision
  of its own.
- **AZ-3** An interviewer reaching an unassigned round's URL gets `<NotFoundView />` **because the
  API returned `404`** — not because the client checked anything (FR-3.7, XBE-5).
- **AZ-4** Disabling already-assigned options in the picker (FR-7.2) is **UX**;
  `409 ALREADY_ASSIGNED` is the control.
- **AZ-5** Hiding status actions on a terminal round (FR-5.4) is **UX**;
  `409 INVALID_STAGE_TRANSITION` is the control.
- **AZ-6** The Interviews nav link renders for recruiters only, from `NAV_SECTIONS` — a lookup
  table, not a permission check.
- **AZ-7** **The interviewer's components cannot render a contact field**, because their prop type
  has none (FE-4). This is stronger than a guard: it is a compile-time property, not a runtime
  branch.

---

## Validation

### `scheduleInterviewSchema` — new, in [`lib/schemas/interview.ts`](../../../src/lib/schemas/interview.ts)

| Field | Rule | Message |
|---|---|---|
| `type` | one of the five `InterviewType` values, required | **"Choose an interview type."** |
| `stage` | one of the four `PipelineStage` values, required | **"Choose the stage this round is for."** |
| `scheduledAt` | a valid datetime, required. **No minimum** | **"Choose a date and time."** |

### `assignInterviewerSchema`

| Field | Rule | Message |
|---|---|---|
| `interviewerId` | positive integer, required | **"Choose an interviewer."** |

- **VAL-1** `scheduledAt` carries **no `.min(new Date())`** (D-5, XBE-9). Backfilling a round that
  already happened is a normal thing to do, and a client-side minimum the API does not share would
  block a legitimate action.
- **VAL-2** `datetime-local` produces a local-time string with no zone. The client converts to an
  ISO UTC string **before** sending — a round scheduled for 9:30 must not arrive as 09:30Z from a
  browser in IST.
- **VAL-3** URL parameters are **sanitised, not forwarded**: `?status=BANANA&page=-2` renders the
  unfiltered first page.
- **VAL-4** Client validation mirrors the API and substitutes for none of it. Every rule above is
  re-checked server-side.

---

## Error Handling

| Status / `code` | Where | UI behaviour |
|---|---|---|
| `401` | any call | `apiFetch` refreshes once and replays; a second `401` redirects to `/login?next=…` |
| `403` | any call | `apiFetch` redirects to `/forbidden`. Unreachable through the UI; handled |
| `404` | detail | `<NotFoundView />`. **Not retried** (FE-10). Covers both "no such round" and "not assigned" (FR-3.7) |
| `400 VALIDATION_ERROR` | schedule dialog | Field messages via `fieldMessage`; **dialog stays open, values intact** |
| `400 NOT_AN_INTERVIEWER` | assign | Toast **"That user cannot be assigned as an interviewer."** |
| `409 ALREADY_ASSIGNED` | assign | Toast **"That interviewer is already on this round."**; detail invalidated |
| `409 APPLICATION_NOT_ACTIVE` | schedule | Toast **"This application is closed. Reopen it before scheduling."**; dialog closes |
| `409 INVALID_STAGE_TRANSITION` | status change | Toast **"This interview is already closed."**; detail invalidated |
| `404` | remove assignment | Toast **"That interviewer is no longer on this round."**; detail invalidated |
| `500` / network | reads | Inline error card + **Try again** |
| `500` / network | writes | Error toast; **the dialog and its values are left as they were** |

- **ERR-1** A **query** failure renders an inline error state with a retry. A **mutation** failure
  raises a toast and leaves the form as it was — **the recruiter's input is never discarded by a
  failed request.**
- **ERR-2** **A `404` on the detail is never presented as a permission problem.** No copy anywhere
  in this feature says "you are not assigned to this interview", because the client does not know
  that and saying it would leak what the API deliberately withheld (FR-9.3, XBE-5).
- **ERR-3** Codes are read from `errorBodyOf(error)?.code`, never the message string.

---

## Edge Cases

| ID | Case | Behaviour |
|---|---|---|
| **EC-01** | An interviewer pastes the URL of a round they are not on | `<NotFoundView />`, identical to a nonexistent id. **No copy suggests a permission problem** (FR-3.7, ERR-2, XBE-5) |
| **EC-02** | An interviewer is unassigned while their detail page is open | Their next refetch returns `404` and the page becomes the not-found view. No re-login needed (XBE-13) |
| **EC-03** | A recruiter removes the last interviewer | The panel shows **"No interviewers assigned yet."** in a warning tone (FR-4.3, FR-5.2) |
| **EC-04** | A recruiter double-clicks Assign with the same person | First `201`, second `409 ALREADY_ASSIGNED` → toast and invalidation, which re-disables the option (FR-7.4) |
| **EC-05** | The picker shows someone who was assigned in another tab | They appear enabled until the detail refetches; assigning them gets the `409` and the correct message (AZ-4) |
| **EC-06** | No interviewer accounts exist | The assign dialog renders **"No interviewer accounts exist yet."** and Submit is disabled |
| **EC-07** | A round is scheduled in the past | `201`, no warning (FR-6.4, VAL-1) |
| **EC-08** | A round's stage differs from the application's current stage | Rendered as-is. The round's stage is what it is **for** (FR-6.3, XBE-8) |
| **EC-09** | A cancelled round in an interviewer's list | Listed, with a destructive badge; its detail shows the cancellation banner (FR-2.6, FR-3.5, XBE-6) |
| **EC-10** | A recruiter cancels a round with feedback on it | Assignments and feedback stay; the confirmation said so (FR-5.3, XBE-7) |
| **EC-11** | A recruiter tries to cancel an already-cancelled round | The action is hidden. If fired anyway, `409` → toast (FR-5.4, AZ-5) |
| **EC-12** | Scheduling against a rejected application | `409 APPLICATION_NOT_ACTIVE` → toast; the dialog closes (FR-6.6) |
| **EC-13** | `?status=BANANA&page=-2` | The unfiltered first page renders; neither parameter is sent (VAL-3) |
| **EC-14** | An interviewer with no assignments logs in | `/my-interviews` shows the explanatory empty state, **not** a bare "no results" (FR-2.9) |
| **EC-15** | A browser in IST schedules 9:30 | The request carries the correct UTC instant, not `09:30Z` (VAL-2) |
| **EC-16** | A recruiter opens `/my-interviews` | The app's 404 — that route is the interviewer's (AZ-1) |
| **EC-17** | A session expires mid-assignment | One `401`, one refresh, one replay |

---

## Security Requirements

- **SEC-1** **The interviewer's components cannot render a contact field**, because
  `InterviewerInterview` has none (FE-4, AZ-7). This is a compile-time property, not a runtime
  branch — and it is the difference between "we remembered to hide it" and "there is nothing to
  hide".
- **SEC-2** There is **no conditional render of a contact field** anywhere in
  `features/interviews/`. A grep for `email` or `phone` in that folder must find nothing
  (AC-F30). If a contact field ever arrives in an interviewer's payload, **that is a backend bug to
  report**, per [../../../CLAUDE.md](../../../CLAUDE.md).
- **SEC-3** The interviewer's view renders no panel (FR-3.4), because the payload carries none
  (XBE-4).
- **SEC-4** **No copy distinguishes "not assigned" from "not found"** (ERR-2). The API deliberately
  makes them identical, and a helpful client message would undo that.
- **SEC-5** Route guards, disabled picker options and hidden status actions are **UX**. The API's
  `403`, `404`, `409 ALREADY_ASSIGNED` and `409 INVALID_STAGE_TRANSITION` are the controls (AZ-1,
  AZ-4, AZ-5), and AC-M02/AC-M03 prove it from the console.
- **SEC-6** No candidate data is written to browser storage (DM-2).
- **SEC-7** Candidate names and role titles are rendered as **text nodes**. No
  `dangerouslySetInnerHTML` appears in this feature.
- **SEC-8** **Known accepted gaps.** (a) An interviewer's list and detail stay in the query cache
  until the tab closes, so a shared machine shows the last-viewed candidate name after a `Back`.
  (b) There is no client throttle on the detail route, so an interviewer could script id probing
  from the console — every answer is an identical `404`, but the client does nothing to slow it.
  (c) A removed interviewer's browser keeps its already-rendered page until it refetches, showing a
  name they may no longer access; the next request corrects it. All three are accepted for a
  localhost POC.

---

## Performance Requirements

- **PERF-1** `/my-interviews` issues **exactly one** request on mount, and **exactly one** per
  filter or page change.
- **PERF-2** `/interviews/[id]` issues **exactly one** request on mount. The panel comes from the
  same payload — **no per-interviewer lookup** (XBE-2).
- **PERF-3** `GET /api/users` is fetched **only when the assign dialog opens** (API-5). A recruiter
  who never assigns anyone never fetches the list.
- **PERF-4** A successful assignment issues **exactly two** requests: the `POST` and the detail
  refetch. **No optimistic write** (FE-8).
- **PERF-5** A successful schedule issues **exactly two**: the `POST` and the list refetch.
- **PERF-6** **No polling.** Refetching happens on mount, on a filter change, on a mutation settling,
  and on window focus.
- **PERF-7** `placeholderData: (previous) => previous` on both list queries, so paging never flashes
  a skeleton after the first load.
- **PERF-8** A `404` on the detail is **not retried** (FE-10), matching the shipped `useJobQuery`.

---

## Acceptance Criteria

Verified by hand, in the browser, with DevTools open. Roles: **R** = recruiter, **I1** and **I2** =
the two seeded interviewers, **C** = candidate. `$IV` is a round both interviewers are assigned to;
`$IV_SOLO` is a round only **I1** is assigned to (backend FR-7.3).

`AC-F*` are functional checks driven through the UI. `AC-M*` additionally require a running backend
and a seeded database.

### Routes and navigation

- **AC-F01** — **Given** a fresh login as I1, **when** the redirect settles, **then** the browser is
  at `/my-interviews` and the page shows a **table of rounds**, not the old placeholder (FR-1.1,
  FR-1.5).
- **AC-F02** — **Given** R, **when** the sidebar is read, **then** the Hiring section includes
  **Interviews** after Roles (FR-1.4).
- **AC-F03** — **Given** I1, **when** the sidebar is read, **then** there is **no** Interviews link
  — only My interviews (FR-1.4).
- **AC-F04** — **Given** R, **when** `/my-interviews` is opened by URL, **then** the app's 404
  renders (EC-16).
- **AC-F05** — **Given** C, **when** `/interviews` is opened, **then** the app's 404 renders and
  the Network tab shows **no** `/api/interviews` request (AZ-1).

### My Interviews

- **AC-F06** — **Given** I1 with assigned rounds, **when** `/my-interviews` loads, **then** the
  table shows **Candidate, Role, Round, When, Status** (FR-2.2).
- **AC-F07** — **Given** the same, **when** the Network tab is read, **then** there is **exactly
  one** `GET /api/interviews` request (PERF-1).
- **AC-F08** — **Given** the same, **when** the DOM is inspected, **then** **no** email address and
  **no** phone number appears anywhere on the page (FR-2.3, SEC-1).
- **AC-F09** — **Given** I2 who is not on `$IV_SOLO`, **when** `/my-interviews` loads, **then**
  `$IV_SOLO` is **not** in the table, at any page or filter (XBE-2).
- **AC-F10** — **Given** an interviewer with no assignments, **when** the page loads, **then**
  **"You have no interviews assigned."** renders with its explanatory sub-line (FR-2.9, EC-14).
- **AC-F11** — **Given** a cancelled round they are on, **when** the list renders, **then** it is
  listed with a **destructive** status badge (FR-2.6, EC-09).

### The interviewer's detail

- **AC-F12** — **Given** I1 assigned to `$IV`, **when** `/interviews/$IV` is opened, **then** the
  page shows the candidate's **name**, the role title, the round type, the stage, the time and the
  status (FR-3.2).
- **AC-F13** — **Given** the same page, **when** the DOM is inspected, **then** there is **no panel
  list** and **no other interviewer's name** anywhere (FR-3.4, SEC-3).
- **AC-F14** — **Given** I2 **not** assigned to `$IV_SOLO`, **when** `/interviews/$IV_SOLO` is
  opened by URL, **then** `<NotFoundView />` renders, and **no copy on the page mentions
  permissions or assignment** (FR-3.7, ERR-2, EC-01).
- **AC-F15** — **Given** the same, **when** the Network tab is read, **then** the response was
  **`404`** — not `403` — and it was **not retried** (XBE-5, FE-10, PERF-8).
- **AC-F16** — **Given** I1 on a cancelled round, **when** the detail opens, **then** the banner
  **"This interview was cancelled."** renders above the detail (FR-3.5).

### Scheduling

- **AC-F17** — **Given** R on an `ACTIVE` application, **when** **Schedule interview** is clicked,
  **then** the dialog opens with **Stage defaulted to the application's current stage** and Submit
  disabled (FR-6.3).
- **AC-F18** — **Given** the dialog, **when** a date one year in the past is entered with a valid
  type and stage, **then** Submit is **enabled** and no warning renders (FR-6.4, VAL-1, EC-07).
- **AC-F19** — **Given** a valid form, **when** Submit is pressed, **then** the dialog closes and a
  toast reads **"Interview scheduled."** (FR-6.5).
- **AC-F20** — **Given** the same, **when** the Network tab is read, **then** **exactly two**
  requests fired — the `POST` and the list refetch (PERF-5).
- **AC-F21** — **Given** a browser set to IST scheduling 09:30, **when** the request body is read in
  the Network tab, **then** `scheduledAt` is the correct **UTC** instant, not `09:30Z` (VAL-2,
  EC-15).

### Panels

- **AC-F22** — **Given** R on a round with no assignments, **when** the detail opens, **then**
  **"No interviewers assigned yet."** renders in a warning tone with an **Assign interviewer**
  button (FR-4.3, EC-03).
- **AC-F23** — **Given** the assign dialog, **when** it opens, **then** the Network tab shows
  **exactly one** `GET /api/users` request — **and none was made before it opened** (API-5, PERF-3).
- **AC-F24** — **Given** the dialog on a round where I1 is assigned, **when** the select is opened,
  **then** I1 is **disabled** with the suffix **"— already assigned"** (FR-7.2).
- **AC-F25** — **Given** I2 chosen, **when** Submit is pressed, **then** a toast reads
  **"Ingrid Interviewer assigned."** and the panel shows two badges (FR-7.3).
- **AC-F26** — **Given** the same assignment fired twice quickly, **when** the second returns,
  **then** a toast reads **"That interviewer is already on this round."** and the panel still shows
  two badges (FR-7.4, EC-04).
- **AC-F27** — **Given** R, **when** **Remove** is clicked, **then** a confirmation dialog renders
  containing both **"They will lose access to this candidate immediately."** and **"Feedback they
  have already submitted is kept."** (FR-7.6, XBE-13).
- **AC-F28** — **Given** the confirmation, **when** it is accepted, **then** the response is `204`,
  a toast reads **"{name} removed."**, and the badge disappears (FR-7.7).
- **AC-F29** — **Given** a `COMPLETED` round, **when** R opens its detail, **then** **Mark
  completed** and **Cancel interview** are **absent** (FR-5.4, EC-11).

### Structure

- **AC-F30** — **Given** the repository, **when**
  `grep -rniE "email|phone" src/features/interviews/` is run, **then** it returns **nothing**
  (SEC-2, FR-9.1).
- **AC-F31** — **Given** the repository, **when** `features/interviews/types.ts` is read, **then**
  **two** detail interfaces exist, and `InterviewerInterview` declares **no** `email`, `phone` or
  `assignments` — **optional or otherwise** (FE-4, D-2).
- **AC-F32** — **Given** the repository, **when**
  `grep -rniE "not assigned|no access|permission" src/features/interviews/` is run, **then** no
  user-facing copy matches (ERR-2, SEC-4).
- **AC-F33** — **Given** the repository, **when** `[interviewId]/page.tsx` is read, **then** it
  dispatches on role to two components, and **neither accepts the other's props type** (FE-5).

### The dashboard revision

- **AC-F34** — **Given** R, **when** `/dashboard` loads, **then** a **seventh** tile, **Interviews**,
  renders with the scheduled-round count and links to `/interviews` (FR-8.1, the Revision).

### Cross-cutting invariants

- **AC-M01** — **Given** a full session as I1 — the list, a detail, a cancelled round — **when**
  every response body in the Network tab is searched, **then** the strings `"email"`, `"phone"` and
  `"assignments"` appear **zero** times. *Verified in the payload, not the DOM* (XBE-3, XBE-4,
  SEC-1).
- **AC-M02** — **Given** an **interviewer** session, **when**
  `fetch('<API>/api/interviews/<$IV_SOLO id>', …)`,
  `fetch('<API>/api/interviews/<id>/assignments', { method: 'POST', body: … })` and
  `fetch('<API>/api/users', …)` are issued **by hand from the DevTools console**, **then** the first
  is **`404`** and the other two are **`403`**. *This is the criterion that proves neither the hidden
  nav links nor the route guards are what is protecting the endpoints* (AZ-1, SEC-5, XBE-1, XBE-5).
- **AC-M03** — **Given** an R session, **when** an assignment for an **already-assigned** interviewer
  is fired **by hand from the console**, bypassing the disabled option, **then** the response is
  **`409 ALREADY_ASSIGNED`**. *This proves the disabled option is not the control* (AZ-4, SEC-5,
  XBE-11).
- **AC-M04** — **Given** I1 on `$IV_SOLO`, **when** R removes their assignment and I1 reloads
  `/interviews/$IV_SOLO` **without logging out**, **then** the page becomes the not-found view
  (EC-02, XBE-13).
- **AC-M05** — **Given** a full session as I1, **when** `localStorage`, `sessionStorage` and
  `document.cookie` are read in the console at the end, **then** none contains a token, a candidate
  name, or an email (DM-1, DM-2, SEC-6).
- **AC-M06** — **Given** an R session with an expired access token, **when** an assignment is fired,
  **then** the Network tab shows one `401`, one `POST /api/auth/refresh`, and one successful replay
  (EC-17).

---

## Out of Scope

| Excluded | Why |
|---|---|
| The feedback form and list | The feedback feature owns both; this spec leaves a named slot on the detail page (FR-3.6, FR-5.5) |
| Rescheduling a round | The API has no such path — cancel and recreate says the same thing |
| A calendar view | No calendar primitive is vendored, and the brief models rounds, not scheduling (D-4) |
| Availability or conflict detection | Not in the requirements; `scheduledAt` is a timestamp a recruiter types |
| Notifying an interviewer of an assignment | No notification channel exists in this app |
| An interviewer seeing their panel colleagues | D-7. The feedback list is where a panel member learns who else contributed |
| An interviewer seeing a candidate's other rounds | Their scope is the round, not the person |
| Bulk assignment | Multiplies the conflict surface for a convenience nobody asked for |
| A candidate's interview schedule | The walkthrough gives candidates Jobs and My Applications only |
| Deleting a round | The API has no such path; `CANCELLED` preserves the history |

---

## Dependencies

**Blocked by:**
[../../../../backend/specs/features/interviews/spec.md](../../../../backend/specs/features/interviews/spec.md).
**Nothing here can be verified until that ships.**
[../pipeline/spec.md](../pipeline/spec.md) — this spec revises its dashboard.

**Blocks:** [../feedback/spec.md](../feedback/spec.md) — its form and list mount on
`/interviews/[interviewId]`, the route this feature creates.
[../candidate-access/spec.md](../candidate-access/spec.md) — its candidate detail opens this feature's schedule
dialog (D-3).

**Revises:** [../pipeline/spec.md](../pipeline/spec.md) FR-2.2, FR-2.3, XBE-9, AC-F06, AC-F07 — see
the Revision section. The backend counterpart is revised in the same pass.

**New npm dependencies:** **none.** Every primitive used is already vendored in
[`src/components/ui/`](../../../src/components/ui/), and the date field is a native
`Input type="datetime-local"` (D-4).

**Environment variables:** none.

**Modified existing files**

| Path | Change |
|---|---|
| [`src/app/(app)/my-interviews/page.tsx`](<../../../src/app/(app)/my-interviews/page.tsx>) | The placeholder is **replaced** by the list |
| [`src/app/(app)/layout.tsx`](<../../../src/app/(app)/layout.tsx>) | Hiring section gains Interviews |
| `src/app/(app)/dashboard/page.tsx` | The seventh tile (FR-8.1) |
| [`CLAUDE.md`](../../../CLAUDE.md) | Feature table row |

**Framework note.** **This is Next.js 16; its APIs differ from older versions.** Route `params` are
a **Promise**: `[interviewId]/page.tsx` must `await params` and pass the raw segment to
`parseInterviewId` rather than assuming a number (FE-11). `MyInterviewsView` and
`InterviewsListView` read `useSearchParams()`, so both pages **must** wrap them in `<Suspense>` or
`next build` fails (FE-1). `PageProps<'/interviews/[interviewId]'>` and `LayoutProps<'/interviews'>`
are globally generated and are the types the new files use.

**External dependencies:** none.

**Cross-repo:** a change to the seven endpoints, the two projections, the `404`-not-`403` rule, the
two new error codes, or the summary's field list must be made in **both** specs — see
[../../../../backend/specs/features/interviews/spec.md](../../../../backend/specs/features/interviews/spec.md).
