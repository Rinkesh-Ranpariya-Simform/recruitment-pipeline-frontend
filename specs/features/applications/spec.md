# Applications — The Recruiter's Application Surface & the Stage Timeline (Frontend)

> **Status:** ✅ approved · implemented
> **Feature slug:** `applications`
> **Scope:** `frontend/` — Next 16 (App Router) + TanStack Query + base-ui + Tailwind
> **Counterpart:** [../../../../backend/specs/features/applications/spec.md](../../../../backend/specs/features/applications/spec.md)
> **Depends on:** [../candidate/spec.md](../candidate/spec.md) · [../pipeline/spec.md](../pipeline/spec.md) · [../interviews/spec.md](../interviews/spec.md) — all shipped
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md) §3.1, §3.5

---

## Goal

Reorganise the recruiter's surfaces around **the candidate's process** rather than around the tables
the API happens to expose, and give both audiences one picture of it.

1. **Applications** — a table of everyone who has applied, with one action per row: *Start phone
   screen*.
2. **Interviews** — the same table, filtered to candidates already in a process. One row per person
   per requisition, not one per round.
3. **The application detail** — timeline at the top, rounds as cards below it.
4. **The round detail** — the leaf. Panel, feedback, and **Select / Reject** at the top.
5. **The candidate's own page** — the same timeline, so they can see where they stand.

Success means a recruiter can run a whole hiring process without once needing to know that stages,
rounds and outcomes are three different tables.

---

## Background / Context

The surfaces before this feature were shaped by the API, not by the work:

| Route           | Was                                        | Problem                                                                  |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `/applications` | Candidate-only, cards with stage + status  | A candidate could read "Stage: Interview" and learn nothing else         |
| `/interviews`   | Every **round**, flat                      | One person appeared once per round; "who am I running a process for?" had to be answered by eye |
| `/interviews/:id` | Mark completed · Cancel                  | Completing a round said nothing about how it went, and moved nobody      |
| `/pipeline`     | Counts and ageing per role per stage       | No people in it at all, by design                                        |

There was **no page for one candidate's process.** The thing a recruiter actually works on had no
URL.

### Decisions settled during the interview

| #    | Question                                        | Decision                                                                                                                                                | Recorded in    |
| ---- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| D-1  | A new route for the recruiter's applications?   | **No** — `/applications` serves both, dispatching on role, exactly as `/interviews/:id` already does                                                    | FR-1.1, FE-1   |
| D-2  | What is `/interviews` now?                      | The same table with `hasInterviews=true` pinned. One filter's difference, expressed as one filter                                                        | FR-6.1         |
| D-3  | Where does a recruiter open a round from?       | The application detail page. It is the page that shows what rounds there already are                                                                     | FR-4.4         |
| D-4  | Does the round page keep "Mark completed"?      | **No.** A round is completed by deciding it. Two buttons let a recruiter close a round with nobody having said what happened                             | FR-5.2         |
| D-5  | Select / Reject behind a confirmation?          | **Yes.** Neither can be undone — reversing one is a stage override with a reason                                                                          | FR-5.3         |
| D-6  | Is the timeline rendered twice?                 | **No.** One `StageTimeline` component, both audiences, from one server-built array                                                                       | FR-3.1         |
| D-7  | Does a candidate's timeline link to rounds?     | **No.** They have no `/interviews/:id` route; every request from one would be a `403`. `linkRounds` is a routing fact, not a disclosure one              | FR-3.4         |
| D-8  | Is the round list on the detail page a table?   | **Cards.** Each is a whole click target with one destination, and a table row with six columns and no actions is a link pretending to be data            | FR-4.5         |
| D-9  | Does the nav gain an entry?                     | **Yes**, *Applications*, before *Interviews* — the order is the workflow                                                                                 | FR-7.1         |

---

## Amendment A — the routing, revised after the walkthrough

The feature above put the recruiter's process page at `/applications/:id` and left the round page
flat at `/interviews/:id`. Walking it through showed that arrangement reads backwards: `/applications`
became two pages doing two jobs — an inbox of new applicants *and* the control room for processes
already running — while `/interviews` listed the processes but owned none of them.

The routes are now three levels, and each level is one question:

```
/interviews                              who am I running a process for?
/interviews/:applicationId               where is this person, and what rounds have there been?
/interviews/:applicationId/:interviewId  what happened in this round, and what do I decide?
```

| #    | Question                                               | Decision                                                                                                                                                                              | Supersedes |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| A-1  | Where does the recruiter's process page live?          | **`/interviews/:applicationId`.** It is the middle of the three levels above — the list of processes leads to it, and its rounds lead out of it                                        | FR-4       |
| A-2  | What is left on `/applications`?                       | **The inbox, and only that:** Candidate · Role · Applied · action. No stage, no status, no round count — those describe a process that has started, and a started process is one level down | FR-1.3     |
| A-3  | Is a row on `/applications` clickable?                 | **No.** The page asks for exactly one decision and the button is the only way out of a row. A second target would fork the path before that decision is made                          | FR-1.3     |
| A-4  | What happens after *Start phone screen*?               | **Navigate to `/interviews`.** The round it created is invisible from the inbox, so staying put would make a successful action read as a no-op                                         | FR-2.2     |
| A-5  | Does `/interviews` keep an action column?              | **No.** A row is a whole process, and every action belongs to one round inside it. The row's only job is to open the process, so the whole row is the target                           | FR-6.1     |
| A-6  | Flat round route, or nested?                           | **Nested.** A round is a step inside one person's process and is never reached on its own; nesting makes the back link up one segment exactly the page that linked here                | FR-5       |
| A-7  | What about the interviewer's round page?               | **Moved to `/my-interviews/:interviewId`**, under the list they land on. Their projection carries no application id — deliberately — so they could not build a nested path. The route and the projection now agree, and `/interviews/*` is recruiter-only | D-1 (interviews) |
| A-8  | Is `/applications/:id` gone?                           | **Kept, and it redirects** a recruiter to `/interviews/:id` (replace, not push). It is still the candidate's own page                                                                  | FR-8.2     |
| A-9  | Do the two segments on the leaf have to agree?         | **Yes.** `/interviews/999/80033` is a 404: the API authorizes on the round's id alone, so without this check the page would render a real round under a breadcrumb pointing at somebody else's process. A correctness check on the URL's own claims, not a security one | FR-5       |

**No backend or schema change.** Every id the new paths need was already in the payloads —
`GET /api/applications/:id` carries its rounds, and `GET /api/interviews/:id` carries its
application — so this amendment is routing and columns only.

Superseding notes on earlier decisions: **D-1** still holds for `/applications` itself (one route,
two projections) but no longer for its detail route, which is a candidate's page with a redirect for
recruiters (A-8). **D-7** still holds — a candidate's timeline links to nothing — but the mechanism
is now `roundBasePath` rather than `linkRounds`, because a round's href can no longer be built from
a node alone.

---

## Functional requirements

### FR-1 — `/applications`, two audiences

- **FR-1.1** The route guard widens to `['CANDIDATE', 'RECRUITER']`. An interviewer gets the app's
  404, matching the API's `403`.
- **FR-1.2** `ApplicationsDispatch` chooses the view from `useAuth()`. **The two branches do not
  share a props type**, so a mistaken dispatch is a compile error rather than a recruiter's payload
  arriving at a component written for a candidate. The dispatch protects nothing — the API picks its
  projection from the verified token.
- **FR-1.3** The recruiter's table:
  **Candidate · Role · Stage · Status · Rounds · Applied · Action.** No email column, because the
  payload has none. The **recruiter's** vocabulary (`features/pipeline/labels.ts`) — "Rejected", not
  "Not selected".
- **FR-1.4** Two filter controls — **Role** and **Status** — plus the page, all in the URL, so Back
  works and a filtered list is linkable. Role leads, because *"who applied to this req?"* is the
  question a recruiter asks before narrowing by status.
- **FR-1.5** The role filter reads page one of `GET /api/roles`, **both statuses**: filtering to
  `OPEN` would hide the applications to a requisition that has just closed, which are exactly the
  ones somebody still has to write to. A `roleId` that is off page one still filters, and the trigger
  names the id rather than falling back to "All roles" — a scoped deep link must never silently
  become an unscoped list.

### FR-2 — Start phone screen

- **FR-2.1** One button per row, named for the action rather than the mechanism. *Select* would have
  been shorter and would have meant something different on the round page.
- **FR-2.2** Three states: **Start phone screen** (live, no rounds) · **View process** (has rounds) ·
  **View** (closed). Once a round exists the useful action is opening the process, not starting a
  second phone screen by accident.
- **FR-2.3** It creates a `PHONE_SCREEN` round at `SCREEN` with **no date**, and does not move the
  candidate's stage.
- **FR-2.4** Hiding it on a closed application is a convenience. The API's
  `409 APPLICATION_NOT_ACTIVE` is the check, and it is handled.

### FR-3 — The stage transition timeline

- **FR-3.1** One `StageTimeline` component, rendering the server-built array:
  `Applied → Screened (phone screen) → Interview (technical) → Interview (system design) → Not selected`.
- **FR-3.2** **Green passed, red rejected, neutral pending** — one rule, in
  `TIMELINE_STATE_CLASSES`, so the two call sites cannot disagree. `PENDING` is deliberately not a
  warning tone: an undecided round is the normal state of a round.
- **FR-3.3** An `<ol>`, because the order is the meaning. Every node carries an icon and a
  visually-hidden state word, so **colour never carries meaning alone**.
- **FR-3.4** `linkRounds` makes each round node a link — recruiters only, because a candidate has no
  such route. Nothing is withheld from either: the node type has no assessor, rating or note in it.
- **FR-3.5** It wraps rather than scrolling sideways. A timeline you have to drag is one nobody reads
  to the end of.
- **FR-3.6** A **third** stage vocabulary, `TIMELINE_STAGE_LABELS`, in the past tense: "Screened",
  not "Screening" (which beside a green tick would say the candidate is being screened right now) and
  not "Screen" (a board column heading).

### FR-4 — `/applications/:id`, the recruiter's process page

- **FR-4.1** Header: name, role, status, stage + ageing, and **Schedule interview** while live.
- **FR-4.2** Then **Progress** — the timeline, with `linkRounds`.
- **FR-4.3** Then **Interviews** — the rounds as cards, oldest first.
- **FR-4.4** The schedule dialog's one call site. It moved here from the round page: "schedule
  another round" belongs where the existing rounds are visible.
- **FR-4.5** A round card shows type, stage, verdict, date (or **No date set**, in a tone that gets
  noticed) and panel (or **Unassigned**). Its left border carries the verdict in the same colours the
  timeline uses, and a badge says it in words.
- **FR-4.6** **No Select / Reject here**, deliberately: a verdict belongs to the round that produced
  it, and offering it here would ask a recruiter to advance somebody without naming what they passed.

### FR-5 — `/interviews/:id`, the leaf

- **FR-5.1** The back link points at the **application**, not at a list of rounds. After deciding a
  round, the thing a recruiter wants is the timeline that decision just moved.
- **FR-5.2** **Select / Reject** lead the action row. *Mark completed* is gone (D-4); *Set date* /
  *Edit date* and *Cancel interview* follow.
- **FR-5.3** Both verdicts confirm, and the copy says what each does to the **application** — the
  part a recruiter cannot see from here and the part they would regret.
- **FR-5.4** Offered only while the round is scheduled, undecided, and on a live application. **That
  is an affordance**; the four `409`s are the check and each is handled by name, because a row can go
  stale in another tab.
- **FR-5.5** `INVALID_STAGE_TRANSITION` is the one refusal a recruiter can act on, so its message
  names the way through — a stage override, which records why.
- **FR-5.6** Once decided, the verdict shows as a badge naming who made it, and in the detail list
  with when.

### FR-6 — `/interviews`, the list

- **FR-6.1** Now the applications table with `hasInterviews: true` pinned — one row per candidate per
  requisition.
- **FR-6.2** `RecruiterInterviewsTable` and `InterviewsListView` are **deleted**. A recruiter's list
  of rounds now exists only inside one application, as cards.
- **FR-6.3** `MyInterviewsView` is untouched: an interviewer's list is a personal schedule of rounds,
  which is the right unit for them.
- **FR-6.4** The pinned filter is not written into the route's own links, so `/interviews` does not
  spell out a fact it already carries.

### FR-7 — Nav and cache

- **FR-7.1** *Applications* joins the recruiter's Hiring section, **before** *Interviews*: a
  recruiter starts at Applications, starts a phone screen, and the candidate appears under
  Interviews.
- **FR-7.2** It is the **same href and icon** as the candidate's *My applications*. One route, two
  projections; a second path would suggest two pages.
- **FR-7.3** Every interviews mutation invalidates the applications keys too. Without that, a
  recruiter clicks Select and watches the timeline behind the dialog not move.
- **FR-7.4** **No optimistic updates**, matching every shipped mutation — and here it matters most:
  whether a Select advances the candidate depends on the stage graph and on where they already are,
  which is the server's answer, not a guess to correct later.

### FR-8 — The candidate's side

- **FR-8.1** Each application card gains a **Progress** section with the timeline, and a *View
  details* link.
- **FR-8.2** `/applications/:id` shows the same facts with room to breathe. **No extra disclosure
  behind the detail route** — the payload is identical, because the backend uses one projection for
  both.
- **FR-8.3** Another candidate's id renders the app's 404, and the client cannot tell that from a
  nonexistent one.

---

## Files

| Path                                                       | Change  |
| ---------------------------------------------------------- | ------- |
| `features/applications/types.ts`                           | Timeline + recruiter shapes |
| `features/applications/labels.ts`                          | Timeline labels, colours, state words |
| `features/applications/search-params.ts`                   | **new** |
| `features/applications/permissions.ts`                     | **new** |
| `features/applications/api/applications.api.ts`            | Recruiter list + both by-id reads |
| `features/applications/hooks/useApplicationsQuery.ts`      | Recruiter list, both details |
| `features/applications/components/StageTimeline.tsx`       | **new** — the shared timeline |
| `…/RecruiterApplicationsView.tsx`, `…Table.tsx`, `…Pagination.tsx`, `ApplicationsStatusFilter.tsx`, `ApplicationsRoleFilter.tsx` | **new** |
| `…/StartPhoneScreenButton.tsx`, `InterviewRoundCard.tsx`   | **new** |
| `…/RecruiterApplicationDetail.tsx`, `CandidateApplicationDetail.tsx`, `ApplicationsDispatch.tsx` | **new** |
| `features/applications/components/ApplicationCard.tsx`     | Timeline added |
| `features/interviews/components/InterviewDecisionActions.tsx`, `EditInterviewDateDialog.tsx`, `InterviewOutcomeBadge.tsx` | **new** |
| `features/interviews/components/RecruiterInterviewDetail.tsx` | Decision pair, date edit, back link |
| `features/interviews/components/ScheduleInterviewDialog.tsx` | Date optional |
| `features/interviews/components/InterviewsListView.tsx`    | **deleted** |
| `features/interviews/components/InterviewsTable.tsx`       | Recruiter table removed; nullable date |
| `lib/schemas/interview.ts`                                 | Optional date, edit schema, the two conversions |
| `app/(app)/applications/layout.tsx`, `page.tsx`, `[applicationId]/page.tsx` | Widened / **new** |
| `app/(app)/interviews/page.tsx`                            | Now the in-process table |
| `app/(app)/layout.tsx`                                     | Nav entry |

---

## Acceptance criteria

| #      | Check                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------- |
| AC-F01 | An interviewer at `/applications` gets the app's 404                                            |
| AC-F02 | A recruiter sees the table; a candidate sees their cards — same URL                             |
| AC-F03 | Start phone screen creates a dateless round and the row becomes **View process**                |
| AC-F04 | The button does not also navigate when the row is clickable                                     |
| AC-F05 | `/interviews` lists one row per candidate per requisition, not one per round                    |
| AC-F05a| Choosing a role narrows the table to that requisition and puts `?roleId=` in the URL            |
| AC-F05b| A `?roleId=` off page one of the roles list still filters, and the trigger names the id         |
| AC-F06 | `?hasInterviews=true` is absent from `/interviews`'s own page links                             |
| AC-F07 | The detail page shows the timeline above the round cards                                        |
| AC-F08 | A round card with no date says **No date set**, not a blank                                     |
| AC-F09 | Select confirms, then the timeline gains a green node and the stage badge moves                 |
| AC-F10 | Reject confirms, then the timeline ends in a red node and the status reads Rejected             |
| AC-F11 | A stage-skipping Select shows the message naming a stage override                               |
| AC-F12 | Select / Reject disappear once a verdict exists, replaced by the verdict badge                  |
| AC-F13 | Set date on an undated round fills it; clearing it returns the round to **No date yet**         |
| AC-F14 | A candidate's card shows the timeline and no interviewer, rating or note                        |
| AC-F15 | A candidate's timeline nodes are not links                                                      |
| AC-F16 | Every timeline node is readable with colour off — icon plus a screen-reader state word          |
| AC-F17 | The timeline wraps on a phone with no horizontal page scroll                                    |
| AC-F18 | `npx tsc --noEmit` and `npm run lint` are clean                                                 |

---

## Out of scope

- Contact details anywhere — `candidate-access`
- Candidate search
- Editing or undoing a decision from the UI — a stage override, on the pipeline board
- Changing `/pipeline`, `/my-interviews` or the interviewer's round detail beyond the nullable date
