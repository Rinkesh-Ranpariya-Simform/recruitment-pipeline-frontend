# Feedback — Rating, Notes and the Panel View (Frontend)

> **Status:** Draft — awaiting approval. `plan.md` is a later artifact and does not exist yet.
> **Feature slug:** `feedback`
> **Scope:** `frontend/` — Next.js 16 App Router, React 19, TanStack Query
> **Counterpart:** [../../../../backend/specs/features/feedback/spec.md](../../../../backend/specs/features/feedback/spec.md)
> **Depends on:** [../interviews/spec.md](../interviews/spec.md) — must ship first · [../pipeline/spec.md](../pipeline/spec.md)
> **Blocked by:** the backend counterpart. **Nothing here can be verified until that ships.**
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md) §3.2, §3.4, §3.6

---

## Goal

1. Give an assigned interviewer a **rating and notes form** on the round they are conducting, with
   the rating bounded to the five values the API accepts.
2. Show an interviewer **their panel colleagues' feedback**, which is the brief's opening complaint
   being fixed — and make it clear whose is whose.
3. Handle the `409` that the concurrency policy produces as a **route into editing**, not a dead
   end: you have already written feedback, here it is, change it.
4. Show recruiters every panellist's feedback, **read-only**, with no form and no edit affordance.
5. Render this on a screen that carries **no candidate contact detail**, since §3.6 names the
   feedback surface specifically.

Success means: two panellists submit at the same moment and both see their own entry land; a third
interviewer who is not on the round cannot reach the screen at all; and a recruiter reads all of it
without a Submit button in sight.

---

## Background / Context

Three parts of the brief meet on this screen:

> After each round, the assigned interviewer submits structured feedback (e.g. a rating plus notes)
> tied to that round and that candidate.
> — §3.2

> Two interviewers may submit feedback for the same round at close to the same time (e.g. a panel
> interview).
> — §3.4

> Candidate contact details … never to interviewers, under any circumstance, **including through a
> feedback-submission endpoint that happens to also carry candidate data**.
> — §3.6

And the background paragraph names the problem this screen exists to solve:

> Interviewers can't see prior feedback before their round.

The API's answer to §3.4 is **one row per interviewer per round**: two panellists both persist; the
same person twice is a `409`. That decision is what shapes this UI — the form is a create-or-edit,
not a create, and the `409` is a state transition rather than an error to apologise for.

### Translation from the request

| Described | Built as |
|---|---|
| `Rating: ⭐⭐⭐⭐☆` | A five-button radio group, keyboard-operable, emitting integers 1–5 (D-2) |
| `Notes: Strong backend fundamentals...` | A `<Textarea>`, required |
| `[Submit Feedback]` | One button that submits or saves, depending on whether feedback already exists |
| `Feedback: Interviewer A: 4/5, Interviewer B: 5/5` (recruiter view) | A read-only list on the recruiter's round detail and candidate detail |

### Current state of `frontend/`

|                | Today, assuming interviews has shipped |
| -------------- | ------ |
| `/interviews/[interviewId]` | Exists, with a named slot for this feature's components (interviews FR-3.6, FR-5.5) |
| Forms | `react-hook-form` + `@hookform/resolvers/zod`, schemas under `src/lib/schemas/` |
| Field errors | `fieldMessage(details, field)` in [`src/lib/error-details.ts`](../../../src/lib/error-details.ts) |
| Primitives | `Textarea`, `Button`, `Card`, `Badge`, `Field`, `Label`, `Separator`, `Skeleton`. **No rating or star component is vendored** |
| Mutation pattern | `useWriteSuccess()` — invalidate + toast; invalidation `onSettled`; **no optimistic updates anywhere** |
| Feedback | **nothing** |

### Decisions carried from the interview

| # | Question | Decision |
|---|---|---|
| D-1 | Where does the form live? | Inline on `/interviews/[interviewId]`, not a separate route. A form behind a navigation is a form people skip |
| D-2 | Star component? | **Hand-rolled**, from `Button` + `lucide-react`'s `StarIcon`. No rating library, and a native `radiogroup` for keyboard and screen-reader support |
| D-3 | Create and edit: one component or two? | **One.** The API's `409` makes a second `POST` an edit, so the form is a create-or-edit from the start and the `409` is a state it enters |
| D-4 | Does the interviewer see colleagues' feedback before writing? | **Yes**, and it renders above the form. That is the brief's opening complaint being fixed |
| D-5 | Can a recruiter write or edit? | **No.** They see a read-only list with no form and no edit control |
| D-6 | Where else does feedback render? | The recruiter's **candidate detail**, from the candidate payload — **not** by calling this feature's endpoint per round (D-6 is a performance decision as much as a scoping one) |
| D-7 | New dependency? | **None** |

---

## Users / Actors

| Actor | Sees |
|---|---|
| Anonymous | `/login` with `?next=` |
| Candidate | Nothing. No route here is reachable |
| Interviewer (assigned) | The panel's feedback, and a form for their own |
| Interviewer (not assigned) | The app's not-found view — the whole page, not just this section |
| Recruiter | Every panellist's feedback, **read-only** |

**Deliberate trade-offs:** an interviewer can read their colleagues' ratings before writing their
own (D-4). That is the stated problem being fixed, and the anchoring risk it creates is named in
SEC-5 rather than mitigated by a rule nobody asked for. A recruiter cannot write feedback, because
they did not conduct the interview.

---

## User Stories

| ID | Story |
|---|---|
| **US-01** | As an interviewer, I want to rate and write notes on my round, so that my assessment is on the record. |
| **US-02** | As an interviewer, I want to read what my colleagues wrote, so that I am not the third person asking the same question. |
| **US-03** | As an interviewer, I want to correct a rating I mis-clicked. |
| **US-04** | As an interviewer, I want the app to load my existing feedback instead of telling me I already submitted, so that "already done" is a state, not an error. |
| **US-05** | As a recruiter, I want every panellist's feedback in one place, so that I can decide with all of it. |
| **US-06** | As a recruiter, I want no way to edit an interviewer's assessment, so that what I read is what they wrote. |
| **US-07** | As a security reviewer, I want to confirm this screen shows no candidate contact detail, since §3.6 names it. |

---

## Functional Requirements

### FR-1 — Where it renders

- **FR-1.1** Two components mount into the slots the interviews feature left:
  `<FeedbackSection>` on the **interviewer's** round detail, and `<FeedbackList>` on the
  **recruiter's**.
- **FR-1.2** `<FeedbackList>` also renders on the recruiter's **candidate detail**, from the
  candidate payload — **not** by calling `GET /api/interviews/:id/feedback` once per round (D-6).
  A candidate with five rounds would otherwise be six requests.
- **FR-1.3** **This feature adds no route.** Feedback is always reached through its round, which is
  also how the API is shaped.
- **FR-1.4** An interviewer who is not assigned never reaches either component: the **whole page**
  is the not-found view, because `GET /api/interviews/:id` already answered `404` (interviews
  FR-3.7). This feature never renders a "you are not assigned" message, because it never runs.

### FR-2 — The panel list

- **FR-2.1** `<FeedbackList>` renders every entry from `GET /api/interviews/:id/feedback`, newest
  first, in the API's order. **The client does not re-sort.**
- **FR-2.2** Each entry is a `<Card>` showing: the author's name, the rating as filled stars plus
  **"4/5"** in text, the notes, and the time — **"edited {time}"** when `updatedAt` differs from
  `createdAt`, so an edit is visible rather than silent.
- **FR-2.3** The **signed-in interviewer's own entry** is marked **"Your feedback"** and carries an
  **Edit** button. Ownership is determined by comparing `entry.interviewer.id` to
  `useAuth().user.id` — **a display decision, never an authorization one**; the API's `PATCH` scopes
  by the token (XBE-6).
- **FR-2.4** The rating renders as **stars and a number**. Stars alone are not accessible and not
  scannable; the number carries the value for anyone who cannot see the stars.
- **FR-2.5** An empty list renders differently by role:
  - interviewer: **"No feedback yet. Yours will be the first."**
  - recruiter: **"No feedback submitted for this round yet."**
- **FR-2.6** Notes render as **plain text with preserved line breaks** (`whitespace-pre-wrap`).
  Never as markdown, and never as HTML (SEC-4).
- **FR-2.7** Long notes render in full. There is no truncation and no "show more" — an assessment
  half-read is worse than a long card.

### FR-3 — The form

- **FR-3.1** `<FeedbackForm>` renders **below** the panel list on the interviewer's view, so
  colleagues' notes are read before the form is reached (D-4).
- **FR-3.2** Two fields: **Rating** (required) and **Notes** (required).
- **FR-3.3** Rating is `<StarRating>` — five buttons in a `role="radiogroup"`, each
  `role="radio"` with `aria-checked`, arrow keys moving the selection, emitting an **integer 1–5**
  (D-2, XBE-3). It cannot emit `0`, `4.5`, or a string.
- **FR-3.4** Notes is a `<Textarea>`, required, max 5000 characters, with a live counter appearing
  once 4500 is passed.
- **FR-3.5** Submit is disabled until both fields are valid. **That is UX; the API's `400` is the
  control** (XBE-4).
- **FR-3.6** The form is a **create-or-edit** from the start (D-3):
  - no existing entry → Submit reads **"Submit feedback"**, `POST`;
  - an existing entry → the form is prefilled, Submit reads **"Save changes"**, `PATCH`, and is
    disabled while nothing has changed.
- **FR-3.7** On `201` or `200`, a toast — **"Feedback submitted."** / **"Feedback updated."** — the
  feedback query is invalidated, and the form switches to edit mode carrying the saved values.
- **FR-3.8** On `400`, messages render **under the offending fields** via `fieldMessage`, and
  **everything the interviewer typed stays**. A failed request never discards an assessment someone
  just wrote — this is the single most important error behaviour in the feature.
- **FR-3.9** While submitting, Submit reads **"Submitting…"** / **"Saving…"** and both fields are
  disabled.
- **FR-3.10** The form does **not** render when the round's `status` is `CANCELLED`. Instead:
  **"This interview was cancelled. Feedback can no longer be submitted."** That is UX;
  `409 INTERVIEW_CANCELLED` is the control (XBE-5).

### FR-4 — The `409`, which is not an error

- **FR-4.1** `409 FEEDBACK_ALREADY_SUBMITTED` means the interviewer already has an entry — reachable
  when a second tab, or a colleague's device, submitted first.
- **FR-4.2** The client **does not show a dead end**. It:
  1. invalidates and refetches the feedback list;
  2. finds the interviewer's own entry;
  3. **prefills the form with it and switches to edit mode**;
  4. shows an informational toast: **"You have already submitted feedback for this round. Your
     existing entry is loaded for editing."**
- **FR-4.3** **The text the interviewer just typed is not discarded.** It stays in the form as the
  edit-mode draft, so "submit → 409 → save" preserves their work rather than replacing it with the
  older entry. The prefill supplies only the fields they did not change.
- **FR-4.4** This is the behaviour the API's message asks for — it names editing as the remedy
  (XBE-7) — and the reason FR-3.6 built the form as a create-or-edit rather than adding a branch
  later.

### FR-5 — The recruiter's view

- **FR-5.1** A recruiter sees `<FeedbackList>` and **no form, no Edit button, no Delete button**
  (D-5).
- **FR-5.2** The list renders on the round detail and on the candidate detail (FR-1.2).
- **FR-5.3** There is **no delete affordance for anyone**. The API has no such route (XBE-9).
- **FR-5.4** A recruiter's own id never matches an `entry.interviewer.id`, so FR-2.3's "Your
  feedback" marker cannot appear for them — but `<FeedbackList>` also takes an explicit
  `editable={false}`, so the absence does not depend on that coincidence.

### FR-6 — What this client must never do

- **FR-6.1** It must never render a candidate's name, email or phone **from a feedback payload**.
  The API sends none (XBE-2). The candidate's name on the page comes from the **interview** payload,
  which is the interviews feature's contract.
- **FR-6.2** It must never use `entry.interviewer.id === user.id` as an authorization decision — only
  as a display decision (FR-2.3).
- **FR-6.3** It must never present a `404` as a permission problem (interviews ERR-2).
- **FR-6.4** It must never write a draft assessment to browser storage (DM-2).
- **FR-6.5** It must never render notes as HTML or markdown (FR-2.6, SEC-4).

---

## Frontend Requirements

### File structure

```
src/
  features/
    feedback/
      api/feedback.api.ts                     NEW   — listFeedback, submitFeedback, updateFeedback
      hooks/useFeedbackQuery.ts               NEW   — useFeedbackQuery + feedbackKey
      hooks/useFeedbackMutations.ts           NEW   — useSubmitFeedback, useUpdateFeedback
      components/FeedbackSection.tsx          NEW   — list + form, interviewer only (FR-3.1)
      components/FeedbackList.tsx             NEW   — FR-2, both roles
      components/FeedbackCard.tsx             NEW   — FR-2.2
      components/FeedbackForm.tsx             NEW   — FR-3, create-or-edit
      components/StarRating.tsx               NEW   — FR-3.3, interactive
      components/RatingDisplay.tsx            NEW   — FR-2.4, read-only
      types.ts                                NEW
  lib/
    schemas/feedback.ts                       NEW   — feedbackSchema
  app/(app)/interviews/[interviewId]/page.tsx MOD   — mounts <FeedbackSection> or <FeedbackList>
```

Primitives reused: `Card`, `Button`, `Textarea`, `Badge`, `Field`, `Label`, `Separator`,
`Skeleton`. `StarIcon` from `lucide-react`. **No new primitive, no new dependency** (D-7).

### State matrix — `<FeedbackForm>`

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Empty, create | no existing entry | Rating unselected, empty Notes, Submit **"Submit feedback"** disabled |
| Rating chosen only | — | Submit still disabled; Notes shows its required message on blur |
| Valid | rating 1–5 and non-empty notes | Submit enabled |
| Submitting | in flight | Submit reads **"Submitting…"**, both fields disabled |
| `201` | — | Toast **"Feedback submitted."**; list refetches; **form switches to edit mode with the saved values** |
| Prefilled, edit | an existing entry | Fields prefilled, Submit reads **"Save changes"**, **disabled while unchanged** |
| Saving | in flight | Submit reads **"Saving…"** |
| `200` | — | Toast **"Feedback updated."**; list refetches |
| `400` `details.rating` / `details.notes` | — | Messages under the fields; **everything typed stays** (FR-3.8) |
| **`409 FEEDBACK_ALREADY_SUBMITTED`** | a second tab submitted first | Info toast **"You have already submitted feedback for this round. Your existing entry is loaded for editing."**; list refetches; **form switches to edit mode and the typed text is kept** (FR-4.2, FR-4.3) |
| `409 INTERVIEW_CANCELLED` | the round was cancelled meanwhile | Toast **"This interview was cancelled. Feedback can no longer be submitted."**; the form is replaced by that line |
| Round already cancelled | `status: CANCELLED` on mount | The form never renders; the line above renders instead (FR-3.10) |
| `500` / network | — | Error toast; **form untouched, values intact** |

### State matrix — `<FeedbackList>`

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Loading | first fetch | Two card skeletons |
| Loaded | `200` with entries | One card per entry, newest first |
| Empty, interviewer | `feedback: []` | **"No feedback yet. Yours will be the first."** |
| Empty, recruiter | `feedback: []` | **"No feedback submitted for this round yet."** |
| Own entry present | `entry.interviewer.id === user.id` and `editable` | That card is marked **"Your feedback"** with an **Edit** button |
| Edited entry | `updatedAt > createdAt` | **"edited {relative time}"** beside the timestamp |
| Error | `500` / network | Inline error card **"Could not load feedback."** + **Try again** |

### State matrix — `<StarRating>`

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Unselected | initial | Five outline stars; `aria-checked="false"` on all; the group is focusable |
| Hover | pointer over star _n_ | Stars 1..n fill in a preview tone; **the value does not change** |
| Selected | click or `Space` on star _n_ | Stars 1..n filled; `aria-checked="true"` on _n_; the label reads **"{n} of 5"** |
| Keyboard | `ArrowRight` / `ArrowLeft` | The selection moves one step and stays within 1–5 |
| Disabled | submitting | No hover, no focus, muted tone |

### Other frontend rules

- **FE-1** All calls go through `features/feedback/api/feedback.api.ts`. **Three** exported
  functions — list, submit, update. **There is no `deleteFeedback` wrapper**, because there is no
  such endpoint, and an exported wrapper for a missing endpoint is how a removed feature comes back
  by accident (FR-5.3).
- **FE-2** Query key: `feedbackKey(interviewId) = ['feedback', 'interview', interviewId] as const`.
  Both mutations invalidate it, `onSettled`, so a `409` also refreshes the list — **which is what
  makes FR-4.2's prefill possible**.
- **FE-3** Both mutations also invalidate the interview detail key, since the round's card shows a
  feedback count.
- **FE-4** **No optimistic updates.** A submission can `409` into an edit; an optimistic append
  would show a row that then has to be reconciled with a different one.
- **FE-5** `<StarRating>` is a controlled component emitting `number`. It is used by
  `react-hook-form` through a `Controller`, and its `onChange` is typed `(value: number) => void`
  — **it cannot emit a string** (XBE-3).
- **FE-6** `<RatingDisplay>` is a **separate, non-interactive** component. The interactive one is
  never rendered read-only with pointer events disabled — a disabled control is still a control, and
  a recruiter's screen should contain none.
- **FE-7** Ownership for display is `entry.interviewer.id === user.id`, **and `<FeedbackList>` takes
  an explicit `editable` prop** which is `false` for recruiters (FR-5.4). Two independent reasons the
  Edit button does not render for them.
- **FE-8** Error codes are read with `errorBodyOf(error)?.code`, never by matching message copy.
- **FE-9** Notes render with `whitespace-pre-wrap` as a **text node**. No `dangerouslySetInnerHTML`
  in this feature, and no markdown renderer (FR-6.5).
- **FE-10** `types.ts` declares one `Feedback` interface. **It has no candidate field**, optional or
  otherwise, matching the payload (XBE-2).

---

## Backend Requirements

The guarantees this client depends on. If any changes, this spec breaks. Source:
[../../../../backend/specs/features/feedback/spec.md](../../../../backend/specs/features/feedback/spec.md).

- **XBE-1** `POST` and `PATCH` are **interviewer-only**; a recruiter gets `403`. `GET` serves both.
- **XBE-2** **The feedback payload contains no candidate data at all** — no name, no id, no email,
  no phone (§3.6 names this endpoint specifically). **If a candidate field ever appears, that is a
  backend bug to report, not a field to hide client-side.**
- **XBE-3** `rating` is an **integer 1–5**. `4.5`, `0` and `"4"` are all `400` with `details.rating`.
- **XBE-4** `notes` is **required**, 1–5000 characters after trim; empty or whitespace-only is `400`
  with `details.notes`.
- **XBE-5** `409 INTERVIEW_CANCELLED` is returned for a submission against a cancelled round.
- **XBE-6** `PATCH` scopes ownership **in its `where`** by the caller's token. The client's "Your
  feedback" marker is display only (FR-2.3, FR-6.2).
- **XBE-7** `409 FEEDBACK_ALREADY_SUBMITTED` names editing as the remedy in its message. This is the
  behaviour FR-4 is built around.
- **XBE-8** An unassigned interviewer gets **`404`, not `403`**, on all three verbs — and
  `GET /api/interviews/:id` already `404`ed, so these components never mount for them (FR-1.4).
- **XBE-9** There is **no `DELETE`**; it answers `404`. The client offers no delete affordance
  (FE-1).
- **XBE-10** `GET` is **unpaginated** and returns `{ feedback: [...] }` — no pagination envelope.
- **XBE-11** Each entry carries `interviewer: { id, name }` (FR-2.2) and both `createdAt` and
  `updatedAt` (FR-2.2's "edited" marker).
- **XBE-12** An assigned interviewer sees **all** feedback on the round, including entries written
  before their own. This is the brief's opening complaint being fixed (FR-2.1, D-4).
- **XBE-13** A recruiter's **candidate detail** payload carries each round's feedback inline, which
  is why FR-1.2 does not call this endpoint per round.

---

## API Contract

| Call | When | Sends | Expects |
|---|---|---|---|
| `GET /api/interviews/:id/feedback` | the round detail mounts; after any mutation | — | `200 { feedback }` · `404` |
| `POST /api/interviews/:id/feedback` | Submit pressed with no existing entry | `{ rating, notes }` | `201 { feedback }` · `400` · `404` · `409 FEEDBACK_ALREADY_SUBMITTED` · `409 INTERVIEW_CANCELLED` |
| `PATCH /api/interviews/:id/feedback` | Save pressed in edit mode | `{ rating?, notes? }` | `200 { feedback }` · `400` · `404` |

### Client-side rules

- **API-1** Every call goes through `apiFetch`.
- **API-2** Every call is wrapped in `features/feedback/api/feedback.api.ts`; no component assembles
  a path.
- **API-3** `PATCH` sends **only changed fields**, matching the API's partial-update contract and
  keeping the audit's `fromRating`/`toRating` meaningful.
- **API-4** Error codes are read with `errorBodyOf(error)?.code` (FE-8).
- **API-5** Query key `['feedback', 'interview', id]`, invalidated `onSettled` by both mutations
  (FE-2).
- **API-6** On the recruiter's **candidate detail**, feedback comes from the candidate payload;
  **this feature's `GET` is not called there** (FR-1.2, XBE-13).

---

## Data Model Changes

Client state only.

| State | Where it lives | Lifetime | Persisted? |
|---|---|---|---|
| Feedback entries | TanStack Query cache, `['feedback','interview',id]` | Until invalidated or the tab closes | **Never** — memory only |
| Form rating and notes | `react-hook-form` state | Until the page unmounts | **Never** (DM-2) |
| Create vs edit mode | Derived from the fetched list plus `user.id` — **not** `useState` | Per render | **Never** |

- **DM-1** No token, name, email or role is written to `localStorage`, `sessionStorage` or a cookie.
- **DM-2** **An unsent draft assessment is never written to browser storage** (FR-6.4). It is one
  person's judgement of another, and browser storage is shared with whoever else uses the machine.
  The cost — a lost draft on an accidental reload — is accepted and is stated rather than traded
  away.
- **DM-3** Mode is **derived, not stored**, so a refetch that reveals an existing entry flips the
  form to edit without a second source of truth to keep in sync.
- **DM-4** No optimistic cache writes (FE-4).

---

## Authentication / Authorization

**This matrix is UX, not a control.** Every row describes what renders; the backend re-authorizes
every request behind it.

| Surface | Anonymous | Candidate | Interviewer (assigned) | Interviewer (not assigned) | Recruiter |
|---|---|---|---|---|---|
| `<FeedbackList>` on the round detail | → `/login` | app 404 | ✅ | **whole page is app 404** | ✅ read-only |
| `<FeedbackForm>` | → `/login` | app 404 | ✅ | never renders | **never renders** |
| `<FeedbackList>` on the candidate detail | → `/login` | app 404 | n/a | n/a | ✅ read-only |

- **AZ-1** **None of the above is a security control.** The API's `403`, `404` and `409` are.
- **AZ-2** An unassigned interviewer never reaches these components, because
  `GET /api/interviews/:id` already answered `404` and the page is the not-found view (FR-1.4,
  XBE-8). **This feature contains no assignment check of its own**, and must not gain one — a second
  check is a second thing to get wrong.
- **AZ-3** The "Your feedback" marker and the Edit button are **display decisions** (FR-2.3,
  FR-6.2). `PATCH` scopes by the token in its `where` (XBE-6); a recruiter firing it gets `403`, and
  an interviewer firing it against someone else's entry gets `404`.
- **AZ-4** The form's disabled Submit is **UX**; the API's `400` is the control (FR-3.5, XBE-3,
  XBE-4).
- **AZ-5** Hiding the form on a cancelled round is **UX**; `409 INTERVIEW_CANCELLED` is the control
  (FR-3.10, XBE-5).
- **AZ-6** `editable={false}` for recruiters (FE-7) is a second, independent reason the Edit button
  does not render — not the reason it is safe.

---

## Validation

### `feedbackSchema` — new, in [`lib/schemas/feedback.ts`](../../../src/lib/schemas/feedback.ts)

| Field | Rule | Message |
|---|---|---|
| `rating` | integer, 1–5, required | **"Choose a rating from 1 to 5."** |
| `notes` | trimmed, 1–5000 characters, required | **"Write a few notes about this interview."** / **"Keep your notes under 5000 characters."** |

- **VAL-1** `rating` is `z.number().int().min(1).max(5)` — **not** `z.coerce.number()`, matching the
  API, which deliberately does not coerce a JSON body (XBE-3). `<StarRating>` emits a number, so
  coercion would only mask a bug.
- **VAL-2** `notes` is validated on `trim()`, so whitespace alone fails — the same rule the API
  applies.
- **VAL-3** The edit form uses the same schema; **both** fields stay required, because an edit that
  clears the notes is an empty assessment.
- **VAL-4** Client validation mirrors the API and substitutes for none of it (AZ-4).
- **VAL-5** The character counter appears only past 4500, so a normal-length note is not accompanied
  by a countdown.

---

## Error Handling

| Status / `code` | Where | UI behaviour |
|---|---|---|
| `401` | any call | `apiFetch` refreshes once and replays; a second `401` redirects to `/login?next=…` |
| `403` | `POST` / `PATCH` | `apiFetch` redirects to `/forbidden`. Unreachable through the UI (no form renders for a recruiter); handled |
| `404` | any call | The round is gone or the caller is not assigned. Toast **"This interview is no longer available."** and the page refetches into its not-found view. **No copy mentions assignment** |
| `400` `details.rating` / `details.notes` | form | Messages under the fields; **everything typed stays** (FR-3.8) |
| **`409 FEEDBACK_ALREADY_SUBMITTED`** | `POST` | **Not an error state.** Info toast, refetch, prefill, switch to edit mode, **keep the typed text** (FR-4.2, FR-4.3) |
| `409 INTERVIEW_CANCELLED` | `POST` | Toast **"This interview was cancelled. Feedback can no longer be submitted."**; the form is replaced by that line |
| `500` / network | list | Inline error card **"Could not load feedback."** + **Try again** |
| `500` / network | form | Error toast; **form untouched, values intact** |

- **ERR-1** **A failed submission never discards what was typed.** This is stated first because it
  is the behaviour that matters most here: an interviewer has just written a considered assessment,
  and losing it to a `400` or a dropped connection is the worst outcome this screen can produce
  (FR-3.8, FR-4.3).
- **ERR-2** `409 FEEDBACK_ALREADY_SUBMITTED` is handled as a **state transition, not a failure**
  (FR-4). The toast is informational, not destructive, and the outcome is a usable edit form.
- **ERR-3** A **query** failure renders an inline error state with a retry. A **mutation** failure
  raises a toast and leaves the form as it was.
- **ERR-4** **No copy in this feature mentions assignment or permission.** A `404` is rendered as
  "no longer available", because the client does not know which of the two it is and saying either
  would leak what the API withheld (FR-6.3).
- **ERR-5** Codes are read from `errorBodyOf(error)?.code`, never the message string (FE-8).

---

## Edge Cases

| ID | Case | Behaviour |
|---|---|---|
| **EC-01** | **Two panellists submit at the same instant** | Both succeed. Each sees their own toast and, after the refetch, **two cards** — one marked "Your feedback". *This is the brief's §3.4 case, and the UI shows the documented outcome* (XBE-12) |
| **EC-02** | **The same interviewer submits from two tabs at once** | One `201`, one `409`. The `409` tab refetches, prefills, switches to edit mode, and **keeps what was typed there** (FR-4.2, FR-4.3) |
| **EC-03** | An interviewer opens the page having already submitted | The form is in edit mode, prefilled, Submit reads **"Save changes"** and is **disabled until something changes** (FR-3.6) |
| **EC-04** | An interviewer reads colleagues' feedback before writing | The list renders above the empty form. *This is the brief's opening complaint being fixed* (D-4, FR-3.1) |
| **EC-05** | An interviewer edits their rating from 4 to 5 | `PATCH` sends **only** `rating` (API-3); the card shows **"edited {time}"** afterwards (FR-2.2) |
| **EC-06** | A recruiter opens the round detail | The list renders with **no form, no Edit, no Delete** (FR-5.1, FR-5.3) |
| **EC-07** | An unassigned interviewer opens the round URL | The **whole page** is the app's not-found view; these components never mount (FR-1.4, AZ-2) |
| **EC-08** | A round is cancelled while the form is open | Submitting returns `409 INTERVIEW_CANCELLED`; the form is replaced by the cancellation line (FR-3.10) |
| **EC-09** | A round is already cancelled on mount | The form never renders (FR-3.10) |
| **EC-10** | Notes of 5200 characters | Client `400` before sending; the counter is visible from 4500 (VAL-5) |
| **EC-11** | Notes of only spaces | Client blocks it on `trim()`; if bypassed, the API `400`s with `details.notes` (VAL-2) |
| **EC-12** | Notes containing `<script>alert(1)</script>` | Rendered as **visible text**. React escapes it; no `dangerouslySetInnerHTML` exists here (SEC-4, FE-9) |
| **EC-13** | Notes with blank lines and indentation | Preserved by `whitespace-pre-wrap` (FR-2.6) |
| **EC-14** | An interviewer is unassigned while the page is open | Their next refetch `404`s and the page becomes not-found. No re-login needed |
| **EC-15** | A network failure mid-submit | Error toast; **the form keeps every character** (ERR-1) |
| **EC-16** | A recruiter opens a candidate with five rounds | Feedback renders for all five from the **candidate payload** — **one** request, not six (FR-1.2, API-6, XBE-13) |
| **EC-17** | Keyboard-only rating entry | The group is reachable by `Tab`; arrows move the value; `Space` selects. `aria-checked` reflects the value (FR-3.3) |
| **EC-18** | An accidental page reload with an unsaved draft | **The draft is lost.** Accepted, and stated (DM-2) rather than traded for storing an assessment in the browser |

---

## Security Requirements

- **SEC-1** **This screen renders no candidate contact detail**, because the feedback payload
  carries none (XBE-2). §3.6 names the feedback surface specifically, and the answer is that there
  is nothing in the shape to hide. The candidate's **name** on the page comes from the interview
  payload, which is the interviews feature's contract and is already the minimum an interview
  requires.
- **SEC-2** There is **no conditional render of a contact field** anywhere in
  `features/feedback/`. A grep for `email` or `phone` in that folder must find nothing (AC-F26).
- **SEC-3** **This feature performs no assignment check** (AZ-2). The page never mounts for an
  unassigned interviewer, because the API already answered `404`. A second check here would be a
  second place for the rule to rot.
- **SEC-4** Notes are rendered as **text nodes** with `whitespace-pre-wrap` (FE-9, FR-6.5). They are
  the only free text in this app written by one user and read by another, so this is the one place
  where an HTML render would be a real injection path — and there is no `dangerouslySetInnerHTML`
  and no markdown renderer in this feature.
- **SEC-5** **No draft is written to browser storage** (DM-2). An unsaved assessment on a shared
  machine is a disclosure with no upside.
- **SEC-6** Ownership markers are display-only (AZ-3). The API scopes `PATCH` by the token, and
  AC-M03 proves it from the console.
- **SEC-7** No copy distinguishes "not assigned" from "not found" (ERR-4).
- **SEC-8** **Known accepted gaps.** (a) **Anchoring bias** — an interviewer reads colleagues'
  ratings before writing their own (D-4). This is the brief's stated problem being fixed, and a
  "blind until submitted" rule is a product decision nobody asked for; it is named rather than
  silently mitigated. (b) Feedback stays in the query cache until the tab closes, so a shared
  machine shows the last-viewed assessment after a `Back`. (c) An unsaved draft is lost on reload
  (EC-18), which is the deliberate cost of (SEC-5). (d) There is no client throttle on `PATCH`, so
  an interviewer can generate unbounded audit rows. All four are accepted for a localhost POC.

---

## Performance Requirements

- **PERF-1** The round detail issues **exactly two** requests on mount: the interview and its
  feedback. The feedback list is **one** call for the whole panel, not one per entry.
- **PERF-2** A successful submission issues **exactly three**: the `POST`, the feedback refetch, and
  the interview-detail refetch (FE-3). **No optimistic write** (FE-4).
- **PERF-3** A `409` issues the same three — invalidation is `onSettled` (FE-2), which is precisely
  what makes the prefill in FR-4.2 possible without an extra call.
- **PERF-4** The recruiter's **candidate detail** renders feedback for every round from the
  candidate payload — **zero** additional requests, regardless of how many rounds that candidate has
  (FR-1.2, API-6, EC-16).
- **PERF-5** `<FeedbackList>` is unpaginated and unvirtualised, because a panel is single digits
  (XBE-10).
- **PERF-6** **No polling.** Refetching happens on mount, on a mutation settling, and on window
  focus.
- **PERF-7** `<StarRating>`'s hover preview is local state and does not re-render the form.

---

## Acceptance Criteria

Verified by hand, in the browser, with DevTools open. Roles: **R** = recruiter, **I1** and **I2** =
the two seeded interviewers. `$IV` is a round both are assigned to; `$IV_SOLO` is a round only I1 is
assigned to.

`AC-F*` are functional checks driven through the UI. `AC-M*` additionally require a running backend
and a seeded database.

### Submitting

- **AC-F01** — **Given** I2 on `$IV` with no feedback of their own, **when** the round detail loads,
  **then** a form renders **below** the existing feedback list, with Submit reading **"Submit
  feedback"** and disabled (FR-3.1, FR-3.6).
- **AC-F02** — **Given** the form, **when** only a rating is chosen, **then** Submit stays disabled
  and Notes shows its required message on blur (FR-3.5).
- **AC-F03** — **Given** a rating and notes, **when** Submit is pressed, **then** it reads
  **"Submitting…"**, then a toast reads **"Feedback submitted."** and a new card appears marked
  **"Your feedback"** (FR-3.7, FR-3.9, FR-2.3).
- **AC-F04** — **Given** the same, **when** the Network tab is read, **then** **exactly three**
  requests fired — the `POST` and two refetches — and **no optimistic card appeared before the
  `201`** (PERF-2, FE-4).
- **AC-F05** — **Given** the form, **when** the request body is inspected, **then** `rating` is a
  **number**, not a string (FE-5, VAL-1).
- **AC-F06** — **Given** notes of only spaces, **when** Submit is attempted, **then** it stays
  disabled (VAL-2, EC-11).

### The star control

- **AC-F07** — **Given** the rating control, **when** it is focused and `ArrowRight` is pressed four
  times from unselected, **then** the value is 4 and does not exceed 5 (FR-3.3, EC-17).
- **AC-F08** — **Given** the control, **when** the DOM is inspected, **then** it has
  `role="radiogroup"` and each star has `role="radio"` with an `aria-checked` reflecting the value
  (FR-3.3).
- **AC-F09** — **Given** a star is hovered, **when** the pointer leaves without clicking, **then**
  the selected value is unchanged (`<StarRating>` state matrix).
- **AC-F10** — **Given** a recruiter's read-only list, **when** the DOM is inspected, **then** the
  ratings are `<RatingDisplay>` — **not a disabled interactive control** (FE-6).

### Editing and the 409

- **AC-F11** — **Given** I1 who already submitted on `$IV`, **when** the page loads, **then** the
  form is **prefilled**, Submit reads **"Save changes"** and is **disabled until something changes**
  (FR-3.6, EC-03).
- **AC-F12** — **Given** that form, **when** the rating is changed and saved, **then** a toast reads
  **"Feedback updated."** and the card shows **"edited {time}"** (FR-3.7, FR-2.2, EC-05).
- **AC-F13** — **Given** the same edit, **when** the `PATCH` body is inspected, **then** it contains
  **only the changed field** (API-3).
- **AC-F14** — **Given** I1 with the form open in **two tabs**, **when** tab A submits and then tab B
  submits, **then** tab B shows the info toast **"You have already submitted feedback for this
  round. Your existing entry is loaded for editing."**, switches to edit mode, and **the text typed
  in tab B is still in the field** (FR-4.2, FR-4.3, EC-02).
- **AC-F15** — **Given** that state in tab B, **when** Save is pressed, **then** it succeeds — the
  `409` was a route into editing, not a dead end (FR-4.4, ERR-2).

### Reading the panel

- **AC-F16** — **Given** `$IV` with feedback from I1, **when** **I2** opens it having written
  nothing, **then** I1's entry renders with their name, rating and notes, **above** the empty form.
  *This is the brief's opening complaint being fixed* (D-4, FR-3.1, EC-04, XBE-12).
- **AC-F17** — **Given** a panel of two, **when** the list renders, **then** each card names its
  author and only the signed-in user's card is marked **"Your feedback"** (FR-2.3).
- **AC-F18** — **Given** any entry, **when** it renders, **then** the rating appears as filled stars
  **and** as **"4/5"** in text (FR-2.4).
- **AC-F19** — **Given** notes with blank lines, **when** they render, **then** the line breaks are
  preserved (FR-2.6, EC-13).
- **AC-F20** — **Given** notes containing `<script>alert(1)</script>`, **when** they render, **then**
  the tag appears as **visible text** and **no dialog opens** (SEC-4, EC-12).
- **AC-F21** — **Given** an empty round, **when** an interviewer opens it, **then**
  **"No feedback yet. Yours will be the first."** renders; **when** a recruiter opens it, **then**
  **"No feedback submitted for this round yet."** renders (FR-2.5).

### The recruiter's view

- **AC-F22** — **Given** R on a round with feedback, **when** the detail loads, **then** the list
  renders with **no form, no Edit button and no Delete button** anywhere (FR-5.1, FR-5.3, EC-06).
- **AC-F23** — **Given** R on a candidate with five rounds, **when** the candidate detail loads,
  **then** feedback renders for all five and the Network tab shows **zero** calls to
  `/api/interviews/*/feedback` (FR-1.2, PERF-4, EC-16).

### Cancelled rounds

- **AC-F24** — **Given** a cancelled round I1 is assigned to, **when** its detail loads, **then**
  **"This interview was cancelled. Feedback can no longer be submitted."** renders **instead of the
  form**, and existing feedback still lists (FR-3.10, EC-09).

### Structure

- **AC-F25** — **Given** the repository, **when** `features/feedback/api/feedback.api.ts` is read,
  **then** it exports **three** functions and **no `deleteFeedback`** (FE-1, FR-5.3).
- **AC-F26** — **Given** the repository, **when** `grep -rniE "email|phone" src/features/feedback/`
  is run, **then** it returns **nothing** (SEC-2, FR-6.1).
- **AC-F27** — **Given** the repository, **when**
  `grep -rniE "assign|not assigned|permission" src/features/feedback/` is run, **then** no match is
  an authorization check or user-facing copy (SEC-3, ERR-4, AZ-2).
- **AC-F28** — **Given** the repository, **when**
  `grep -rn "dangerouslySetInnerHTML" src/features/feedback/` is run, **then** it returns nothing
  (SEC-4, FE-9).
- **AC-F29** — **Given** the repository, **when** `features/feedback/types.ts` is read, **then** the
  `Feedback` interface declares **no candidate field**, optional or otherwise (FE-10, XBE-2).

### Cross-cutting invariants

- **AC-M01** — **Given** a full session as I1 — loading the round, reading the panel, submitting and
  editing — **when** every `/api/interviews/*/feedback` response body in the Network tab is
  searched, **then** the strings `"email"`, `"phone"`, `"candidate"` and `"candidateUserId"` appear
  **zero** times. *§3.6 names this endpoint specifically; verified in the payload, not the DOM*
  (XBE-2, SEC-1).
- **AC-M02** — **Given** a **recruiter** session, **when**
  `fetch('<API>/api/interviews/<$IV>/feedback', { method: 'POST', body: '{"rating":5,"notes":"x"}' , …})`
  is issued **by hand from the DevTools console**, **then** the response is **`403`**. *This is the
  criterion that proves the missing form is not what stops a recruiter writing feedback* (AZ-1,
  SEC-6, XBE-1).
- **AC-M03** — **Given** an **I2** session, **when** a `PATCH` against `$IV`'s feedback is issued
  **by hand from the console** while I2 has no entry of their own, **then** the response is
  **`404`** — ownership is the API's `where`, not the client's marker (AZ-3, SEC-6, XBE-6).
- **AC-M04** — **Given** an **I2** session who is not assigned to `$IV_SOLO`, **when**
  `fetch('<API>/api/interviews/<$IV_SOLO>/feedback', { method: 'POST', … })` is issued **by hand
  from the console**, **then** the response is **`404`**, not `403` (XBE-8, AZ-2).
- **AC-M05** — **Given** an **I1** session, **when** a `rating` of `0` and then `4.5` are submitted
  **by hand from the console**, bypassing the star control, **then** both are **`400`** with
  `details.rating`. *This proves the star control is not the control* (AZ-4, XBE-3).
- **AC-M06** — **Given** `$IV` with I1 and I2 both assigned and neither having written anything,
  **when** **both submit at the same moment** from two browsers, **then** **both** see a success
  toast, and after both refetch **each sees two cards** — one theirs, one their colleague's.
  *This is the brief's §3.4 case observed from the UI* (EC-01, XBE-12).
- **AC-M07** — **Given** a full session as I1, **when** `localStorage`, `sessionStorage` and
  `document.cookie` are read in the console at the end, **then** none contains a token, a candidate
  name, **or any draft or submitted notes text** (DM-1, DM-2, SEC-5).
- **AC-M08** — **Given** I1 with a half-written form, **when** the API is stopped and Submit is
  pressed, **then** an error toast appears and **every character typed is still in the field**
  (ERR-1, EC-15).

---

## Out of Scope

| Excluded | Why |
|---|---|
| Deleting feedback | The API has no such route (XBE-9). Retracting an assessment without a trace is the opposite of what §6 asks for |
| Per-competency ratings or a rubric | The brief asks for *"a rating plus notes"*. A rubric is a product decision nobody has made |
| A hire/no-hire recommendation field | Same reason; the rating already carries the signal |
| Markdown or rich text in notes | An injection surface for no requirement (SEC-4). Line breaks are preserved, which is what people actually use |
| Draft autosave to browser storage | DM-2, SEC-5. The lost-draft cost is accepted and stated |
| Blind feedback (hidden until you submit) | Would undo the brief's opening complaint. The bias risk is named in SEC-8a instead |
| Averaging or aggregating ratings | Feedback informs a recruiter; the API does not aggregate and neither does this |
| Candidate access to feedback | A legal and product decision this POC does not make |
| Attachments or code samples | No storage layer exists in this app |
| A cross-round "everything I have written" view | No requirement asks for it, and no endpoint serves it |

---

## Dependencies

**Blocked by:**
[../../../../backend/specs/features/feedback/spec.md](../../../../backend/specs/features/feedback/spec.md).
**Nothing here can be verified until that ships.**
[../interviews/spec.md](../interviews/spec.md) — this feature mounts into the slots that spec left
on `/interviews/[interviewId]` and adds no route of its own (FR-1.3).

**Blocks:** [../candidate-access/spec.md](../candidate-access/spec.md) — its recruiter candidate detail renders
`<FeedbackList>` from the candidate payload (FR-1.2).

**New npm dependencies:** **none.** `Card`, `Button`, `Textarea`, `Badge`, `Field`, `Label`,
`Separator` and `Skeleton` are already vendored in
[`src/components/ui/`](../../../src/components/ui/); the stars are `lucide-react`'s `StarIcon`, and
the rating control is hand-rolled (D-2).

**Environment variables:** none.

**Modified existing files**

| Path | Change |
|---|---|
| `src/app/(app)/interviews/[interviewId]/page.tsx` | Mounts `<FeedbackSection>` for an interviewer and `<FeedbackList editable={false}>` for a recruiter |
| [`CLAUDE.md`](../../../CLAUDE.md) | Feature table row; the "Feedback submission" bullet under *Views this POC needs* now points here |

**Framework note.** **This is Next.js 16; its APIs differ from older versions.** This feature adds
no route and no `useSearchParams()` call, so neither the `<Suspense>` requirement nor the
Promise-`params` rule applies to anything it owns — both are handled by the interviews feature, which
owns the page these components mount into.

**External dependencies:** none.

**Cross-repo:** a change to the three endpoints, the rating bounds, the two `409` codes, or the
`FEEDBACK_SELECT` shape must be made in **both** specs — see
[../../../../backend/specs/features/feedback/spec.md](../../../../backend/specs/features/feedback/spec.md).
