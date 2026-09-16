# Roles — Open Requisition Management (Frontend)

> **Status:** Approved — plan at [plan.md](./plan.md). **Revised twice after implementation: roles are a
> recruiter-only surface**, and **a closed role can now be deleted** — see
> [Revision](#revision--roles-became-recruiter-only) and
> [Revision 2](#revision-2--delete-role-on-a-closed-role)
> **Feature slug:** `roles`
> **Scope:** `frontend/` — Next.js 16 App Router + React 19
> **Counterpart:** [../../../../backend/specs/features/roles/spec.md](../../../../backend/specs/features/roles/spec.md)
> **Depends on:** [../authentication/spec.md](../authentication/spec.md) — implemented
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md)

---

## Goal

Give the app its **first real screen**. Everything shipped so far is session plumbing and two placeholder
pages; this is the first feature a recruiter would actually open the app to use.

1. A recruiter opens a requisition, corrects it, closes or reopens it — and deletes it once it is closed —
   without leaving the app.
2. An interviewer is not offered the feature at all — no sidebar link, and the app's **404** for either
   route typed by hand — while the UI stays correct if the server refuses a call anyway.
3. Every state the list and the detail view can be in — loading, empty, filtered-empty, not found, forbidden,
   failed — is designed rather than defaulted.
4. The `/roles` list is linkable: a filter and a page live in the URL, so a recruiter can send a colleague
   "the closed ones".

Success means: a reviewer can open the app as an interviewer, find no way in — no link, and a 404 on both
URLs — and then watch the server refuse the call they make by hand anyway. Two separate facts, both visible,
and only the second one is the control.

---

## Revision — roles became recruiter-only

**What changed:** the roles feature is now a **recruiter-only** surface. The sidebar offers no Roles link to
an interviewer, `/roles` and `/roles/[roleId]` render the app's **404** for one, and the backend refuses their
`GET /api/roles` with a `403` (backend AZ-1, revised in the same pass).

**Why the 404 and not `/forbidden`:** a route a user has no business with should behave like a route that is
not there. `/forbidden` tells you a thing exists and you may not have it, which is information this app has no
reason to hand out — it stays for the case it was written for, a **server** refusal on a route the user can
legitimately open (FE-10.2, AZ-4).

**What it changed in this document:** the Goal, the Background reading of `CLAUDE.md`, the scope decisions,
the actors table, US-05 and US-06, FR-1.6, FR-2.3, FR-6 (replaced), FR-7.1a/b/c, FE-2.2/2.3/2.4, the new
**FE-10**, XBE-2, XBE-6, the route matrix, AZ-3, EC-01, EC-13, EC-18, SEC-2 and SEC-2a, the `<RequireRole>`
row of Out of Scope, and AC-F14 / F14a / F14b / F15 / F32 / F35 / F35a / F35b / M03.

**What it did not change:** `canManageRoles` stays, and stays read by both views (FR-1.6). Nothing about
forms, mutations, pagination, error states or the `UserRole` rename moves.

---

## Revision 2 — Delete role, on a closed role

**What changed:** the detail view of a **`CLOSED`** role now offers **Delete role**, behind a confirmation
dialog. The backend gained `DELETE /api/roles/:roleId` in the same pass — see its
[Revision 2](../../../../backend/specs/features/roles/spec.md#revision-2--delete-exists-restricted-to-closed-roles).

**Why:** FE-3.2 forbade a `deleteRole` wrapper because there was no endpoint, and FR-5 treated `CLOSED` as the
end of a role's life. In practice a recruiter who creates a requisition with a typo'd title, or creates the
same req twice, has no way to remove either — and a closed role is not out of sight, it is one filter click
away and counted in the pager.

**Why it is `CLOSED`-only in the UI too.** The server's rule is the control (backend FR-6.7); this client
mirrors it by not rendering the button at all on an open role, which is FE-2.4 — *where a control is not
offered, there is no trace of it* — applied to the app's only irreversible action. An open requisition is in
circulation, and closing it is the deliberate first step that makes deleting it available.

**What this revision does NOT add:** no delete from the list, no row menu, no bulk delete, no undo, no trash
view. Deleting is one role at a time, from the page showing that role (FR-7.9).

**What changed in this document:** the Goal, FR-2.3, the new FR-7, FE-3.1, FE-3.2, FE-5.1, FE-5.4, FE-5.5,
FE-6.4, the API table, the error table, EC-18…EC-21, AC-F33, AC-F35, AC-F41…AC-F47, and Out of Scope.

---

## Pending Revision 3 — the API's roles reads are no longer recruiter-only

**Status: proposed, not yet approved.** Nothing below this heading has changed in the implementation. This
note exists so this spec does not silently contradict a drafted one.

The [candidate spec](../candidate/spec.md) widens the **API's** two roles reads to any authenticated user, so
a candidate can browse open positions from `/jobs`. A non-recruiter's response is forced to `OPEN` rows
server-side and omits `updatedAt`.

**What changes for this feature:** very little. `<RequireRole allow={ROLES_USER_ROLES}>` on `/roles` stays
exactly as it is, both roles routes stay recruiter-only in the UI, and every write still answers `403` to a
non-recruiter. The one statement that stops being true is *"the API answers an interviewer's `GET /api/roles`
with a `403`"* — it will answer `200` with the open requisitions.

**If that spec is approved, the sections to revise here are:** the Revision block's opening claim, XBE-8, and
any AC asserting a `403` on a roles **read**. Write-endpoint ACs are unaffected.

---

## Background / Context

The brief's first sentence is about a recruiter's head being the only place a requisition exists. The backend
now has a `Role` model; this is the surface that makes it something a person can use.

[../../../CLAUDE.md](../../../CLAUDE.md) sets the rule this feature has to interpret carefully:

> Build views and API calls per the current user's role — don't build one "candidate view" that conditionally
> renders contact fields based on a client-side role check.

**This feature takes that rule at its word by not building the interviewer's view at all.** Roles are a
recruiter surface end to end: the API refuses an interviewer's `GET /api/roles` outright (backend AZ-1), so
there is no payload to conditionally render and nothing to hide. The client's job is to not offer a page it
knows would be refused — which is an affordance, not the control. _(Revised: this spec originally served both
user roles from one unscoped endpoint and differed only in which write controls rendered. See
[Revision](#revision--roles-became-recruiter-only).)_

### Current state of `frontend/`

|        | Today                                                                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack  | Next.js 16 App Router, React 19, TypeScript, Tailwind v4, dark-only (no theme provider)                                                                                                              |
| UI     | shadcn/ui over base-ui in [`src/components/ui/`](../../../src/components/ui/) — `badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `select`, `separator`, `sonner`, `table`, `textarea` |
| Data   | TanStack Query 5 via [`query-provider.tsx`](../../../src/components/providers/query-provider.tsx)                                                                                                    |
| HTTP   | [`src/lib/api.ts`](../../../src/lib/api.ts) — `apiFetch<T>()`, `ApiError`, Bearer attachment, single-flight 401 refresh-and-replay, 403 → `/forbidden`                                               |
| Auth   | Shipped: `(app)` route group behind `<RequireAuth>`, `useAuth()`, in-memory access token, chrome with name + role chip + logout                                                                      |
| Routes | `/login`, `/pipeline`, `/my-interviews` (placeholders), `/forbidden`, `/` (role redirect)                                                                                                            |
| Forms  | react-hook-form + `@hookform/resolvers/zod`; one schema, [`src/lib/schemas/auth.ts`](../../../src/lib/schemas/auth.ts)                                                                               |
| Toasts | `sonner` installed and wired — **and never yet used.** The auth feature raised no toast because its only success navigates                                                                           |
| Tests  | **none**, and none planned — verification is manual with DevTools open                                                                                                                               |

So this feature is the app's **first list, first table, first paginated view, first dialog, first multi-field
form, and first toast.** Every one of those is a pattern the candidate and feedback features will copy, which
is why the choices below are written down rather than left to the implementation.

### The `Role` name collision

The backend renames its `Role` enum to `UserRole` so that `Role` can mean _open requisition_. The client
mirrors it: `features/auth/types.ts` exports **`UserRole`**, and `features/roles/types.ts` exports **`Role`**.

**No API contract changes** — `/api/auth/me` still returns a `role` field whose value is `"RECRUITER"` or
`"INTERVIEWER"`. This is a type rename in four existing client files, nothing more. The reasoning is in the
backend spec's _"The `Role` name collision — decided here, once"_, and is not re-argued here.

### Scope decisions taken before writing this spec

Settled, not open:

- **Two routes**: `/roles` (list) and `/roles/[roleId]` (detail). Create and edit are **dialogs**, not routes.
- **Both routes are role-gated, and this feature builds the mechanism.** `<RequireRole>` — deferred by the
  auth spec for want of a consumer (auth FE-7.2) — ships here, because roles is that consumer. An interviewer
  gets the app's **404** on `/roles` and `/roles/[roleId]` (FE-10).
- **Status is changed by its own action, not by the edit form.** Closing a requisition is a decision, not a
  field you tab past.
- **No hiring manager anywhere.** The backend model has no such field — not in the schema, not in any
  response (backend FR-7.2) — so this client has no column for it, no detail field, no picker and no type.
  **A role in this POC references no person**, and the UI says nothing about who owns a req because the data
  does not know. The whole concept arrives with the `HIRING_MANAGER` user role, in its own spec.
- **Sonner is used for the first time**, for mutation success only. Failures stay inline — the auth spec's
  ERR-3 ("a failure is not a toast") still holds.

---

## Users / Actors

| Actor                           | Sees                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anonymous visitor**           | Nothing. `/roles` and `/roles/[roleId]` sit inside `(app)` and redirect to `/login?next=<path>` like every other guarded route.                                                     |
| **Interviewer** (`INTERVIEWER`) | **Nothing.** No Roles link in the sidebar, and the app's **404** on either route typed by hand — not a 403 view, and not a read-only rendering of the list (FE-10).                  |
| **Recruiter** (`RECRUITER`)     | The same views, plus create, edit, close and reopen. **Any recruiter may edit any role** — the UI shows no ownership, because neither the API nor the model has any (backend AZ-5). |

There is **no hiring-manager persona in this app**, and no field anywhere that names one.

---

## User Stories

**US-01** — As a **recruiter**, I want to open a requisition from the app in under a minute, so that a new
req is recorded where the team can see it rather than in a message thread.

**US-02** — As a **recruiter**, I want to see all open roles at a glance and switch to closed ones, so I can
answer "what are we hiring for?" without asking anyone.

**US-03** — As a **recruiter**, I want to fix a title or description I got wrong, without recreating the role.

**US-04** — As a **recruiter**, I want closing a role to feel deliberate — and to be able to undo it by
reopening, because reqs come back.

**US-05** — As an **interviewer**, I want the app to show me only what is mine to do, so that requisition
management is not a room I can see into and not enter. _(Revised: this story previously asked to read the
requisition behind a round. That need belongs to the rounds feature, served from my own assignment — see
[Revision](#revision--roles-became-recruiter-only).)_

**US-06** — As an **interviewer**, I want a route I have no access to to behave like a route that isn't
there — no greyed buttons, no "coming soon", and no "you are not permitted" that tells me what I'm missing.

**US-07** — As **any user**, I want a link to a filtered list to open the same filtered list for the person I
sent it to.

**US-08** — As **any user**, I want a role that doesn't exist to say so clearly, rather than showing an empty
page or a spinner that never resolves.

---

## Functional Requirements

### FR-1 — Roles list (`/roles`)

- **FR-1.1** Lists roles in a table: **Title**, **Status**, **Created**.
- **FR-1.2** A row opens that role's detail view. The whole row is the target, and the title is also a real
  link — so it is keyboard-reachable and middle-clickable.
- **FR-1.3** A status filter offers **All** (default), **Open**, **Closed**, and is reflected in the URL as
  `?status=OPEN|CLOSED` (absent for All).
- **FR-1.4** Pagination is reflected in the URL as `?page=`. Page size is fixed at the API default (20) and is
  not user-configurable in this feature.
- **FR-1.5** The URL is the source of truth for both. Opening `/roles?status=CLOSED&page=2` directly renders
  exactly that view, and the browser's back button moves between filter states (EC-02).
- **FR-1.6** A recruiter sees a **New role** action. The affordance check behind it stays (FE-2.1) even
  though every user who reaches this page now passes it — a control that renders because a guard two files
  away happened to run is a control waiting to be wrong.

### FR-2 — Role detail (`/roles/[roleId]`)

- **FR-2.1** Shows title, status, full description, and both timestamps. **That is every field the API
  returns** (backend FR-7.1) — there is nothing else to show.
- **FR-2.2** Timestamps render as absolute local date-times, with the relative form ("3 days ago") alongside
  for `createdAt`. Ageing is the brief's currency; a bare ISO string is not readable at a glance.
- **FR-2.3** A recruiter sees **Edit**, **Close role** / **Reopen role**, and — on a closed role only —
  **Delete role**, behind the same affordance check as FR-1.6. The three sit in that order, left to right:
  increasing consequence (FR-7).
- **FR-2.4** A role id that does not exist renders a designed **"Role not found"** state **inside the app
  chrome**, with a link back to `/roles` — not Next's 404 page, because the route exists and the data does
  not (EC-04).

### FR-3 — Creating a role

- **FR-3.1** A recruiter opens a dialog from `/roles` with **Title** and **Description** — the only two
  fields a role has that anyone can set.
- **FR-3.2** There is **no status field**. A new role is `OPEN`; the API refuses to be told otherwise
  (backend FR-4.3), and offering the choice would imply a state the app cannot create.
- **FR-3.3** On success the dialog closes, a success toast appears, and the app **navigates to the new role's
  detail view**. It does not return to the list: a new role is `OPEN`, so on a list filtered to Closed it
  would vanish on creation, and a recruiter who just typed a description deserves to see it saved rather than
  hunt for it (EC-06).
- **FR-3.4** While the request is in flight the dialog cannot be submitted twice, and cannot be dismissed by
  clicking away or pressing Escape — a half-sent create that looks cancelled is worse than a moment's wait.

### FR-4 — Editing a role

- **FR-4.1** A recruiter opens a dialog from the detail view, prefilled with the current title and
  description.
- **FR-4.2** It sends **only the fields that actually changed**. Submitting an untouched form is a no-op that
  closes the dialog and sends nothing (EC-07) — the API would reject an empty patch, and asking it to is
  pointless traffic.
- **FR-4.3** **Status is not in this form.** It is changed by its own action (FR-5).
- **FR-4.4** On success the dialog closes, a toast appears, and the detail view re-renders **from the
  response**, never from a locally merged copy.

### FR-5 — Opening and closing a role

- **FR-5.1** An open role offers **Close role**; a closed role offers **Reopen role**.
- **FR-5.2** **Closing asks for confirmation** in a dialog naming the role, because it is the action that
  takes a requisition out of circulation. **Reopening does not** — it is additive and trivially undone.
- **FR-5.3** Each sends `PATCH` with `{ status }` alone.
- **FR-5.4** On success: toast, and the detail view shows the new status. The list is invalidated so it is
  correct when the user returns to it (FE-5.3).
- **FR-5.5** The action is disabled while in flight, and the confirmation dialog cannot be dismissed
  mid-request.

### FR-7 — Deleting a role

> Added in [Revision 2](#revision-2--delete-role-on-a-closed-role).

- **FR-7.1** The detail view offers **Delete role** — and **only when the role's status is `CLOSED`**. On an
  open role the control is **absent entirely**: not disabled, not greyed, not accompanied by a tooltip
  explaining the rule. This is FE-2.4 applied to the one action that cannot be undone.
- **FR-7.2** That absence mirrors the server's rule, it does not implement it. The API answers a `DELETE` on
  an open role with `409 ROLE_NOT_CLOSED` whatever this client renders (backend FR-6.7, AZ-6). Hiding the
  button is an affordance, exactly as `canManageRoles` is.
- **FR-7.3** **Deleting always asks for confirmation**, in a dialog naming the role and stating plainly that
  it **cannot be undone**. Unlike the close dialog — whose "you can reopen it later" is its reassurance —
  there is no undo to offer, and the copy does not imply one.
- **FR-7.4** On success: a **"Role deleted"** toast, and the app navigates to `/roles`. It uses
  `router.replace`, not `push` — the role is gone, so leaving its URL in the history would make **Back**
  land on a not-found state the user just created.
- **FR-7.5** The detail cache entry for that role is **removed**, not overwritten. There is no role in the
  response to write back, and a stale entry would let a `/roles/:id` still mounted elsewhere re-render a
  requisition the server no longer has (FE-5.5).
- **FR-7.6** `409 ROLE_NOT_CLOSED` is handled as its **own outcome**, not as a generic failure. It means the
  role was reopened somewhere else since this page loaded, so the dialog stays open and says so — retrying
  would fail identically, and "something went wrong" would send the user in a circle (FE-6.4).
- **FR-7.7** A `404` during the delete is **not** an error to argue with: someone else deleted it, so the
  outcome the user asked for is the outcome they have. The dialog closes and the detail view resolves to its
  not-found state.
- **FR-7.8** The action is disabled while in flight and the dialog cannot be dismissed mid-request — the same
  rule as FR-5.5, and it matters more here: a dialog that vanishes while the `DELETE` lands would read as
  "cancelled" about a row that is gone.
- **FR-7.9** **There is no delete from the list.** No row menu, no bulk select, no swipe. Deleting is
  reached from the detail view, where the recruiter is looking at the role they are about to remove.

### FR-6 — Read access

> **Revised.** This section previously read _"both user roles see the same list and the same detail
> content"_. It is replaced, not amended — see [Revision](#revision--roles-became-recruiter-only).

- **FR-6.1** **Only a recruiter reads roles in this client.** There is no interviewer rendering of the list or
  the detail view, so no column, field or row is "hidden" from anyone — the page is not reached.
- **FR-6.2** This follows the API: `GET /api/roles` and `GET /api/roles/:roleId` are `RECRUITER`-only and
  answer an interviewer `403` (backend AZ-1, XBE-2). The client does not invent a narrowing the server does
  not perform, and it does not offer a page the server would refuse.
- **FR-6.3** **The client still never relies on the guard for safety.** If the API's refusal were removed
  tomorrow, this guard would be the only thing left — which is exactly why it is specified as an affordance
  (AZ-1) and why AC-M03 is checked with a hand-issued request.

### FR-7 — Navigation

> **Revised during implementation (2026-09-15), at the product owner's request.** The chrome moved from
> a horizontal top nav to a **sidebar grouped into role-based sections**, with the signed-in account in a
> header menu at the top right. FR-7.1 previously read _"shown to both user roles … consistent with the
> existing rule that no nav link is role-conditional"_; **that rule is withdrawn.** What replaces it, and
> what is deliberately unchanged, is below. AC-F32 is restated to match.

- **FR-7.1** The app chrome is a **sidebar**, grouped into labelled sections, plus a header carrying the
  signed-in user at the right.
- **FR-7.1a** Sidebar sections and links are **role-conditional**, driven by the user's role:
  - `RECRUITER` — **Hiring**: Pipeline, Roles
  - `INTERVIEWER` — **Interviews**: My interviews

  An interviewer is not offered `/pipeline`: they have no pipeline to read, and a door into a view with
  nothing behind it is worse than no door.

- **FR-7.1b** **The Roles link is recruiter-only** _(revised — it was previously present for both user
  roles)_. Offering it to an interviewer would be offering a door into the 404 that FE-10 renders for them.
- **FR-7.1c** **The sidebar is an affordance and gates nothing, including `/roles`.** What gates `/roles` is
  `<RequireRole>` (FE-10); what makes the data safe is the API. `/pipeline` remains reachable by an
  interviewer who types the URL — it has no guard of its own yet, and the pipeline feature owns that
  decision when it ships.
- **FR-7.1d** It is expressed as a **lookup table keyed by `UserRole`**, not a comparison, so FE-2.1's
  "one place" rule is untouched: `role === 'RECRUITER'` still appears only in `permissions.ts` (AC-F17).
- **FR-7.2** Landing routes are unchanged: `RECRUITER → /pipeline`, `INTERVIEWER → /my-interviews`. Changing
  where a recruiter lands belongs to the pipeline feature, which owns that page.
- **FR-7.3** The header's account menu shows the signed-in user's **name and email** and holds **Sign out**.
  It replaces the old chrome's inline name, role chip and log-out button; log-out behaviour is unchanged.

---

## Frontend Requirements

> **How this feature is built — the file layout, the query keys, the form state matrix and the mutation
> wiring — is [plan.md § Frontend Changes](./plan.md#frontend-changes).** This section states only what
> must be true.

### FE-1 — File structure

Two routes under `app/(app)/roles/` **plus the `layout.tsx` that guards them** (FE-10.3), a `features/roles/`
module holding the api wrapper, hooks, components, `permissions.ts` and `types.ts`, and one schema file at
`lib/schemas/role.ts`. Three files land outside the feature: `features/auth/components/RequireRole.tsx`,
`components/not-found-view.tsx` and `app/not-found.tsx` (FE-10).

Existing primitives are used and extended, never re-implemented. **One new primitive** is added:
`skeleton`. The authentication spec recorded that it added none (its AC-F32) precisely because nothing in
that feature had a list to show a placeholder for — that was a statement about _that_ feature's
deliverable, and this feature is the one that has the list.

> **The file-by-file layout is [plan.md § Frontend Changes](./plan.md#frontend-changes).**

### FE-2 — Role-based affordances

- **FE-2.1** `features/roles/permissions.ts` exports **one** predicate,
  `canManageRoles(user): boolean` — `user?.role === 'RECRUITER'`. Every write control reads it. There is no
  second place in the app where that comparison is written.
- **FE-2.2** It gates **rendering of controls**: the New role button, the Edit button, the status action.
  The routes themselves are gated by `<RequireRole>` (FE-10), which reads the same source (FE-10.4) — so
  `permissions.ts` is still the one place a user role is named, and still never gates a field, a column or a
  query.
- **FE-2.3** **This is an affordance, not a control, and it is not the pattern `CLAUDE.md` forbids.** The
  forbidden pattern is fetching restricted data and hiding it client-side; nothing is fetched for an
  interviewer at all — the API refuses them (backend AZ-1) and the client never asks. The backend
  re-authorizes every request on every request (backend SEC-1), and AC-M03 proves the UI behaves correctly
  when it refuses one.
- **FE-2.4** Where a control is not offered, **there is no trace of it**: no disabled button, no lock icon,
  no "recruiters only" caption. A control you cannot use is worse than one that is not there. The same
  principle produces FE-10.2's 404: a page you may not open should not announce itself (AC-F14).

### FE-3 — Data layer

- **FE-3.1** The api module exports exactly five functions — `listRoles`, `getRole`, `createRole`,
  `updateRole`, `deleteRole` — and every one goes through `apiFetch`. No component assembles a path or a
  header.
- **FE-3.2** *(Revised — this rule previously forbade `deleteRole`, because there was no endpoint.)*
  `deleteRole` exists now that `DELETE /api/roles/:roleId` does (backend FR-6.6). **The rule it stated still
  holds**: no wrapper is exported here for an endpoint that does not exist, because that is how a removed
  feature comes back by accident. `deleteRole` returns `Promise<void>` — the endpoint answers `204` and there
  is nothing to parse.
- **FE-3.3** There are exactly two query keys: one for the list, scoped by filter and page, and one for a
  single role by id.
- **FE-3.4** Filter and page values are read from the URL and passed into the list query key, so changing
  either is an ordinary refetch and the browser history does the rest.
- **FE-3.5** Queries use the provider's default `staleTime`. Roles change rarely, but they change from other
  people's sessions, so this feature adds no `staleTime: Infinity` of the kind identity has.

### FE-4 — Forms

- **FE-4.1** `RoleFormDialog` handles create and edit in one component, differing only in its default values,
  submit label, and which mutation it calls. Two dialogs that drift apart is the failure mode being avoided.
- **FE-4.2** react-hook-form + `zodResolver` with `roleCreateSchema` / `roleEditSchema` from
  `src/lib/schemas/role.ts`, following the existing `auth.ts` pattern.
- **FE-4.3** Fields are built from the existing `Field` / `FieldGroup` / `FieldLabel` / `FieldError`
  primitives. Description uses the existing `textarea` primitive.
- **FE-4.4** A live character count appears on Description once it passes 4,500 characters — silent until the
  5,000 limit is near, so it informs rather than nags.
- **FE-4.5** **Every state the dialog can be in is designed** — idle, client-invalid, submitting,
  `400`, `403`, `404`, `500`/network, and success — for **both** modes. Client-invalid makes no network
  request; a failed submit **never closes the dialog** and never loses a typed value. The per-state
  behaviours are the same ones § Error Handling specifies.

  > **The full state matrix is [plan.md § Frontend Changes](./plan.md#frontend-changes)** (`RoleFormDialog`).

- **FE-4.6** Escape and click-outside close the dialog **only when idle**, and a dialog with unsaved changes
  asks before discarding them.

### FE-5 — Mutations

- **FE-5.1** Create, update and delete are TanStack mutations. Create and update share one invalidation
  policy; delete has its own, for the reason in FE-5.5.
- **FE-5.2** **No optimistic updates.** Both mutations return the complete role (backend XFE-6), and the
  server's copy is what renders. An optimistic requisition that a validation error then rolls back is a worse
  experience than a 200 ms wait.
- **FE-5.3** On success the detail cache is set **from the response** and the list cache is invalidated — so
  returning to a list the user has already paged through shows the change, without a full cache clear.
- **FE-5.4** Success raises a `sonner` toast: "Role created", "Role updated", "Role closed", "Role reopened",
  "Role deleted". **This is the app's first toast** — and failures still do not use one (ERR-3).
- **FE-5.5** **Delete's cache policy is the one that differs, and it has to.** There is no role in a `204` to
  write back, so the detail entry is **removed** (`removeQueries`) rather than set — `setQueryData(undefined)`
  would leave a cached `undefined` that renders as a successful empty read. The list is invalidated by prefix
  like every other write, and **not** patched in place: dropping a row locally would leave the page one short
  and `total` one high until something refetched, which the pager makes visible immediately.
- **FE-5.6** **The delete mutation does not navigate.** Routing is the caller's, so the hook stays usable from
  anywhere; the detail view is what knows that "away" is `/roles` (FR-7.4).

### FE-6 — Error and empty states

- **FE-6.1** Every state below is designed. None is a bare spinner, an empty `<div>`, or a thrown error
  reaching the error boundary.

  | State                           | Rendered                                                                                               |
  | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
  | List loading                    | Skeleton rows in the table's own shape, so nothing shifts when data lands                              |
  | List empty, no filter           | "No roles yet." Recruiters also get the New role action inline; interviewers get the sentence alone    |
  | List empty, filtered            | "No closed roles." with a **Show all roles** action that clears the filter — never the unfiltered copy |
  | Page beyond the end             | The filtered-empty state plus **Back to first page** (EC-08)                                           |
  | List failed (`500` / network)   | "Couldn't load roles." with a **Try again** control that refetches                                     |
  | Detail loading                  | Skeleton in the detail layout's shape                                                                  |
  | Detail `404`                    | `RoleNotFound` — inside the chrome, with a link back to `/roles` (FR-2.4)                              |
  | Detail failed (`500` / network) | "Couldn't load this role." with **Try again**                                                          |
  | Any `403`                       | The existing `/forbidden` view, via the `apiFetch` handler already wired by the auth feature           |

- **FE-6.2** `403` handling is **entirely inherited**. `apiFetch` already routes it to `/forbidden`; this
  feature adds no `403` branch of its own, and must not.
- **FE-6.3** A raw status code, error object or endpoint path is never rendered to a user.
- **FE-6.4** **A `409` is not a retryable failure and is not shown as one.** Generic copy ("Something went
  wrong. Please try again.") would invite a retry that fails identically. The message names what changed and
  what to do about it, and the dialog stays open so the user can read it against the role they are looking at.

### FE-7 — Display rules

- **FE-7.1** Status renders as a `badge`: `OPEN` in the accent/positive treatment, `CLOSED` in the muted one.
  Colour is never the only signal — the badge carries the word.
- **FE-7.2** A long title truncates with an ellipsis in the table and wraps in full on the detail view. The
  table never scrolls horizontally on a laptop screen.
- **FE-7.3** The description renders with its line breaks preserved on the detail view, and is **not** shown
  in the table at all.

### FE-10 — Route protection

_Added by the revision that made roles recruiter-only._

- **FE-10.1** **`<RequireRole allow={…}>` is built here**, in `features/auth/components/RequireRole.tsx`, and
  is composed **inside** `<RequireAuth>`, never instead of it. It renders children when the signed-in user's
  `UserRole` is in `allow`, and the app's not-found view when it is not.
- **FE-10.2** **A disallowed role gets the app's 404, not `/forbidden`.** A surface a user has no business
  with does not exist as far as they are concerned; telling them it exists but is refused hands them
  information they were not owed. `/forbidden` keeps its own job: a **server** `403` on a route the user can
  legitimately open (AZ-4). The two are not interchangeable and neither replaces the other.
- **FE-10.3** **Both roles routes are gated in one place** — `app/(app)/roles/layout.tsx` — not per page. A
  guard repeated per route is a guard that will one day be forgotten on the next one.
- **FE-10.4** The allowed `UserRole` is read from `features/roles/permissions.ts`, so the guard and the write
  affordances cannot disagree and FE-2.1's "one literal, one place" rule survives (AC-F17).
- **FE-10.5** The 404 body is **one component**, shared by the guard and by `app/not-found.tsx`, so a refused
  route and a mistyped URL are indistinguishable by construction rather than by care. It is **not**
  `RoleNotFound` (FR-2.4), which is a *data* 404 inside the chrome for a recruiter whose role id does not
  exist — three different nothings, and the app now names all three.
- **FE-10.6** `app/not-found.tsx` is added in the same pass: the app had **no route-404 page at all** and was
  falling through to Next's default, which renders outside the app's own shell and copy. This is the
  "fix the mechanism while you are in it" half of the change, not scope creep.
- **FE-10.7** The guard renders **nothing** while identity is unresolved, relying on `<RequireAuth>` above it
  for that state. A 404 flashed at a recruiter mid-bootstrap would be a worse bug than the one this prevents
  (AC-F14a).

### FE-8 — Types

`features/roles/types.ts` mirrors the backend contract: `RoleStatus = 'OPEN' | 'CLOSED'`,
`Role = { id, title, description, status, createdAt, updatedAt }`, plus the list and detail response envelopes
and the `Pagination` shape.

**The `Role` type has no reference to a user of any kind** — no hiring manager, no creator, no assignee —
matching the backend model exactly (backend FR-7.2). A payload that ever carried one would be a type error
here as well as a backend bug to flag ([../../../CLAUDE.md](../../../CLAUDE.md)).

### FE-9 — The `UserRole` rename

`features/auth/types.ts` renames its exported `Role` to `UserRole`; `useAuth.ts` and `redirect.ts` follow. The
`role` field on `User` and every value it holds are unchanged, so **no request or response shape moves** and a
live session is unaffected. Four files, one mechanical rename (FE Dependencies).

---

## Backend Requirements

Full backend behaviour is specified in
[../../../../backend/specs/features/roles/spec.md](../../../../backend/specs/features/roles/spec.md). Only the
guarantees this frontend **depends on** are recorded here — if any changes, this spec breaks:

- **XBE-1** `GET /api/roles` accepts `status`, `page` and `pageSize`, and returns `{ roles, pagination }` with
  `pagination: { page, pageSize, total, totalPages }`. The client renders its pager from `totalPages` and
  never infers it.
- **XBE-2** `GET /api/roles` and `GET /api/roles/:roleId` are **`RECRUITER`-only** and answer an
  interviewer's token with `403 FORBIDDEN` (backend AZ-1). _Revised: this guarantee previously read "not
  role-scoped — both user roles receive the same rows"._
- **XBE-3** `GET /api/roles/:roleId` returns `404 NOT_FOUND` for an unknown id, in the standard error shape —
  distinguishable from a route that does not exist.
- **XBE-4** `POST /api/roles` returns `201` with the **complete** created role, including its new `id`, so the
  client can navigate straight to it.
- **XBE-5** `PATCH /api/roles/:roleId` accepts a partial body and returns `200` with the **complete** updated
  role — the client re-renders from it rather than merging its own patch (FE-5.2).
- **XBE-6** **Every** roles endpoint is `RECRUITER`-only and returns `403 FORBIDDEN`, never `401`, for an
  authenticated interviewer — the interceptor's refresh-and-replay must not be triggered by an authorization
  failure.
- **XBE-7** `400 VALIDATION_ERROR` carries `details` keyed by **request-body field name**, so it maps straight
  onto form fields. **This feature is the first real consumer of `details`** — the backend fixes a defect that
  currently leaves it empty (backend BE-5), and without that fix FE-4.5's `400` row cannot work.
- **XBE-8** `message` on every error is user-safe copy this client may render verbatim.
- **XBE-9** The seed creates three demo roles (two open, one closed), so a fresh database renders a
  non-empty list and an exercisable filter. **Without a seeded database this feature has nothing to show** —
  and, as with login, no UI path creates the data.
- **XBE-10** `status` cannot be set on create, so the create form's lack of a status field matches the
  contract rather than merely agreeing with it by luck.
- **XBE-11** The `UserRole` rename changes **no** request or response field. `/api/auth/me` still returns
  `role: "RECRUITER" | "INTERVIEWER"`.

---

## API Contract

As consumed by this client. Canonical definitions live in the backend spec.

| Call                       | When                                | Sends                                      | Expects                                                    |
| -------------------------- | ----------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `GET /api/roles`           | `/roles` renders or its URL changes | `?status=` `?page=`                        | `200 { roles, pagination }` · `400` · `401`                |
| `GET /api/roles/:roleId`   | `/roles/[roleId]` renders           | —                                          | `200 { role }` · `400` · `401` · `404`                     |
| `POST /api/roles`          | Create dialog submit                | `{ title, description }`                   | `201 { role }` · `400 VALIDATION_ERROR` · `403 FORBIDDEN`  |
| `PATCH /api/roles/:roleId` | Edit dialog submit, status action   | `{ title?, description? }` or `{ status }` | `200 { role }` · `400` · `403 FORBIDDEN` · `404 NOT_FOUND` |
| `DELETE /api/roles/:roleId` | Delete confirmation submit          | — (no body)                                | `204` (empty) · `401` · `403` · `404 NOT_FOUND` · `409 ROLE_NOT_CLOSED` |

**This is the complete list — five calls** *(revised; there were four)*. `DELETE` sends no body and expects
no body: `deleteRole` is typed `Promise<void>`, and `apiFetch` handles a `204` correctly because it carries
no JSON content-type and is read as an empty string.

### Client-side rules

- **API-1** Every call goes through `apiFetch`. No component calls `fetch` directly.
- **API-2** All role calls are wrapped in `features/roles/api/roles.api.ts`.
- **API-3** Query keys are exactly the two in FE-3.3.
- **API-4** The client never sends `status` on create, never sends `id`, `createdAt` or `updatedAt` on any
  write, and never sends an empty `PATCH` body (FR-4.2).
- **API-5** `deleteRole` sends **no body at all** — not `{}`, not the role. The URL carries everything the
  endpoint reads, and the client never checks the role's status before calling: the `409` is the server's to
  give (FR-7.2).

---

## Data Model Changes

**No database.** This client owns only view state, and none of it is persisted:

| State                         | Where it lives       | Lifetime                    | Persisted?                                             |
| ----------------------------- | -------------------- | --------------------------- | ------------------------------------------------------ |
| Status filter, page           | The URL query string | The history entry           | Only as a URL — shareable, which is the point (FR-1.5) |
| Role list, role detail        | TanStack Query cache | Until invalidated or unload | No                                                     |
| Dialog open/mode, form values | Component state      | Until the dialog closes     | No                                                     |

- **DM-1** **Nothing in this feature touches `localStorage`, `sessionStorage` or IndexedDB** — the auth
  spec's hard rule is about credentials, and this feature adds no exception to it for anything else either.
- **DM-2** A draft in a half-filled create dialog is **not** preserved across a reload. Recorded as a decision,
  not an oversight: preserving it means writing user-entered text to browser storage, which this app does not
  do.

---

## Authentication / Authorization

### Route matrix

| Route             | Anonymous        | INTERVIEWER         | RECRUITER               |
| ----------------- | ---------------- | ------------------- | ----------------------- |
| `/roles`          | → `/login?next=` | **404** (app's own) | ✅ read + New role      |
| `/roles/[roleId]` | → `/login?next=` | **404** (app's own) | ✅ read + Edit + status |

**Two axes now, and the second one is new to this app.** Session decides whether a route renders at all
(`<RequireAuth>`); `UserRole` decides whether *these* routes exist for you (`<RequireRole>`, FE-10). Inside
`/roles`, `canManageRoles` still decides which controls draw — a third axis that is currently always true,
and kept for the reason FR-1.6 gives. _Revised: this matrix previously read `✅ read-only` for an
interviewer._

### Non-negotiable rules

- **AZ-1** **The backend is the control.** `canManageRoles` decides what to render and nothing else. Every
  write is re-authorized server-side on every request (backend SEC-1).
- **AZ-2** Role is read from `useAuth()`, which is backed by `GET /api/auth/me` — never from a URL, a form
  field, browser storage, or a decoded token.
- **AZ-3** **`<RequireRole>` is built by this feature** _(revised — it was previously deferred for want of a
  consumer)_. Roles is that consumer: the first genuinely role-gated route in the app. It is still an
  affordance — it decides what to paint, and the backend's `403` is what makes the data safe (FE-10.2,
  AC-M03).
- **AZ-4** A `403` reaching this client is handled exactly as the auth feature specified — the 403 view, not
  a toast and not a silent bounce — and it stays reachable even though the UI exposes no control that should
  produce one (AC-M03).

---

## Validation

Client schemas live in `src/lib/schemas/role.ts`, follow the house pattern (zod object + `z.infer` type
export), and **mirror the backend rules** (backend § Validation) for responsiveness.

| Field         | Rule                            | Message                                                                    |
| ------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `title`       | required, trimmed, 1–120 chars  | "Title is required" / "Title must be 120 characters or fewer"              |
| `description` | required, trimmed, 1–5000 chars | "Description is required" / "Description must be 5000 characters or fewer" |

- **VAL-1** `roleEditSchema` applies the **same** rules — an edit may not empty a field that create required.
- **VAL-2** Trimming happens in the schema, so a title of `"   "` fails before a request is made, exactly as
  the server would (backend VAL-2).
- **VAL-3** **No schema in this feature has a `status` field.** There is no payload shape in which the client
  could set a status on create (FR-3.2).
- **VAL-4** Client validation is **UX only** and never a substitute for the backend's rules. Where they
  disagree, the backend is correct and the client schema is the bug.
- **VAL-5** Server `details` are mapped onto fields with `setError`, so a rule the client missed still lands
  on the right input.
- **VAL-6** Validation runs on submit and re-validates on change **after** the first failed submit — the
  existing login-form behaviour, unchanged.
- **VAL-7** The `?status=` and `?page=` query parameters are validated **client-side before a request is
  made**: an unrecognised `status` is treated as no filter, and a non-numeric or `< 1` `page` as page 1. The
  server would reject both with a `400` (backend EC-02, EC-03); turning a mistyped URL into a working page is
  better than turning it into an error state (EC-03).

---

## Error Handling

Every backend error arrives as an `ApiError` with `status`, `message` and `body: { code, message, details? }`.

| Status / `code`                            | Where                | UI behaviour                                                                                           |
| ------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `400 VALIDATION_ERROR`                     | Create / edit dialog | Map `details` onto fields with `setError`; dialog stays open; no toast                                 |
| `400 VALIDATION_ERROR`                     | A list/detail read   | Should be unreachable — VAL-7 sanitises the parameters first. Falls back to the generic failed state   |
| `401 UNAUTHENTICATED`                      | Any call             | Inherited: the interceptor refreshes once and replays; on failure, redirect to `/login`                |
| `403 FORBIDDEN`                            | Any write            | Inherited: the `/forbidden` view. This feature adds no handling of its own (FE-6.2)                    |
| `404 NOT_FOUND`                            | Detail read          | The designed `RoleNotFound` state inside the chrome (FR-2.4)                                           |
| `404 NOT_FOUND`                            | Edit / status write  | Close the dialog and switch the detail view to the not-found state — the role went away underneath     |
| `404 NOT_FOUND`                            | Delete               | Someone else already deleted it. **Not surfaced as a failure** — close the dialog, resolve to the not-found state (FR-7.7) |
| `409 ROLE_NOT_CLOSED`                      | Delete               | The role was reopened elsewhere. The dialog **stays open** with a message naming that remedy — never the generic "try again" (FR-7.6, FE-6.4) |
| `500 INTERNAL_ERROR`                       | Any read             | "Couldn't load…" with a **Try again** control                                                          |
| `500 INTERNAL_ERROR`                       | Any write            | Form-level _"Something went wrong. Please try again."_; values retained                                |
| Network failure (`TypeError` from `fetch`) | Any call             | Identical to the `500` behaviour for that surface — never a raw error string, never an endless spinner |

### Rules

- **ERR-1** Branch on `body.code`, not on `message` copy.
- **ERR-2** A raw error object, stack, or status number is never rendered to a user.
- **ERR-3** **Failures are inline; only successful actions toast.** The auth spec set this rule and this
  feature is the first to have successes worth toasting — which makes it the first chance to break it.
- **ERR-4** Every mutation has a visible error state. None fails silently, and no dialog closes on an error.
- **ERR-5** If a response ever carries a field this client should not have received — anything beyond the six
  fields in FE-8 — it is reported as a backend bug, not filtered here
  ([../../../CLAUDE.md](../../../CLAUDE.md)).

---

## Edge Cases

| #     | Case                                                       | Required behaviour                                                                                                                                                      |
| ----- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-01 | Interviewer opens `/roles` or `/roles/1` by typing the URL | The app's **404**, inside the chrome, identical to a mistyped URL. **Not** the `/forbidden` view, not a redirect, and **no request is made** (FE-10.2, FE-10.5).         |
| EC-02 | User filters to Closed, then presses Back                  | The list returns to the previous filter. Filter state lives in the URL, so history works without bespoke handling (FR-1.5).                                             |
| EC-03 | `/roles?status=BANANA&page=-2` typed by hand               | Renders the unfiltered first page. The bad parameters are sanitised client-side and never sent (VAL-7).                                                                 |
| EC-04 | `/roles/9999` — no such role                               | `RoleNotFound` inside the app chrome, with a link to `/roles`. **Not** Next's 404 page: the route exists, the data does not.                                            |
| EC-05 | `/roles/abc` — not an id at all                            | The same not-found state, rendered **without making a request** — the client knows the shape is wrong.                                                                  |
| EC-06 | Recruiter creates a role while the filter is Closed        | Navigates to the new role's detail view, so the new `OPEN` role is never "lost" behind a filter that excludes it (FR-3.3).                                              |
| EC-07 | Recruiter opens Edit and submits without changing anything | The dialog closes and **no request is sent** (FR-4.2).                                                                                                                  |
| EC-08 | `?page=5` with only one page of roles                      | The filtered-empty state plus **Back to first page**. The server returns a truthful empty page, not an error (backend FR-2.6).                                          |
| EC-09 | Two recruiters edit the same role at once                  | Last write wins server-side. The second recruiter's next render shows the merged truth, because the view re-renders from the response, not from a local merge (FE-5.2). |
| EC-10 | Role is closed in another tab, then edited in this one     | The edit succeeds; the response carries `status: "CLOSED"` and the detail view updates to it. The client never assumes its cached status is current.                    |
| EC-11 | Role is deleted from the database while its page is open   | The next read or write returns `404`; the view switches to `RoleNotFound`. (No endpoint deletes a role — this covers direct `psql`.)                                    |
| EC-12 | Access token expires mid-dialog                            | Inherited: one silent refresh and one replay. **The dialog's contents are not lost**, because the replay reuses the captured body.                                      |
| EC-13 | Interviewer replays a `POST /api/roles` from DevTools      | `403` → the `/forbidden` view. The client handles a status its own UI gives no route to (AZ-4). A hand-issued `GET /api/roles` behaves the same way.                    |
| EC-18 | Interviewer's session is on `/roles` when their role changes | Not reachable in this POC — no endpoint changes a user's role, and identity is fetched once per page load. Recorded so the next feature that can change a role knows it must invalidate identity, not just re-render. |
| EC-14 | 5,000-character description pasted in                      | Accepted; the counter shows the limit (FE-4.4). 5,001 fails client-side before a request.                                                                               |
| EC-15 | A very long title in the table                             | Truncated with an ellipsis and a `title` attribute; wraps in full on the detail view. **The table never scrolls horizontally** (FE-7.2).                                |
| EC-16 | Backend unreachable when `/roles` opens                    | "Couldn't load roles." with **Try again** — not an endless skeleton (FE-6.1).                                                                                           |
| EC-17 | User closes the create dialog with text typed in           | A confirmation before discarding (FE-4.6). Nothing is written to browser storage either way (DM-2).                                                                     |
| EC-19 | Role is reopened in another tab, then deleted in this one  | `409 ROLE_NOT_CLOSED`. The dialog **stays open** and says the role is open again and must be closed first — not "something went wrong" (FR-7.6, FE-6.4).                |
| EC-20 | Role is deleted in another tab, then deleted in this one   | `404`. **Not treated as a failure** — the dialog closes and the view resolves to `RoleNotFound`. The user asked for it to be gone and it is (FR-7.7).                   |
| EC-21 | User presses Back after deleting a role                    | They land on whatever preceded the detail view, **not** on the deleted role's URL — the navigation is `router.replace` (FR-7.4).                                        |
| EC-22 | A recruiter is on the detail view of an **open** role      | **No Delete control is rendered at all** — not disabled, no tooltip, no explanation (FR-7.1, FE-2.4). Closing the role is what makes it appear.                          |

---

## Security Requirements

- **SEC-1 — Client role checks are affordances, never controls.** `canManageRoles` decides what renders. The
  backend re-authorizes every write, and **AC-M03 proves it by issuing a write from an interviewer's session
  by hand** and confirming the refusal.
- **SEC-2 — Nothing is fetched-and-hidden.** An interviewer's client never issues a roles request, and the
  API would refuse it if it did. The distinction from the pattern `CLAUDE.md` forbids is stated in FE-2.3
  precisely because a reviewer should not have to work out which one this is.
- **SEC-2a — The route guard is not a data control and is not counted as one.** It stops a user opening a
  page that would only fail. If the backend's `403` were removed, the guard would not stand in for it — which
  is why AC-M03 issues its request by hand, outside every guard this client has.
- **SEC-3 — Flag, don't hide.** If a role payload ever carries a field beyond the six this client models —
  a user reference of any kind, say — it is reported as a backend bug rather than filtered in the UI (ERR-5).
- **SEC-4 — No credential or user-entered text in browser storage** (DM-1, DM-2).
- **SEC-5 — Description text is rendered as text.** It is user-supplied content displayed to other users;
  React escapes it, and **no `dangerouslySetInnerHTML`, no markdown renderer, and no HTML parsing is
  introduced by this feature**. Line breaks are preserved with CSS (`white-space: pre-wrap`), not by
  converting them to markup.
- **SEC-6 — No role or id is trusted from the URL.** `roleId` is a path segment used to fetch; what comes
  back is what renders. The client never infers permission or content from the URL itself.
- **SEC-7 — Known accepted gaps:** a recruiter's stale tab can show a role another recruiter has since
  changed until it refetches (EC-09, EC-10); and there is no client-side throttling on repeated writes,
  matching the backend's documented absence of rate limiting.

---

## Performance Requirements

- **PERF-1** `/roles` first paint to rendered table in **< 500 ms** p95 locally on a seeded database, with
  the skeleton designed to the table's real dimensions so **nothing shifts** when data lands.
- **PERF-2** Changing the status filter or the page issues **exactly one** `GET /api/roles`. A filter change
  must not also refetch the previous filter's page.
- **PERF-3** Opening a role from the list issues **exactly one** `GET /api/roles/:roleId`. The list response
  is not used to pre-seed the detail cache: the two shapes are identical today (backend FR-7.1), but relying
  on that couples the detail view to a list it may not have come from.
- **PERF-4** A create or update issues **exactly one** write and **at most one** follow-up read (the list
  invalidation), never a full cache clear.
- **PERF-5** Navigating between `/roles`, `/pipeline` and `/my-interviews` triggers **zero** additional
  `GET /api/auth/me` calls — the identity cache established by the auth feature is not disturbed.
- **PERF-6** No spinner appears for under ~150 ms of work.
- **PERF-7** The table renders a page of 20 rows without virtualisation. Page size is fixed and small enough
  that virtualising would be complexity with no payoff.

---

## Acceptance Criteria

Given/When/Then. **There is no automated test suite for this POC** — every criterion is signed off by hand
against the running app with DevTools open. Exact steps belong in
[plan.md § Verification Commands](./plan.md#verification-commands).

- `AC-F*` are **functional checks driven through the UI**.
- `AC-M*` additionally require a running backend and a seeded database.

Both a recruiter and an interviewer session are needed, and the backend must be seeded (XBE-9).

### List view

- **AC-F01** — **Given** a seeded database, **when** a recruiter opens `/roles`, **then** the table lists the
  seeded roles with title, status badge and created date, newest first.
- **AC-F02** — **Given** the list, **when** the **Open** filter is chosen, **then** the URL becomes
  `/roles?status=OPEN`, only open roles are listed, and **exactly one** `GET /api/roles` is issued (PERF-2).
- **AC-F03** — **Given** `/roles?status=CLOSED`, **when** the page is reloaded, **then** the Closed filter is
  still applied — the URL is the source of truth (FR-1.5).
- **AC-F04** — **Given** a filtered list, **when** the browser Back button is pressed, **then** the previous
  filter renders (EC-02).
- **AC-F05** — **Given** `/roles?status=BANANA&page=-2`, **when** it loads, **then** the unfiltered first page
  renders and the Network tab shows **no** `400` (VAL-7, EC-03).
- **AC-F06** — **Given** a status filter matching no roles, **when** the list renders, **then** the
  filtered-empty state appears with a **Show all roles** action that clears the filter.
- **AC-F07** — **Given** more roles than one page, **when** the pager is used, **then** the URL carries
  `?page=`, the correct rows render, and no row appears on two pages.
- **AC-F08** — **Given** `/roles?page=99`, **when** it loads, **then** the empty state with **Back to first
  page** renders — not an error, and not a blank table (EC-08).
- **AC-F09** — **Given** a slow network, **when** `/roles` loads, **then** skeleton rows render in the table's
  shape and **nothing shifts position** when the data arrives (PERF-1).
- **AC-F10** — **Given** the backend is unreachable, **when** `/roles` loads, **then** "Couldn't load roles."
  renders with a working **Try again** control (EC-16).

### Detail view

- **AC-F11** — **Given** the list, **when** a row is clicked, **then** `/roles/[roleId]` renders that role's
  title, status, full description and timestamps, and **exactly one** `GET /api/roles/:roleId` is issued
  (PERF-3).
- **AC-F12** — **Given** `/roles/9999`, **when** it loads, **then** the "Role not found" state renders inside
  the app chrome with a link to `/roles` — **not** Next's 404 page (EC-04).
- **AC-F13** — **Given** `/roles/abc`, **when** it loads, **then** the same not-found state renders and the
  Network tab shows **no request at all** (EC-05).

### Role-based affordances

- **AC-F14** — **Given** an **interviewer** session, **when** `/roles` and `/roles/9` are opened by typing
  the URL, **then** each renders the app's **404** — the same body a mistyped URL renders — and the Network
  tab shows **no `/api/roles` request at all**. A `/forbidden` view is a failure, and so is a read-only list
  (FE-10.2, EC-01). _Revised: this criterion previously required both pages to render read-only._
- **AC-F14a** — **Given** an interviewer session, **when** `/roles` is opened on a throttled network,
  **then** **no 404 flashes before the guard settles** — the page is blank or loading until identity is
  known, then 404 (FE-10.7).
- **AC-F14b** — **Given** a **recruiter** session, **when** `/roles` is opened on a throttled network,
  **then** **no 404 flashes before the list appears** — the same guard, proven in the other direction
  (FE-10.7).
- **AC-F15** — **Given** an interviewer session, **when** the sidebar is inspected, **then** it offers
  **Interviews → My interviews only** — there is **no Roles link** (FR-7.1a, FR-7.1b). _Revised: this
  criterion previously compared the fields of a role an interviewer could read._
- **AC-F16** — **Given** a **recruiter** session, **when** the same pages are opened, **then** New role, Edit
  and the status action are all present.
- **AC-F17** — **Given** the client's source, **when** it is searched, **then** `role === 'RECRUITER'` appears
  in **exactly one place** — `features/roles/permissions.ts` (FE-2.1).

### Creating

- **AC-F18** — **Given** a recruiter on `/roles`, **when** New role is opened, **then** the dialog has
  **exactly two fields** — Title and Description — and **no status control** (FR-3.1, FR-3.2).
- **AC-F19** — **Given** the create dialog, **when** it is submitted empty, **then** per-field messages render
  and **no network request is made**.
- **AC-F20** — **Given** a title of `"   "`, **when** the form is submitted, **then** it fails client-side —
  trimming applies before the rule (VAL-2).
- **AC-F21** — **Given** a valid create, **when** it succeeds, **then** the dialog closes, a "Role created"
  toast appears, and the app navigates to the **new role's detail view** showing `status: OPEN` (FR-3.3).
- **AC-F22** — **Given** the list filtered to Closed, **when** a role is created, **then** the app still lands
  on the new role's detail view rather than an empty filtered list (EC-06).
- **AC-F23** — **Given** a create in flight, **when** Escape is pressed or the backdrop is clicked, **then**
  the dialog stays open and the submit control stays disabled (FR-3.4).
- **AC-F24** — **Given** the server returns `400 VALIDATION_ERROR` with `details.title`, **when** the dialog
  handles it, **then** the message renders **under the Title field**, the dialog stays open, and the
  description the user typed is still there. _This criterion fails unless the backend's `details` defect is
  fixed (backend BE-5)._

### Editing and status

- **AC-F25** — **Given** a recruiter on a role's detail, **when** Edit is opened, **then** the form is
  prefilled with the current title and description and contains **no status field** (FR-4.3).
- **AC-F26** — **Given** the edit dialog, **when** it is submitted with nothing changed, **then** it closes
  and the Network tab shows **no `PATCH`** (EC-07).
- **AC-F27** — **Given** only the title is changed, **when** the form is submitted, **then** the `PATCH` body
  contains **only** `title` (API-4).
- **AC-F28** — **Given** an open role, **when** **Close role** is clicked, **then** a confirmation dialog
  naming the role appears, and the `PATCH` is sent only after confirming (FR-5.2).
- **AC-F29** — **Given** a closed role, **when** **Reopen role** is clicked, **then** the `PATCH` is sent
  **without** a confirmation step — reopening is additive (FR-5.2).
- **AC-F30** — **Given** a successful status change, **when** it resolves, **then** a toast appears, the badge
  updates, **and returning to `/roles` shows the new status** without a manual reload (FE-5.3).
- **AC-F31** — **Given** a write returns `500`, **when** the dialog handles it, **then** a form-level message
  renders, the dialog **stays open**, and every entered value is retained (ERR-4).

### Cross-cutting

- **AC-F32** — **Given** the app chrome, **when** it renders, **then** the sections match FR-7.1a for that
  user role exactly: a recruiter sees **Hiring → Pipeline, Roles**; an interviewer sees **Interviews → My
  interviews** and nothing else. _Restated twice: first from "the nav is identical for both" (FR-7.1a), then
  again when the Roles link became recruiter-only (FR-7.1b)._
- **AC-F32a** — **Given** an **interviewer** session, **when** `/pipeline` is opened by typing the URL,
  **then** it renders — the sidebar omits the link but gates no route (FR-7.1c).
- **AC-F32b** — **Given** the header, **when** the account menu is opened, **then** it shows the signed-in
  user's name and email and offers **Sign out** (FR-7.3).
- **AC-F33** — **Given** the client's source, **when** `features/roles/api/roles.api.ts` is read, **then** it
  exports exactly `listRoles`, `getRole`, `createRole`, `updateRole` **and `deleteRole`** — five functions,
  one per endpoint that exists, and no sixth (FE-3.1). _(Revised: this criterion previously required the
  absence of `deleteRole`.)_
- **AC-F34** — **Given** the client's source, **when** `src/lib/schemas/role.ts` is read, **then** **no schema
  has a `status` field** (VAL-3).
- **AC-F35** — **Given** the client's source, **when** it is searched for `method: 'DELETE'`, **then** the
  **only** match is inside `deleteRole` in `roles.api.ts` — no component issues one directly (API-1, API-2).
  _Revised twice: this criterion originally asserted the absence of `<RequireRole>`, which this feature now
  builds (AZ-3, FE-10.1), and then the absence of any `DELETE`, which Revision 2 adds._
- **AC-F35a** — **Given** the client's source, **when** `app/(app)/roles/` is read, **then** the guard appears
  **once**, in `layout.tsx`, and **neither page repeats it** (FE-10.3).
- **AC-F35b** — **Given** any session, **when** a URL matching no route at all is opened (`/nonsense`),
  **then** `app/not-found.tsx` renders the **same** body an interviewer gets at `/roles` (FE-10.5, FE-10.6).
- **AC-F36** — **Given** any session, **when** `localStorage` and `sessionStorage` are inspected after using
  the feature, **then** neither contains a role, a draft, or a filter (DM-1, DM-2).
- **AC-F37** — **Given** a role whose description contains `<script>alert(1)</script>`, **when** the detail
  view renders it, **then** the text is **displayed literally** and no script executes (SEC-5).
- **AC-F38** — **Given** navigation between `/roles`, `/pipeline` and `/my-interviews`, **when** the Network
  tab is watched, **then** **zero** additional `GET /api/auth/me` calls are made (PERF-5).

#### Deleting — added in Revision 2

- **AC-F41** — **Given** a recruiter on the detail view of an **`OPEN`** role, **when** the page is inspected,
  **then** there is **no Delete control in the DOM at all** — not a disabled button, not a hidden one
  (FR-7.1, FE-2.4, EC-22).
- **AC-F42** — **Given** the same role after **Close role**, **when** the view re-renders, **then**
  **Delete role** appears without a reload (FR-7.1).
- **AC-F43** — **Given** a closed role, **when** **Delete role** is clicked, **then** a confirmation dialog
  appears **naming the role** and stating the action **cannot be undone** — and it does **not** offer any
  wording implying a restore (FR-7.3).
- **AC-F44** — **Given** that dialog, **when** it is confirmed, **then** exactly **one** `DELETE` request is
  sent, a **"Role deleted"** toast appears, and the app is at `/roles` with the role absent from the list
  (FR-7.4, FE-5.4).
- **AC-F45** — **Given** a role deleted from its detail view, **when** the browser **Back** button is pressed,
  **then** the deleted role's URL is **not** in the history and the not-found state is not shown (FR-7.4,
  EC-21).
- **AC-F46** — **Given** a role reopened in a second tab, **when** the first tab confirms the delete, **then**
  the dialog **stays open** showing a message about the role being open again — and the generic "Something
  went wrong. Please try again." is **not** shown (FR-7.6, FE-6.4, EC-19).
- **AC-F47** — **Given** a role already deleted in a second tab, **when** the first tab confirms the delete,
  **then** the dialog closes and the view shows `RoleNotFound` — **no error message is rendered** (FR-7.7,
  EC-20).
- **AC-F48** — **Given** the confirmation dialog mid-request, **when** Escape is pressed or the backdrop is
  clicked, **then** the dialog **does not close** and the button reads "Deleting…" (FR-7.8).
- **AC-F49** — **Given** the client's source, **when** `features/roles/components/` and the list view are
  read, **then** **no delete control exists on the list or in a table row** (FR-7.9).

### Manual verification

- **AC-M01** — **Given** a fresh database and `npm run db:seed`, **when** a recruiter opens `/roles`, **then**
  three roles render, two open and one closed, and the status filter is exercisable against real data
  (XBE-9).
- **AC-M02** — **Given** a recruiter creates a role in the browser, **when** the `Role` table is inspected with
  `psql`, **then** the row exists with `status = 'OPEN'` and the timestamps the UI displayed.
- **AC-M03** — **Given** an **interviewer** session, **when** `fetch('<API>/api/roles', { method: 'POST', … })`
  **and** a plain `GET` of the same path are issued **by hand from the DevTools console** with the session's
  Bearer token, **then** both are `403`, **no row is created**, and the app renders the `/forbidden` view.
  _This is the criterion that proves neither the hidden buttons nor the route guard is what is protecting the
  endpoint_ (SEC-1, SEC-2a, AZ-4).
- **AC-M04** — **Given** an authenticated session idle past the access token's expiry, **when** a role edit is
  submitted, **then** it succeeds after **exactly one** `/api/auth/refresh`, and the dialog's contents are
  intact throughout (EC-12).
- **AC-M05** — **Given** two browser windows on the same role, **when** one closes it and the other then
  edits the title, **then** the second window's view shows **both** the new title and `CLOSED` — it rendered
  the server's response, not its own merge (EC-10).
- **AC-M06** — **Given** a role created in the UI, **when** the backend log is read, **then** a `role.created`
  line carries the acting recruiter's `actorId` and **no description text** (backend FR-8.4).

---

## Out of Scope

Explicitly excluded. Each is a deliberate decision, not an omission.

| Excluded                                              | Note                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hiring manager — column, field, picker and type**   | The backend model has no such field (backend FR-7.2 and its Out of Scope), so there is nothing to display and nothing to set. The app shows **no placeholder and no disabled control** in its place. It arrives with the `HIRING_MANAGER` user role and the views that need it. |
| **Showing who created or last changed a role**        | Not in the API response — attribution lives in the server log, not the model (backend SEC-4). Surfacing it needs a backend change first.                                                                                                                                        |
| ~~**Deleting a role**~~                               | **No longer excluded** — added in [Revision 2](#revision-2--delete-role-on-a-closed-role). A **`CLOSED`** role can be deleted from its detail view, behind a confirmation dialog (FR-7). An open role still cannot: the control is not rendered, and the API refuses it (backend FR-6.7). |
| **Deleting from the list, and bulk delete**           | Deleting is one role at a time, from the page showing that role (FR-7.9). No row menu, no multi-select, no swipe — a destructive action reached from a list of truncated titles is a mis-click waiting to happen.                                                                |
| **Undo, a trash view, or restoring a deleted role**   | The delete is permanent: the backend removes the row and keeps no `deletedAt` (backend Revision 2). There is nothing to restore from, and the confirmation dialog says so rather than implying otherwise (FR-7.3).                                                               |
| **Search and sort**                                   | No search box, no sortable columns — the API offers neither. Newest-first with a status filter is the whole of the list's controls.                                                                                                                                             |
| **Configurable page size**                            | Fixed at the API default of 20.                                                                                                                                                                                                                                                 |
| **Candidates, stages, rounds or feedback on a role**  | The detail view shows the requisition only. Its candidate list and stage counts arrive with the features that own them.                                                                                                                                                         |
| **Pipeline counts or ageing on the roles list**       | The brief's pipeline view (§3.5) is its own feature and its own aggregate endpoint.                                                                                                                                                                                             |
| **Optimistic updates**                                | Both mutations return the complete role; the server's copy renders (FE-5.2).                                                                                                                                                                                                    |
| **Draft persistence for an unsent form**              | Nothing user-entered is written to browser storage (DM-2).                                                                                                                                                                                                                      |
| **Bulk actions**                                      | No multi-select, no bulk close, no bulk delete.                                                                                                                                                                                                                                                 |
| ~~**`<RequireRole>`**~~                               | **No longer excluded** — this feature builds it, because `/roles` is the app's first role-gated route (AZ-3, FE-10).                                                                                                                                                            |
| **A role gate on `/pipeline`**                        | The guard exists now, but `/pipeline` is a placeholder the pipeline feature owns. It gates its own route when it has something to gate (FR-7.1c).                                                                                                                               |
| **Real content for `/pipeline` and `/my-interviews`** | Untouched placeholders. This feature adds a nav link and nothing else to them.                                                                                                                                                                                                  |
| **Changing the post-login landing route**             | Unchanged (FR-7.2). Where a recruiter lands is the pipeline feature's decision.                                                                                                                                                                                                 |
| **Automated tests of any kind**                       | Every criterion above is verified manually. A test runner and suite remain a deliberate later decision — no test dependency, config or file is added.                                                                                                                           |
| **i18n / theming work**                               | English copy only; the dark-only theme and existing tokens are untouched.                                                                                                                                                                                                       |

---

## Dependencies

### Blocked by

**[The backend roles spec](../../../../backend/specs/features/roles/spec.md)** must be implemented first —
all four endpoints, the `details` fix (backend BE-5) without which AC-F24 cannot pass, and the seed data
without which the list has nothing to show.

**[The authentication feature](../authentication/spec.md)** — implemented. This feature inherits its guard,
its chrome, its `apiFetch` interceptor and its `403` handling wholesale, and adds no auth behaviour of its own.

Since verification is entirely manual, **no acceptance criterion can be signed off until a seeded backend is
running.**

### Blocks

**Candidates, interview rounds, feedback and the pipeline view** — each needs a role to attach to, and each
will copy this feature's list, dialog, filter and error-state patterns.

### New npm dependencies

**None — runtime or dev.** `zod`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `sonner`
and the shadcn primitives are already installed and are reused.

**One new shadcn primitive:** `src/components/ui/skeleton.tsx`, generated with the existing `shadcn` CLI. It
is a local component file, not a dependency.

### Environment variables

`NEXT_PUBLIC_API_URL` already exists and is unchanged. **No new environment variable, and no secret in one.**

### Modified existing files

Four existing files change: the app chrome gains the **Roles** nav link, and three auth files carry the
`Role` → `UserRole` rename (FE-9) — **no field or value changes**. Everything else is new.

[`src/lib/api.ts`](../../../src/lib/api.ts) is **unchanged** — this feature needs no new HTTP behaviour.

> **The file-by-file table is [plan.md § Frontend Changes](./plan.md#frontend-changes).** The plan also
> records one correction the rename surfaced: `ApiErrorBody.details` is typed `Record<string, string>`
> here and produced as `Record<string, string[]>` by the API.

### Framework note

[../../../AGENTS.md](../../../AGENTS.md) warns that **this is Next.js 16 and its APIs differ from older
versions.** Two places in this feature depend on that: the dynamic route's params (`[roleId]`) and reading
search params in a client component. Read the relevant guide in `node_modules/next/dist/docs/` rather than
relying on remembered Next.js conventions — this is the app's first dynamic route.
[plan.md § Architecture Impact](./plan.md#architecture-impact) names the two guides and what they settle.

### External dependencies

**None.** No analytics, no error-reporting service, no external API.

### Cross-repo

This client and the backend share one API contract and the `UserRole` rename. A change to the endpoints, the
role shape, the error shape, the query parameters, or the enum naming must be made in **both** specs — see
[../../../../backend/specs/features/roles/spec.md](../../../../backend/specs/features/roles/spec.md).
