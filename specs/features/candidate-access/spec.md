# Candidate Access — Two Views of One Person (Frontend)

> **Status:** Draft — awaiting approval. `plan.md` is a later artifact and does not exist yet.
> **Feature slug:** `candidate-access`
> **Scope:** `frontend/` — Next.js 16 App Router, React 19, TanStack Query
> **Counterpart:** [../../../../backend/specs/features/candidate-access/spec.md](../../../../backend/specs/features/candidate-access/spec.md)
> **Depends on:** [../pipeline/spec.md](../pipeline/spec.md) · [../interviews/spec.md](../interviews/spec.md) · [../feedback/spec.md](../feedback/spec.md) — all must ship first
> **Revises:** [../pipeline/spec.md](../pipeline/spec.md) FR-4.2 — the drill-down becomes real
> **Blocked by:** the backend counterpart. **Nothing here can be verified until that ships.**
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md) §3.2, §3.6, §4

---

## Goal

1. Give recruiters the **whole candidate on one screen** — contact details, applications, stage
   history with override reasons, rounds, panels and feedback.
2. Give interviewers a candidate view that is **structurally incapable of showing contact details**,
   because the component that renders it is typed to a shape that has none.
3. Finish the walkthrough's **job → applicants → candidate** path, which today ends at a role detail
   page with no applicants on it.
4. Let recruiters **record a phone and location**, since a candidate account carries only a name and
   an email.
5. Handle the interviewer's `404` on an unassigned candidate as an ordinary not-found — because
   that is genuinely all this client can know.

Success means: a recruiter opens a role, sees its applicants, clicks one, and reads their whole
history; an interviewer opens the same person and sees a name and their own round; and an
interviewer who is not assigned pastes the URL and gets the app's not-found view.

---

## Background / Context

This is the feature [../../../CLAUDE.md](../../../CLAUDE.md) has been describing since before it
existed:

> **Candidate detail**: stage history, assigned interviewers/rounds, feedback. Contact details
> render **only when the API response actually includes them** (recruiter-scoped call).

> Build views and API calls per the current user's role — **don't build one "candidate view" that
> conditionally renders contact fields based on a client-side role check.**

That second sentence is the design of this entire feature. The backend returns two different shapes
from one endpoint; this client therefore declares **two interfaces and two components**, and the
role picks the component before anything renders. A single component with `candidate.email && …` is
one refactor away from being the leak the whole POC is built to prevent.

### Translation from the request

| Described                                               | Built as                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recruiter navbar: "Candidates / Applications"           | A `/candidates` route. The word is **Candidates** — `/applications` is already the _candidate's own_ route and renaming it would break a shipped view |
| "Job Details → Applicants"                              | An **Applicants** section on the existing `/roles/[roleId]` page, calling `GET /api/candidates?roleId=…`                                              |
| "Candidate Details" with pipeline, interviews, feedback | `/candidates/[candidateId]`, recruiter view                                                                                                           |
| Interviewer's "Candidate information: Name: John Smith" | `/candidates/[candidateId]`, interviewer view — a name, and their own rounds                                                                          |

### Current state of `frontend/`

|                                | Today, assuming the three preceding features have shipped                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/roles/[roleId]`              | Built — title, description, status, edit/delete actions. **No applicants section**                                                                       |
| `/applications`                | The **candidate's own** applications list. Unrelated to this feature and unchanged                                                                       |
| `/pipeline`                    | The board; its drill-down renders **"Candidate detail is not available yet."** (pipeline FR-4.2)                                                         |
| `/interviews/[id]`             | Built, with the feedback components mounted                                                                                                              |
| Nav                            | Recruiter: Dashboard, Pipeline, Roles, Interviews + Audit + Profile. Interviewer: My interviews + Profile                                                |
| Types                          | `features/roles/types.ts`, `features/applications/types.ts`, `features/interviews/types.ts` — **all mirrored by hand; nothing is imported across repos** |
| `features/interviews/types.ts` | Already demonstrates the two-interface pattern this feature repeats (interviews FE-4)                                                                    |

## Revision to the pipeline spec — the drill-down becomes real

**What changes:** [../pipeline/spec.md](../pipeline/spec.md) FR-4.2 states that the board's stage
cards do not link and the drill-down renders **"Candidate detail is not available yet."**, because
`GET /api/candidates` does not exist. It exists now. Stage cards with a non-zero count become links
to `/pipeline?roleId=…&stage=…`, and the drill-down renders a real candidate list from this
feature's api module.

**What this reverses:** pipeline FR-4.2 and the _Drill-down unavailable_ row of its `/pipeline` state
matrix.

**Why it is being overridden:** it was a stated placeholder from the start, waiting on this feature.

**What makes it safe:** the drill-down calls `GET /api/candidates?roleId=&stage=&status=ACTIVE`,
which is recruiter-scoped and paginated. `/pipeline` is already recruiter-only, so no new
authorization surface appears.

**What it costs, named plainly:** `/pipeline` gains a second request when a cell is opened. The
board itself is unchanged.

**What must change alongside this spec:** pipeline FR-3.7 (cards link), FR-4.2 (replaced), FR-4.3
and FR-4.4 (now live), the _Drill-down unavailable_ state row, and pipeline AC-F13 — which asserted
that a **zero-count** card is not a link and **remains true**. The backend counterpart is unaffected.

### Decisions carried from the interview

| #   | Question                                       | Decision                                                                                                                                                 |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | One component or two?                          | **Two components, two interfaces, dispatched by role before render** (CLAUDE.md's standing rule). Never one with a `candidate.email &&` branch           |
| D-2 | Where do applicants for a job live?            | An **Applicants section on `/roles/[roleId]`**, not a nested route. It is a filtered candidate list, and a second route would be a second place to scope |
| D-3 | Is there a create-candidate form?              | **No.** There is no `POST /api/candidates` (XBE-10)                                                                                                      |
| D-4 | Are name and email editable?                   | **No.** Only phone, location and headline (XBE-4)                                                                                                        |
| D-5 | Does the interviewer get a candidate list?     | **Yes** — their assigned candidates, name only. It gets a nav entry, because a list of two names is still the answer to "who am I interviewing"          |
| D-6 | Search box for interviewers?                   | **No.** `?q=` is a `400` for them (XBE-8), and a search over people is exactly the affordance this feature denies them                                   |
| D-7 | How does the recruiter detail render feedback? | With the **feedback** feature's `<FeedbackList>`, fed from the candidate payload — zero extra requests (feedback FR-1.2)                                 |
| D-8 | New dependency?                                | **None**                                                                                                                                                 |

---

## Users / Actors

| Actor       | Sees                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Anonymous   | `/login` with `?next=`                                                                         |
| Candidate   | The app's 404 on both routes. Their own record is `/profile` and `/applications`, both shipped |
| Interviewer | Their assigned candidates — **name only** — and, per candidate, **their own rounds**           |
| Recruiter   | Every candidate, in full: contact, applications, stage history, rounds, panels, feedback       |

**Deliberate trade-offs:** a candidate cannot open their own record here — `403` from the API, and
the app's 404 in the client. An interviewer sees a name, which is personal data the brief does not
restrict and an interview cannot happen without.

---

## User Stories

| ID        | Story                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **US-01** | As a recruiter, I want a candidate's whole record on one screen, so that I can decide without opening five things.                     |
| **US-02** | As a recruiter, I want a role's applicants listed on the role page, so that job → applicants is one click.                             |
| **US-03** | As a recruiter, I want to record a phone number, so that "call them" does not mean finding the original email.                         |
| **US-04** | As a recruiter, I want to search by name or email, so that finding someone is a keystroke.                                             |
| **US-05** | As a recruiter, I want to click a pipeline cell and see who is in it.                                                                  |
| **US-06** | As an interviewer, I want to see who I am interviewing and when.                                                                       |
| **US-07** | As an interviewer, I want no way at all to reach a candidate I am not assigned to.                                                     |
| **US-08** | As a security reviewer, I want to open one component and confirm it cannot render a contact field, rather than trusting a conditional. |

---

## Functional Requirements

### FR-1 — Routes and navigation

- **FR-1.1** A new route `/candidates`, guarded by
  `<RequireRole allow={CANDIDATES_USER_ROLES}>` where that constant is
  `['RECRUITER', 'INTERVIEWER']` — **both roles reach the route; the API decides what each sees**
  (XBE-1).
- **FR-1.2** A new route `/candidates/[candidateId]`, guarded the same way.
- **FR-1.3** `NAV_SECTIONS.RECRUITER`'s Hiring section gains **Candidates** after Roles.
  `NAV_SECTIONS.INTERVIEWER` gains **Candidates** after My interviews (D-5).
- **FR-1.4** The nav entry is UX. A candidate reaching either route gets `<NotFoundView />`.

### FR-2 — The recruiter's list

- **FR-2.1** `/candidates` for a recruiter renders a paginated table: **Name · Email · Phone ·
  Applications · Joined**.
- **FR-2.2** **Applications** renders each application as a `<Badge>` of its role title plus its
  current stage, with the count when there are more than two.
- **FR-2.3** Filters in the URL: `q`, `roleId`, `stage`, `status`. `q` is a debounced `<Input>`;
  the rest are `<Select>`s.
- **FR-2.4** `q` searches **name and email**, matching the API (XBE-7). The placeholder says so:
  **"Search by name or email"**.
- **FR-2.5** Each row links to `/candidates/{id}`.
- **FR-2.6** An empty result renders **"No candidates match these filters."** with **Clear
  filters**; an unfiltered empty result renders **"No candidates yet."** with the sub-line
  **"People who sign up and apply appear here."**

### FR-3 — The interviewer's list

- **FR-3.1** `/candidates` for an interviewer renders a table with **one column: Name** — plus the
  count of their rounds with that person, which comes from their own scoped data.
- **FR-3.2** **There is no search box** (D-6, XBE-8). Filters are `roleId` and `stage` only.
- **FR-3.3** The empty state reads **"You are not assigned to any candidates yet."** with
  **"Candidates appear here when a recruiter assigns you to an interview."**
- **FR-3.4** The component receives `Array<InterviewerCandidate>` — a type with **exactly `id` and
  `name`** (FE-3). There is no email column, no phone column, and **no conditional that could add
  one**.

### FR-4 — The recruiter's detail

- **FR-4.1** `/candidates/[candidateId]` renders `<RecruiterCandidateDetail>` for a recruiter.
- **FR-4.2** A header card: name, email, phone, location, headline, and **Edit contact details**.
- **FR-4.3** Then one card per application, newest first, each holding:
  - the role title (linking to `/roles/{id}`), the current stage, the status, and time at stage;
  - a **stage timeline** (FR-5);
  - the application's **rounds**, each with its panel and its feedback (FR-6);
  - the pipeline feature's **Move** menu for that application.
- **FR-4.4** The Move menu, the override dialog and the schedule-interview dialog are **imported
  from the pipeline and interviews features** (FE-6). This feature declares no second copy of any of
  them.
- **FR-4.5** A candidate with no applications renders the header card plus **"No applications
  yet."**
- **FR-4.6** The whole detail is **one request** (XBE-2). No per-application, per-round or
  per-feedback call is made.

### FR-5 — The stage timeline

- **FR-5.1** Each application renders its `stageHistory` as a vertical timeline, **oldest first** —
  a history reads forwards — in the API's order (XBE-5). **The client does not re-sort.**
- **FR-5.2** Each entry shows the transition (`Applied → Screen`), who made it, and when.
- **FR-5.3** The first entry, whose `fromStage` is `null`, renders as **"Applied"** rather than
  `null → Applied`.
- **FR-5.4** **An entry with a non-null `override` is visually distinct** — a destructive-toned
  marker, the label **"Override"**, and the **reason in full**, attributed to the recruiter who
  performed it.
- **FR-5.5** The reason is **never truncated**. It is the record the brief requires be kept, and
  this is the screen where it is read.

### FR-6 — Rounds and feedback on the detail

- **FR-6.1** Each application lists its rounds: type, stage, time, status, and the panel as badges.
- **FR-6.2** Each round renders the feedback feature's `<FeedbackList editable={false} />`, fed from
  the candidate payload (D-7, XBE-6). **Zero additional requests, however many rounds there are.**
- **FR-6.3** A round with no feedback renders **"No feedback submitted for this round yet."**
- **FR-6.4** Each round links to `/interviews/{id}`.
- **FR-6.5** A **Schedule interview** button per application, opening the interviews feature's
  dialog (FR-4.4), shown only while the application's `status` is `ACTIVE` — UX, with the API's
  `409` as the control.

### FR-7 — The interviewer's detail

- **FR-7.1** `/candidates/[candidateId]` renders `<InterviewerCandidateDetail>` for an interviewer.
- **FR-7.2** It shows the candidate's **name** and a list of **their own rounds** with that
  candidate: type, stage, time, status, role title — each linking to `/interviews/{id}`.
- **FR-7.3** **It renders nothing else** (XBE-3). The component receives an `InterviewerCandidate`
  and an `Array<InterviewerCandidateInterview>` — types with **no `email`, no `phone`, no
  `applications`, no `stageHistory`, no `feedback`** (FE-3). **There is no field to hide, because
  there is no field.**
- **FR-7.4** A `404` — whether the candidate does not exist, is not a candidate, or the interviewer
  is not assigned — renders `<NotFoundView />`. **The client cannot distinguish the three and must
  not try** (XBE-9).
- **FR-7.5** **No copy anywhere in this feature says "you are not assigned to this candidate."** The
  client does not know that, and saying it would leak what the API withheld.

### FR-8 — Editing contact details

- **FR-8.1** **Edit contact details** opens a `<Dialog>` with **Phone**, **Location** and
  **Headline**. Recruiter-only.
- **FR-8.2** **Name and email render as read-only text inside the dialog**, with the muted note
  **"Managed by the candidate's account."** Showing them read-only is clearer than omitting them,
  and it is honest about why (D-4, XBE-4).
- **FR-8.3** A cleared field sends **`null`**, not `""` — the API distinguishes them, and `""` would
  store an empty string where a recruiter meant "remove this" (XBE-5b).
- **FR-8.4** At least one field must change for Submit to enable.
- **FR-8.5** On `200`, the dialog closes, a toast reads **"Contact details updated."**, and the
  response — which is the full detail — is written into the detail query cache with
  `setQueryData`, matching the shipped `useWriteSuccess` pattern. **No refetch is needed** (XBE-11).
- **FR-8.6** On `400`, field messages render under the fields and **the dialog stays open with the
  values intact**.

### FR-9 — Applicants on the role page

- **FR-9.1** `/roles/[roleId]` gains an **Applicants** section below the role detail (D-2), calling
  `GET /api/candidates?roleId={id}`.
- **FR-9.2** It renders **Candidate · Stage · Applied · View**, matching the walkthrough, with the
  count in the section heading.
- **FR-9.3** **View** links to `/candidates/{id}`. This completes the walkthrough's job → applicants
  → candidate path.
- **FR-9.4** It is paginated independently of the role detail, with its own URL parameter
  `applicantsPage`, so paging applicants does not disturb the roles list's own `page`.
- **FR-9.5** Empty renders **"No applicants yet."**
- **FR-9.6** The section renders for **recruiters only**. `/roles` is already recruiter-only for
  writes but readable by interviewers (roles Revision 3), so this section is gated on the role
  explicitly rather than inheriting the route's guard.

### FR-10 — The pipeline drill-down

- **FR-10.1** `/pipeline?roleId=&stage=` renders a real candidate list, replacing the placeholder
  (the Revision above). It calls `GET /api/candidates?roleId=&stage=&status=ACTIVE`.
- **FR-10.2** Each row shows the name, time at stage, and the pipeline feature's Move menu.
- **FR-10.3** Stage cards with a non-zero count become links. **Zero-count cards remain
  unlinked** (pipeline FR-3.7, AC-F13 — still true).

### FR-11 — What this client must never do

- **FR-11.1** It must never declare a single candidate type with optional contact fields (D-1,
  FE-3).
- **FR-11.2** It must never render a contact field behind a role check. **The role picks the
  component; the component has no such field** (FE-4).
- **FR-11.3** It must never present a `404` as a permission problem (FR-7.5).
- **FR-11.4** It must never offer a create-candidate affordance (D-3, XBE-10).
- **FR-11.5** It must never offer name or email as editable (D-4).
- **FR-11.6** It must never treat a route guard as the access control (AZ-1).

---

## Frontend Requirements

### File structure

```
src/
  app/
    (app)/
      candidates/
        layout.tsx                              NEW   — <RequireRole allow={CANDIDATES_USER_ROLES}>
        page.tsx                                NEW   — <Suspense><CandidatesListView /></Suspense>
        [candidateId]/page.tsx                  NEW   — role-dispatched detail
      roles/[roleId]/page.tsx                   MOD   — the Applicants section (FR-9)
      pipeline/page.tsx                         MOD   — the real drill-down (FR-10)
      layout.tsx                                MOD   — Candidates for both privileged roles
  features/
    candidates/
      api/candidates.api.ts                     NEW   — listCandidates, getCandidate, updateCandidateContact
      hooks/useCandidatesQuery.ts               NEW   — useCandidatesQuery, useCandidateQuery, key factories
      hooks/useCandidateMutations.ts            NEW   — useUpdateCandidateContact
      components/CandidatesListView.tsx         NEW   — dispatches by role
      components/RecruiterCandidatesTable.tsx   NEW   — FR-2
      components/InterviewerCandidatesTable.tsx NEW   — FR-3
      components/RecruiterCandidateDetail.tsx   NEW   — FR-4
      components/InterviewerCandidateDetail.tsx NEW   — FR-7
      components/CandidateApplicationCard.tsx   NEW   — FR-4.3
      components/StageTimeline.tsx              NEW   — FR-5
      components/ContactDetailsDialog.tsx       NEW   — FR-8
      components/RoleApplicants.tsx             NEW   — FR-9
      components/PipelineDrillDown.tsx          NEW   — FR-10
      components/CandidateNotFound.tsx          NEW   — FR-7.4
      permissions.ts                            NEW   — CANDIDATES_USER_ROLES
      search-params.ts                          NEW
      types.ts                                  NEW   — FOUR interfaces (FE-3)
  lib/
    schemas/candidate.ts                        NEW   — contactDetailsSchema
```

Primitives reused: `Table`, `Card`, `Badge`, `Button`, `Dialog`, `Select`, `Input`, `Label`,
`Separator`, `Skeleton`. **No new primitive, no new dependency** (D-8).

### State matrix — `/candidates`, recruiter

| State             | Trigger         | Renders                                                                    |
| ----------------- | --------------- | -------------------------------------------------------------------------- |
| Loading           | first fetch     | An 8-row skeleton table                                                    |
| Loaded            | `200`           | Name, Email, Phone, Applications, Joined + pager                           |
| No phone recorded | `phone: null`   | `—` in that cell — never a blank cell, which reads as a rendering bug      |
| Searching         | `q` typed       | Debounced 400 ms; previous rows stay visible                               |
| Empty, filtered   | `total: 0`      | **"No candidates match these filters."** + **Clear filters**               |
| Empty, unfiltered | `total: 0`      | **"No candidates yet."** + **"People who sign up and apply appear here."** |
| Error             | `500` / network | Inline error card + **Try again**                                          |

### State matrix — `/candidates`, interviewer

| State   | Trigger     | Renders                                                                                                                        |
| ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Loading | first fetch | A 3-row skeleton                                                                                                               |
| Loaded  | `200`       | **One column: Name.** No search box, no email, no phone (FR-3.1, FR-3.2)                                                       |
| Empty   | `total: 0`  | **"You are not assigned to any candidates yet."** + **"Candidates appear here when a recruiter assigns you to an interview."** |
| Error   | `500`       | Inline error card + **Try again**                                                                                              |

### State matrix — `/candidates/[candidateId]`, recruiter

| State                | Trigger             | Renders                                                                              |
| -------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Loading              | first fetch         | A header skeleton + two application-card skeletons                                   |
| Loaded               | `200`               | Header + one card per application, each with timeline, rounds, panels and feedback   |
| No profile recorded  | `profile` all null  | Contact rows read `—`; **Edit contact details** still offered (XBE-12)               |
| No applications      | `applications: []`  | Header + **"No applications yet."**                                                  |
| Terminal application | `status !== ACTIVE` | Its card shows a status badge; the Move menu and Schedule button are absent (FR-6.5) |
| `404`                | no such candidate   | `<NotFoundView />`                                                                   |
| Error                | `500`               | Inline error card + **Try again**                                                    |

### State matrix — `/candidates/[candidateId]`, interviewer

| State                     | Trigger                                         | Renders                                                                                                              |
| ------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Loaded, assigned          | `200`                                           | The **name**, and a list of **their own rounds**. Nothing else (FR-7.3)                                              |
| No rounds _(unreachable)_ | `interviews: []`                                | **"No interviews with this candidate."** — unreachable, since an empty list means the `404` path, and handled anyway |
| `404`                     | not found, not a candidate, **or** not assigned | `<NotFoundView />` — **indistinguishable, deliberately** (FR-7.4, XBE-9)                                             |

### State matrix — the contact dialog

| State         | Trigger                          | Renders                                                                                                                           |
| ------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Open          | **Edit contact details** clicked | Phone, Location, Headline prefilled; **Name and email read-only** with **"Managed by the candidate's account."**; Submit disabled |
| Changed       | any field differs                | Submit enabled                                                                                                                    |
| Field cleared | a field emptied                  | On submit it sends **`null`**, not `""` (FR-8.3)                                                                                  |
| Submitting    | in flight                        | Submit reads **"Saving…"**, fields disabled                                                                                       |
| `200`         | —                                | Dialog closes; toast **"Contact details updated."**; the detail cache is written from the response — **no refetch** (FR-8.5)      |
| `400`         | —                                | Field messages; **dialog stays open, values intact**                                                                              |
| `404`         | —                                | Dialog closes; toast **"That candidate no longer exists."**                                                                       |

### Other frontend rules

- **FE-1** `CandidatesListView`, `RoleApplicants` and `PipelineDrillDown` read `useSearchParams()`;
  each page wraps them in `<Suspense>` — **without which `next build` fails**.
- **FE-2** All calls go through `features/candidate-access/api/candidates.api.ts`. **Three** exported
  functions. **There is no `createCandidate` wrapper**, because there is no such endpoint (D-3,
  FR-11.4).
- **FE-3** **`types.ts` declares four interfaces, and no shared "Candidate" type with optional
  fields** (D-1, FR-11.1):

  ```ts
  // Everything the API sends an interviewer about a candidate. Two fields.
  // There is no email here, no phone, no applications — the payload has none
  // (XBE-3). A shape with `email?: string` would invite a component to render it.
  export interface InterviewerCandidate {
    id: number;
    name: string;
  }

  export interface InterviewerCandidateInterview {
    id: number;
    type: InterviewType;
    stage: PipelineStage;
    scheduledAt: string;
    status: InterviewStatus;
    role: { id: number; title: string };
  }

  export interface RecruiterCandidateRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
    applicationCount: number;
    applications: Array<{
      id: number;
      status: ApplicationStatus;
      currentStage: PipelineStage;
      stageEnteredAt: string;
      role: { id: number; title: string };
    }>;
  }

  export interface RecruiterCandidate {
    id: number;
    name: string;
    email: string;
    createdAt: string;
    profile: {
      phone: string | null;
      location: string | null;
      headline: string | null;
      updatedAt: string | null;
    };
    applications: Array<RecruiterCandidateApplication>;
  }
  ```

- **FE-4** **The role picks the component before anything renders.**
  `CandidatesListView` and `[candidateId]/page.tsx` dispatch on `useAuth().role`, and **neither
  component accepts the other's props type** — so a mistaken dispatch is a compile error, not a
  leak. **There is no `candidate.email && <Row …>` anywhere in this feature** (FR-11.2).
- **FE-5** Query keys: `candidatesListKey(params) = ['candidates', 'list', params]`,
  `candidateDetailKey(id) = ['candidates', 'detail', id]`,
  `CANDIDATES_LIST_KEY = ['candidates', 'list']`.
- **FE-6** The Move menu, the override dialog and the schedule dialog are **imported** from
  `features/pipeline/` and `features/interviews/` (FR-4.4). A second copy would be a second place
  for their validation and their error handling to drift.
- **FE-7** `<FeedbackList>` is imported from `features/feedback/` and fed from the candidate payload
  (FR-6.2). This feature never calls the feedback endpoint.
- **FE-8** `useCandidateQuery` sets `retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2`,
  matching `useJobQuery` — a `404` is not retried, because it will not change.
- **FE-9** `parseCandidateId` mirrors the shipped `parseRoleId`; the query is `enabled` only when it
  returns non-null.
- **FE-10** `placeholderData: (previous) => previous` on the list query, so searching and paging keep
  the previous rows.
- **FE-11** The contact mutation uses `setQueryData(candidateDetailKey(id), response)` plus a list
  invalidate — matching the shipped `useWriteSuccess` in `useRoleMutations` (FR-8.5).
- **FE-12** `PipelineStage`, `ApplicationStatus`, `InterviewType` and `InterviewStatus` are
  **re-exported** from the features that already declare them, never redeclared. Two declarations of
  one union eventually disagree.

---

## Backend Requirements

The guarantees this client depends on. If any changes, this spec breaks. Source:
[../../../../backend/specs/features/candidate-access/spec.md](../../../../backend/specs/features/candidate-access/spec.md).

- **XBE-1** `GET /api/candidates` and `GET /api/candidates/:id` serve **both** privileged roles and
  return **two different shapes**, chosen by the caller's role. This is why FE-3 declares four
  interfaces.
- **XBE-2** The recruiter detail is **one request** carrying applications, stage history, override
  reasons, rounds, panels and feedback (FR-4.6).
- **XBE-3** **An interviewer's candidate payload contains no `email`, no `phone`, no
  `applications`, no `stageHistory`, and no other interviewers' `feedback`.** **If any of these ever
  appears, that is a backend bug to report, not a field to hide client-side.**
- **XBE-4** `PATCH` accepts **only** `phone`, `location` and `headline`. **`name` and `email` are
  silently stripped** — a form submitting them appears to succeed while changing nothing, which is
  why FR-8.2 renders them read-only rather than editable.
- **XBE-5** Stage history is ordered **oldest first** by the API (FR-5.1). _(b)_ On `PATCH`, an
  explicit `null` clears a field and an omitted key leaves it unchanged (FR-8.3).
- **XBE-6** The recruiter detail carries each round's feedback **inline**, so this client never
  calls the feedback endpoint from here (FR-6.2, FE-7).
- **XBE-7** `?q=` searches **name and email**, case-insensitively, and is **recruiter-only**.
- **XBE-8** **`?q=` from an interviewer is a `400`**, not a silently ignored parameter — which is
  why FR-3.2 renders no search box for them.
- **XBE-9** An interviewer requesting an unassigned candidate gets **`404`, not `403`**, byte-
  identical to a candidate that does not exist and to a recruiter's user id. The client cannot
  distinguish them and must not try (FR-7.4).
- **XBE-10** **There is no `POST /api/candidates`**; it answers `404`. The client offers no create
  affordance (FE-2).
- **XBE-11** `PATCH` responds `200` with the **full recruiter detail**, so the client writes it
  straight into the cache with no refetch (FR-8.5).
- **XBE-12** `profile` is always an **object** on a recruiter response, never `null`, with three
  possibly-null fields. The client renders `—` per field, not a "no profile" empty state.
- **XBE-13** The list is paginated on the shipped `{ page, pageSize, total, totalPages }` envelope.

---

## API Contract

| Call                        | When                                                                                                | Sends                                                                             | Expects                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| `GET /api/candidates`       | `/candidates` mounts; a filter or page changes; the Applicants section mounts; the drill-down opens | `q` _(recruiter only)_, `roleId`, `stage`, `status`, `page` — omitted at defaults | `200 { candidates, pagination }` · `400` · `403` |
| `GET /api/candidates/:id`   | the detail mounts                                                                                   | —                                                                                 | `200 { candidate, interviews? }` · `404`         |
| `PATCH /api/candidates/:id` | the contact dialog submits                                                                          | `{ phone?, location?, headline? }` — `null` to clear                              | `200 { candidate }` · `400` · `404`              |

### Client-side rules

- **API-1** Every call goes through `apiFetch`.
- **API-2** Every call is wrapped in `features/candidate-access/api/candidates.api.ts`; no component
  assembles a path. The pipeline feature's drill-down imports **this** module rather than declaring
  its own (pipeline API-6).
- **API-3** Query strings use `URLSearchParams`, parameters omitted at their defaults.
- **API-4** **`q` is never sent by an interviewer.** The client omits it structurally — the
  interviewer's list has no search input and its params type has no `q` (FR-3.2, XBE-8).
- **API-5** `PATCH` sends `null` to clear and omits untouched keys (FR-8.3, XBE-5b).
- **API-6** Error codes are read with `errorBodyOf(error)?.code`, never by matching message copy.
- **API-7** The Applicants section and the drill-down use the **same** `listCandidates` function with
  different parameters. One wrapper, three call sites.

---

## Data Model Changes

Client state only.

| State                                                      | Where it lives                     | Lifetime                            | Persisted?              |
| ---------------------------------------------------------- | ---------------------------------- | ----------------------------------- | ----------------------- |
| `q`, `roleId`, `stage`, `status`, `page`, `applicantsPage` | The URL                            | Until navigation                    | **In the URL only**     |
| Candidate list and detail                                  | TanStack Query cache               | Until invalidated or the tab closes | **Never** — memory only |
| Contact dialog fields                                      | `react-hook-form` state            | Until the dialog closes             | **Never**               |
| Debounced search input                                     | `useState` in the filter component | Until unmount                       | **Never**               |

- **DM-1** No token, name, email or role is written to `localStorage`, `sessionStorage` or a cookie.
- **DM-2** **No candidate contact detail is written to browser storage** — not as a draft, not as a
  cached search, not as a recently-viewed list. It is the data this whole POC is built to restrict,
  and browser storage is shared with whoever else uses the machine.
- **DM-3** **The search term is not persisted** beyond the URL. A recruiter's `q` may be a
  candidate's email address.
- **DM-4** No optimistic cache writes. The contact mutation writes the **server's** response into
  the cache (FE-11), which is not the same thing — it is a write of a confirmed value.

---

## Authentication / Authorization

**This matrix is UX, not a control.** Every row describes what renders; the backend re-authorizes
every request behind it.

| Route                            | Anonymous         | Candidate | Interviewer                     | Recruiter         |
| -------------------------------- | ----------------- | --------- | ------------------------------- | ----------------- |
| `/candidates`                    | → `/login?next=…` | app 404   | ✅ **assigned only, name only** | ✅ all, full rows |
| `/candidates/[id]`               | → `/login?next=…` | app 404   | ✅ **assigned only → app 404**  | ✅                |
| `/roles/[id]` Applicants section | → `/login?next=…` | app 404   | **not rendered**                | ✅                |
| `/pipeline` drill-down           | → `/login?next=…` | app 404   | app 404 _(route-level)_         | ✅                |

- **AZ-1** **None of the above is a security control.** `<RequireAuth>` and `<RequireRole>` decide
  what renders; the API's `403` and `404` protect the data.
- **AZ-2** Both routes admit **both** privileged roles (FR-1.1). **The scoping is the API's**, and
  the client's two components are a rendering of two different payloads, not a decision about who
  may see what.
- **AZ-3** **The interviewer's components cannot render a contact field, because their prop types
  have none** (FE-3, FE-4). This is a compile-time property, not a runtime branch — and it is what
  [../../../CLAUDE.md](../../../CLAUDE.md) means by _"don't build one candidate view that
  conditionally renders contact fields based on a client-side role check."_
- **AZ-4** An interviewer reaching an unassigned candidate's URL gets `<NotFoundView />` **because
  the API returned `404`** — not because the client checked anything (FR-7.4, XBE-9).
- **AZ-5** The Applicants section is gated on the caller's role explicitly (FR-9.6) rather than
  inheriting `/roles`'s guard, because that route is readable by interviewers.
- **AZ-6** Hiding the Move menu on a terminal application (FR-6.5) is **UX**; the API's `409` is the
  control.
- **AZ-7** Rendering name and email read-only in the contact dialog (FR-8.2) is **UX**; the API
  strips them regardless (XBE-4).

---

## Validation

### `contactDetailsSchema` — new, in [`lib/schemas/candidate.ts`](../../../src/lib/schemas/candidate.ts)

| Field      | Rule                                 | Message                                          |
| ---------- | ------------------------------------ | ------------------------------------------------ |
| `phone`    | trimmed, max 40, nullable, optional  | **"Keep the phone number under 40 characters."** |
| `location` | trimmed, max 120, nullable, optional | **"Keep the location under 120 characters."**    |
| `headline` | trimmed, max 200, nullable, optional | **"Keep the headline under 200 characters."**    |
| —          | at least one field changed           | _(Submit stays disabled; no message)_            |

- **VAL-1** **No format validation on `phone`**, matching the API. A POC that rejects a valid
  international number is worse than one that stores a string.
- **VAL-2** An emptied field submits as **`null`**, never `""` (FR-8.3, XBE-5b). The transform is in
  the schema, not in the component, so every call site gets it.
- **VAL-3** `q` is trimmed and capped at 120 before it reaches the URL, matching the shipped
  `parseJobsSearchParams`.
- **VAL-4** URL parameters are **sanitised, not forwarded**: `?stage=BANANA&page=-2` renders the
  unfiltered first page.
- **VAL-5** **An interviewer's parser drops `q` entirely** (API-4). Even a hand-edited URL carrying
  `?q=john` produces a request without it, so the API's `400` is never provoked by this client.
- **VAL-6** Client validation mirrors the API and substitutes for none of it.

---

## Error Handling

| Status / `code`        | Where          | UI behaviour                                                                                                                |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `401`                  | any call       | `apiFetch` refreshes once and replays; a second `401` redirects to `/login?next=…`                                          |
| `403`                  | any call       | `apiFetch` redirects to `/forbidden`. Unreachable through the UI; handled                                                   |
| `404`                  | detail         | `<NotFoundView />`. **Not retried** (FE-8). Covers "no such candidate", "not a candidate" and "not assigned" alike (FR-7.4) |
| `404`                  | `PATCH`        | Dialog closes; toast **"That candidate no longer exists."**; the list is invalidated                                        |
| `400 VALIDATION_ERROR` | contact dialog | Field messages via `fieldMessage`; **dialog stays open, values intact**                                                     |
| `400 VALIDATION_ERROR` | list           | Inline error card **"That filter combination isn't valid."** Should be unreachable given VAL-4, VAL-5                       |
| `500` / network        | reads          | Inline error card + **Try again**                                                                                           |
| `500` / network        | writes         | Error toast; **the dialog and its values are left as they were**                                                            |

- **ERR-1** A **query** failure renders an inline error state with a retry. A **mutation** failure
  raises a toast and leaves the form as it was — the recruiter's input is never discarded.
- **ERR-2** **A `404` is never presented as a permission problem.** No copy anywhere in this feature
  mentions assignment or access, because the client does not know which of three causes produced it
  (FR-7.5, XBE-9).
- **ERR-3** A failed Applicants-section request degrades **that section only**. The role detail above
  it still renders — one failure does not blank a page a recruiter came to for something else.
- **ERR-4** Codes are read from `errorBodyOf(error)?.code`, never the message string (API-6).

---

## Edge Cases

| ID        | Case                                                                      | Behaviour                                                                                                                        |
| --------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **EC-01** | **An interviewer pastes the URL of a candidate they are not assigned to** | `<NotFoundView />`, identical to a nonexistent id. **No copy mentions permissions** (FR-7.4, ERR-2, XBE-9)                       |
| **EC-02** | An interviewer opens `/candidates`                                        | One column of names. **No search box, no email column, no phone column** (FR-3.1, FR-3.2)                                        |
| **EC-03** | An interviewer hand-edits `?q=john` into the URL                          | The parameter is dropped before the request; the response is `200` (VAL-5, API-4)                                                |
| **EC-04** | An interviewer is unassigned while their candidate detail is open         | Their next refetch `404`s and the page becomes not-found. No re-login needed (XBE-9)                                             |
| **EC-05** | A candidate is interviewed by two panels                                  | Each interviewer's detail lists **only their own rounds** (FR-7.2)                                                               |
| **EC-06** | A candidate with no phone recorded                                        | The cell and the detail row read **`—`**; **Edit contact details** is still offered (XBE-12)                                     |
| **EC-07** | The first contact edit for a candidate                                    | `200`; the profile row is created server-side by upsert. The client sees no difference between create and update (FR-8.5)        |
| **EC-08** | A recruiter clears the phone field                                        | `null` is sent; the row renders `—` (FR-8.3, VAL-2)                                                                              |
| **EC-09** | A recruiter opens the dialog and changes nothing                          | Submit stays disabled (FR-8.4)                                                                                                   |
| **EC-10** | A recruiter edits contact details                                         | **One** request; the detail cache is written from the response, **no refetch** (FR-8.5, PERF-4)                                  |
| **EC-11** | A candidate with no applications                                          | The header card plus **"No applications yet."** (FR-4.5)                                                                         |
| **EC-12** | An application with an override in its history                            | That timeline entry is destructive-toned, labelled **"Override"**, and shows **the full reason** and its author (FR-5.4, FR-5.5) |
| **EC-13** | An override reason of 900 characters                                      | Rendered in full, wrapped. No truncation, no "show more" (FR-5.5)                                                                |
| **EC-14** | The first timeline entry, `fromStage: null`                               | Renders as **"Applied"**, not `null → Applied` (FR-5.3)                                                                          |
| **EC-15** | A candidate with five rounds and eight feedback entries                   | **One** request total; feedback comes from the same payload (FR-4.6, FR-6.2, PERF-2)                                             |
| **EC-16** | A terminal application                                                    | Its card shows the status badge; the Move menu and Schedule button are absent (FR-6.5, AZ-6)                                     |
| **EC-17** | A role with no applicants                                                 | The section renders **"No applicants yet."** (FR-9.5)                                                                            |
| **EC-18** | An interviewer opens `/roles/[id]`                                        | The role detail renders; the **Applicants section does not** (FR-9.6, AZ-5)                                                      |
| **EC-19** | Paging the Applicants section                                             | Only `applicantsPage` changes; the roles list's own `page` is untouched (FR-9.4)                                                 |
| **EC-20** | A recruiter searches an email fragment                                    | Matching rows render; the term is in the URL only, **never in storage** (DM-3)                                                   |
| **EC-21** | A stage card with a zero count on `/pipeline`                             | **Still not a link** (FR-10.3, pipeline AC-F13)                                                                                  |
| **EC-22** | `?stage=BANANA&page=-2`                                                   | The unfiltered first page; neither parameter is sent (VAL-4)                                                                     |
| **EC-23** | A candidate opens `/candidates/<their own id>`                            | The app's 404 — the route is not theirs (AZ-1)                                                                                   |
| **EC-24** | A session expires mid-edit                                                | One `401`, one refresh, one replay; the dialog keeps its values                                                                  |

---

## Security Requirements

- **SEC-1** **The interviewer's components cannot render a contact field, because their prop types
  have none** (FE-3, FE-4, AZ-3). This is the client half of the answer to brief §4 — the server
  never selects the columns, and the client never declares a field that could hold them. Neither
  half relies on the other, and neither relies on someone remembering a rule.
- **SEC-2** **There is no conditional render of a contact field anywhere in
  `features/candidate-access/`.** No `candidate.email &&`, no `role === 'RECRUITER' ? … : …` around a
  contact row. The role picks the component; the components differ in type. Verified by grep
  (AC-F31, AC-F32).
- **SEC-3** **No copy distinguishes "not assigned" from "not found"** (ERR-2, FR-7.5). The API
  deliberately makes the three causes identical, and a helpful message would undo it.
- **SEC-4** **No candidate contact detail is written to browser storage** (DM-2), and **the search
  term is not persisted** beyond the URL (DM-3), because it may be an email address.
- **SEC-5** Names, emails, phones, locations, headlines and override reasons are rendered as **text
  nodes**. No `dangerouslySetInnerHTML` appears in this feature.
- **SEC-6** Route guards, the hidden search box, the read-only name/email fields and the hidden Move
  menu are all **UX**. The API's `403`, `404`, `400` and `409` are the controls (AZ-1, AZ-4, AZ-6,
  AZ-7), and AC-M02…AC-M05 prove it from the console.
- **SEC-7** There is no create-candidate affordance and no api wrapper for one (FE-2, XBE-10).
- **SEC-8** **Known accepted gaps.** (a) Recruiter candidate data — including phone numbers — stays
  in the TanStack Query cache until the tab closes, so a shared machine shows the last-viewed
  candidate after a `Back`; the session redirect on `401` is what bounds it. (b) The search term sits
  in the URL, so a candidate's email can end up in browser history and in a pasted link. (c) There
  is no client throttle on the detail route, so an interviewer could script id probing from the
  console — every answer is an identical `404`, but nothing here slows it. (d) An interviewer
  learns a candidate's **name**, which is personal data the brief does not restrict. All four are
  accepted for a localhost POC; **(b) is the one to revisit first if this ever leaves localhost.**

---

## Performance Requirements

- **PERF-1** `/candidates` issues **exactly one** request on mount, and **exactly one** per filter or
  page change. Searching is debounced 400 ms, so typing six characters is one request.
- **PERF-2** `/candidates/[id]` issues **exactly one** request for a recruiter, however many
  applications, rounds and feedback entries that candidate has (XBE-2, FR-4.6). **No per-application
  call, no per-round call, no per-feedback call** — verified by counting requests in the Network tab
  (AC-F28).
- **PERF-3** The interviewer's detail issues **exactly one** request; the API returns the candidate
  and their scoped rounds together.
- **PERF-4** A contact edit issues **exactly two**: the `PATCH` and the list invalidation. **The
  detail is not refetched** — the response is written into the cache (FR-8.5, FE-11, EC-10).
- **PERF-5** The Applicants section issues **exactly one** request when `/roles/[id]` mounts, and one
  per applicants-page change. It does not refetch the role detail.
- **PERF-6** The pipeline drill-down issues **exactly one** request when a cell is opened, and none
  while no cell is open.
- **PERF-7** **No polling.** Refetching happens on mount, on a filter change, on a mutation settling,
  and on window focus.
- **PERF-8** `placeholderData: (previous) => previous` on the list query (FE-10), so searching never
  flashes a skeleton after the first load.
- **PERF-9** A `404` on the detail is **not retried** (FE-8).
- **PERF-10** The recruiter detail is not virtualised. A candidate has a handful of applications; if
  one ever exceeds 25, the fix is pagination on the API side.

---

## Acceptance Criteria

Verified by hand, in the browser, with DevTools open. Roles: **R** = recruiter, **I1** and **I2** =
the two seeded interviewers, **C** = candidate. `$CAND` is a candidate **I1 is assigned to**;
`$CAND_OTHER` is a seeded candidate with applications but **no interviews at all** (backend FR-8.3).

`AC-F*` are functional checks driven through the UI. `AC-M*` additionally require a running backend
and a seeded database.

### The sharpest check

- **AC-F01** — **Given** I1 who is **not** assigned to `$CAND_OTHER`, **when**
  `/candidates/$CAND_OTHER` is opened by URL, **then** `<NotFoundView />` renders, and **no copy on
  the page mentions permissions, access or assignment** (FR-7.4, ERR-2, EC-01).
- **AC-F02** — **Given** the same, **when** the Network tab is read, **then** the response was
  **`404`** — not `403` — and it was **not retried** (XBE-9, FE-8, PERF-9).
- **AC-F03** — **Given** I1, **when** `/candidates` loads, **then** `$CAND_OTHER` does **not**
  appear, at any page or filter (XBE-1).
- **AC-F04** — **Given** I1, **when** R removes their last assignment with `$CAND` and I1 reloads
  `/candidates/$CAND` **without logging out**, **then** the page becomes the not-found view (EC-04).

### The interviewer's views

- **AC-F05** — **Given** I1, **when** `/candidates` loads, **then** the table has **one data column,
  Name**, and there is **no search input** on the page (FR-3.1, FR-3.2, EC-02).
- **AC-F06** — **Given** the same page, **when** the DOM is inspected, **then** **no** email address
  and **no** phone number appears anywhere (SEC-1).
- **AC-F07** — **Given** I1, **when** `/candidates?q=john` is opened by URL, **then** the request in
  the Network tab carries **no `q` parameter** and the response is `200` (VAL-5, API-4, EC-03).
- **AC-F08** — **Given** I1 assigned to `$CAND`, **when** `/candidates/$CAND` loads, **then** the
  page shows the **name** and a list of **their own rounds**, and **nothing else** — no
  applications, no stage timeline, no feedback (FR-7.3, XBE-3).
- **AC-F09** — **Given** a candidate interviewed by two panels, **when** I1 opens them, **then**
  only I1's rounds are listed (FR-7.2, EC-05).
- **AC-F10** — **Given** I1, **when** `/candidates` loads with no assignments, **then**
  **"You are not assigned to any candidates yet."** renders with its sub-line (FR-3.3).

### The recruiter's list

- **AC-F11** — **Given** R, **when** `/candidates` loads, **then** the table shows **Name, Email,
  Phone, Applications, Joined** (FR-2.1).
- **AC-F12** — **Given** a candidate with no phone, **when** the row renders, **then** the cell reads
  **`—`**, not blank (EC-06).
- **AC-F13** — **Given** R, **when** an email fragment is typed in the search box, **then** after
  ~400 ms **exactly one** request fires and matching rows render (FR-2.4, PERF-1, EC-20).
- **AC-F14** — **Given** a search in progress, **when** the table is watched, **then** the previous
  rows stay visible — no skeleton flash (PERF-8).
- **AC-F15** — **Given** `?stage=BANANA&page=-2`, **when** the page loads, **then** the unfiltered
  first page renders and neither parameter is sent (VAL-4, EC-22).

### The recruiter's detail

- **AC-F16** — **Given** R, **when** `/candidates/$CAND` loads, **then** the header shows name,
  email, phone, location and headline, and there is an **Edit contact details** button (FR-4.2).
- **AC-F17** — **Given** the same, **when** an application card is read, **then** it shows the role
  title, current stage, status, time at stage, a stage timeline, its rounds and their feedback
  (FR-4.3).
- **AC-F18** — **Given** an application whose history contains an override, **when** the timeline
  renders, **then** that entry is destructive-toned, labelled **"Override"**, and shows the **full
  reason** and the recruiter who performed it (FR-5.4, FR-5.5, EC-12).
- **AC-F19** — **Given** an override reason of 900 characters, **when** it renders, **then** it is
  shown in full — no truncation, no "show more" (EC-13).
- **AC-F20** — **Given** any timeline, **when** its first entry renders, **then** it reads
  **"Applied"**, not `null → Applied` (FR-5.3, EC-14).
- **AC-F21** — **Given** a terminal application, **when** its card renders, **then** the Move menu
  and Schedule interview button are **absent** (FR-6.5, EC-16).
- **AC-F22** — **Given** a candidate with no applications, **when** the detail loads, **then** the
  header plus **"No applications yet."** renders (FR-4.5, EC-11).

### Editing contact details

- **AC-F23** — **Given** R, **when** **Edit contact details** is clicked, **then** the dialog shows
  Phone, Location and Headline editable, and **Name and email read-only** with **"Managed by the
  candidate's account."** (FR-8.2).
- **AC-F24** — **Given** the dialog with nothing changed, **when** it is inspected, **then** Submit
  is **disabled** (FR-8.4, EC-09).
- **AC-F25** — **Given** a phone typed, **when** Submit is pressed, **then** the dialog closes, a
  toast reads **"Contact details updated."**, and the detail shows the new number (FR-8.5).
- **AC-F26** — **Given** the same, **when** the Network tab is read, **then** **exactly two**
  requests fired — the `PATCH` and the list invalidation — and **no `GET` of the detail** (PERF-4,
  EC-10).
- **AC-F27** — **Given** a stored phone, **when** the field is emptied and saved, **then** the
  request body carries **`null`**, not `""`, and the row renders `—` (FR-8.3, VAL-2, EC-08).

### Request counts

- **AC-F28** — **Given** a candidate with **five rounds and eight feedback entries**, **when** R
  opens their detail, **then** the Network tab shows **exactly one** request — no per-application,
  per-round or per-feedback call (PERF-2, FR-6.2, EC-15).
- **AC-F29** — **Given** R on `/roles/[id]`, **when** the page loads, **then** the Applicants section
  issues **exactly one** `GET /api/candidates?roleId=…` (PERF-5).
- **AC-F30** — **Given** R on `/pipeline` with no cell open, **when** the Network tab is read,
  **then** **no** `/api/candidates` request has been made; **when** a non-zero cell is clicked,
  **then** exactly one is (PERF-6, FR-10.1).

### Structure — the grep checks a reviewer can run

- **AC-F31** — **Given** the repository, **when** `features/candidate-access/types.ts` is read, **then**
  `InterviewerCandidate` declares **exactly `id` and `name`**, and **no** `email`, `phone`,
  `applications`, `stageHistory` or `feedback` — **optional or otherwise** (FE-3, FR-11.1, SEC-1).
- **AC-F32** — **Given** the repository, **when**
  `grep -rnE "candidate\.(email|phone)|role === ['\"]RECRUITER['\"]" src/features/candidate-access/` is
  run, **then** **no match is a conditional around a contact field** — the only role comparisons are
  the two component dispatches (FE-4, SEC-2, FR-11.2).
- **AC-F33** — **Given** the repository, **when** `[candidateId]/page.tsx` and
  `CandidatesListView.tsx` are read, **then** each dispatches on role to two components, and
  **neither component accepts the other's props type** (FE-4).
- **AC-F34** — **Given** the repository, **when**
  `grep -rniE "not assigned|no access|permission" src/features/candidate-access/` is run, **then** no
  user-facing copy matches (ERR-2, SEC-3).
- **AC-F35** — **Given** the repository, **when** `features/candidate-access/api/candidates.api.ts` is
  read, **then** it exports **three** functions and **no `createCandidate`** (FE-2, SEC-7,
  FR-11.4).
- **AC-F36** — **Given** the repository, **when**
  `grep -rn "dangerouslySetInnerHTML" src/features/candidate-access/` is run, **then** it returns nothing
  (SEC-5).

### The job → applicants path, and the drill-down revision

- **AC-F37** — **Given** R on `/roles/[id]` for a role with applicants, **when** the page loads,
  **then** an **Applicants** section renders with **Candidate, Stage, Applied, View** and a count in
  its heading (FR-9.1, FR-9.2).
- **AC-F38** — **Given** that section, **when** **View** is clicked, **then** the browser navigates
  to `/candidates/{id}`, completing the walkthrough's job → applicants → candidate path (FR-9.3).
- **AC-F39** — **Given** **I1** on `/roles/[id]`, **when** the page loads, **then** the role detail
  renders and the **Applicants section does not** (FR-9.6, AZ-5, EC-18).
- **AC-F40** — **Given** R paging the Applicants section, **when** the URL is read, **then** only
  `applicantsPage` changed (FR-9.4, EC-19).
- **AC-F41** — **Given** R on `/pipeline`, **when** a stage card with a **non-zero** count is
  clicked, **then** a real candidate list renders below the board — **not** the old placeholder
  (FR-10.1, the Revision).
- **AC-F42** — **Given** the same board, **when** a **zero-count** card is clicked, **then** nothing
  navigates — it is still not a link (FR-10.3, EC-21, pipeline AC-F13).

### Cross-cutting invariants

- **AC-M01** — **Given** a full session as I1 — the candidate list, a candidate detail, and their
  round detail — **when** every response body in the Network tab is searched, **then** the strings
  `"email"`, `"phone"`, `"applications"`, `"stageHistory"` and `"feedback"` appear **zero** times.
  _This is the invariant the POC is judged on; verified in the payload, not the DOM_ (XBE-3,
  SEC-1).
- **AC-M02** — **Given** `$CAND` has a phone recorded by R, **when** I1 completes a full session —
  `/candidates`, `/candidates/$CAND`, `/my-interviews`, their round detail and its feedback — **then
  that phone string appears in no response body from any endpoint.** _The contact detail appears in
  no response to any interviewer, anywhere in the app_ (SEC-1).
- **AC-M03** — **Given** an **interviewer** session, **when**
  `fetch('<API>/api/candidates/<$CAND_OTHER>', …)` and
  `fetch('<API>/api/candidates/<$CAND>', { method: 'PATCH', body: '{"phone":"1"}' }, …)` are issued
  **by hand from the DevTools console**, **then** the first is **`404`** and the second is
  **`403`**. _This is the criterion that proves neither the missing column nor the route guard is
  what is protecting the data_ (AZ-1, SEC-6, XBE-9).
- **AC-M04** — **Given** an **interviewer** session, **when**
  `fetch('<API>/api/candidates?q=john', …)` is issued **by hand from the console**, **then** the
  response is **`400`** — the missing search box is not the control (XBE-8, SEC-6).
- **AC-M05** — **Given** an **R** session, **when** a `PATCH` carrying
  `{"phone":"1","email":"attacker@evil.test","name":"X"}` is issued **by hand from the console**,
  **then** the response is **`200`** and the candidate's email and name are **unchanged** on reload.
  _This proves the read-only fields in the dialog are not what protects them_ (XBE-4, AZ-7).
- **AC-M06** — **Given** a **candidate** session, **when** `fetch('<API>/api/candidates', …)` is
  issued **by hand from the console**, **then** the response is **`403`** (AZ-1).
- **AC-M07** — **Given** a full session as R including a search by email and a contact edit, **when**
  `localStorage`, `sessionStorage` and `document.cookie` are read in the console at the end, **then**
  none contains a token, a phone number, an email, **or the search term** (DM-1, DM-2, DM-3,
  SEC-4).
- **AC-M08** — **Given** any role, **when** `fetch('<API>/api/candidates', { method: 'POST', … })` is
  issued **by hand from the console**, **then** the response is **`404`** — the endpoint does not
  exist (XBE-10, SEC-7).
- **AC-M09** — **Given** an R session with an expired access token, **when** a contact edit is
  saved, **then** the Network tab shows one `401`, one `POST /api/auth/refresh`, and one successful
  replay, and the dialog keeps its values throughout (EC-24).

---

## Out of Scope

| Excluded                                             | Why                                                                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Creating a candidate                                 | There is no `POST /api/candidates` (D-3, XBE-10)                                                                  |
| Editing a candidate's name or email                  | Identity belongs to the account (D-4, XBE-4)                                                                      |
| Candidate self-service profile editing               | The candidate's own surface is `/profile` and `/applications`, both shipped and both read-only                    |
| Deleting or anonymising a candidate                  | The API has no such path, and a GDPR-shaped anonymise is a real feature rather than a button                      |
| Résumé or document upload                            | No storage layer exists in this app                                                                               |
| Recruiter notes or tags on a candidate               | A separate record with its own authorization question; feedback already covers assessment                         |
| Searching by phone                                   | No requirement asks for it and the API does not support it                                                        |
| An interviewer search box                            | D-6. `?q=` is a `400` for them, and a search over people is the affordance this feature denies                    |
| Bulk actions on candidates                           | Multiplies the conflict surface for a convenience nobody asked for                                                |
| A candidate-facing view of their own pipeline detail | `/applications` already shows a candidate their stage; anything more is a product decision this POC does not make |

---

## Dependencies

**Blocked by:**
[../../../../backend/specs/features/candidate-access/spec.md](../../../../backend/specs/features/candidate-access/spec.md).
**Nothing here can be verified until that ships.**
[../interviews/spec.md](../interviews/spec.md) — the schedule dialog and the round links.
[../feedback/spec.md](../feedback/spec.md) — `<FeedbackList>` renders on the detail (FE-7).
[../pipeline/spec.md](../pipeline/spec.md) — the Move menu and the override dialog (FE-6), and this
spec revises its drill-down.

**Blocks:** nothing. This is the last feature in the sequence; see [../README.md](../../README.md).

**Revises:** [../pipeline/spec.md](../pipeline/spec.md) FR-3.7, FR-4.2, FR-4.3, FR-4.4, its
_Drill-down unavailable_ state row — see the Revision section. Pipeline AC-F13 is unchanged and
remains true.

**New npm dependencies:** **none.** `Table`, `Card`, `Badge`, `Button`, `Dialog`, `Select`, `Input`,
`Label`, `Separator` and `Skeleton` are already vendored in
[`src/components/ui/`](../../../src/components/ui/).

**Environment variables:** none.

**Modified existing files**

| Path                                                                                        | Change                                                                                        |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`src/app/(app)/roles/[roleId]/page.tsx`](<../../../src/app/(app)/roles/[roleId]/page.tsx>) | The Applicants section (FR-9)                                                                 |
| `src/app/(app)/pipeline/page.tsx`                                                           | The real drill-down (FR-10, the Revision)                                                     |
| [`src/app/(app)/layout.tsx`](<../../../src/app/(app)/layout.tsx>)                           | Candidates added for both privileged roles                                                    |
| [`CLAUDE.md`](../../../CLAUDE.md)                                                           | Feature table row; the "Candidate detail" bullet under _Views this POC needs_ now points here |

**Framework note.** **This is Next.js 16; its APIs differ from older versions.** Route `params` are
a **Promise**: `[candidateId]/page.tsx` must `await params` and pass the raw segment to
`parseCandidateId` rather than assuming a number (FE-9). `CandidatesListView`, `RoleApplicants` and
`PipelineDrillDown` read `useSearchParams()`, so each page **must** wrap them in `<Suspense>` or
`next build` fails (FE-1). `PageProps<'/candidates/[candidateId]'>` and `LayoutProps<'/candidates'>`
are globally generated and are the types the new files use.

**External dependencies:** none.

**Cross-repo:** a change to the three endpoints, the two projections, the `?q=` role restriction,
the `PATCH` field list, or the `404`-not-`403` rule must be made in **both** specs — see
[../../../../backend/specs/features/candidate-access/spec.md](../../../../backend/specs/features/candidate-access/spec.md).
