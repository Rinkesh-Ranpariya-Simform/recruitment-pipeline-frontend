# Audit — Recruiter Trace Feed (Frontend)

> **Status:** Draft — awaiting approval. `plan.md` is a later artifact and does not exist yet.
> **Feature slug:** `audit`
> **Scope:** `frontend/` — Next.js 16 App Router, React 19, TanStack Query
> **Counterpart:** [../../../../backend/specs/features/audit/spec.md](../../../../backend/specs/features/audit/spec.md)
> **Depends on:** [../authentication/spec.md](../authentication/spec.md) — implemented · [../roles/spec.md](../roles/spec.md) — implemented
> **Blocked by:** the backend counterpart. **Nothing in this spec can be verified until that ships.**
> **Parent brief:** [../../../../recruitment-pipeline.md](../../../../recruitment-pipeline.md) §6

---

## Goal

1. Give a recruiter one screen that answers *"what happened, to what, by whom, and when"* — the
   question the brief says a hiring manager asks when a candidate disputes an assessment.
2. Make the feed **filterable by entity, action and actor**, with the filters in the URL so a
   recruiter can paste a link to exactly the trace they are reading.
3. Render `metadata` **defensively** — an object whose shape depends on `action`, formatted where
   the shape is known and shown raw where it is not, never throwing on an unexpected key.
4. Show this route to **recruiters only**, and never rely on that as the control.

Success means: a recruiter opens `/audit?entityType=APPLICATION&entityId=12`, reads the life of one
application top to bottom — applied, screened, overridden with a named recruiter and a typed reason,
interviewed, fed back on — and can send that URL to a colleague who sees the same thing.

---

## Background / Context

The brief asks for a structured trace and says why:

> Every stage transition, override, and feedback submission should leave a structured trace — this
> is what a hiring manager would ask for if a candidate disputes how they were assessed.
> — §6

The backend writes that trace; this feature is the only way to read it without a `psql` prompt.

### Translation from the request

| Described | Built as |
|---|---|
| "Audit" in the recruiter navbar | A `/audit` route in the `(app)` group, guarded by `<RequireRole allow={AUDIT_USER_ROLES}>` in a route `layout.tsx`, matching `/roles` |
| A list of audit events | A `<Table>` from the vendored shadcn primitives — the same component `RolesTable` uses |
| Filters | URL search params parsed by a `search-params.ts` helper, exactly as `/roles` and `/jobs` do |
| `metadata` blobs | A per-action formatter with a raw key/value fallback |

### Current state of `frontend/`

|                | Today |
| -------------- | ------ |
| Stack | Next.js 16 App Router, React 19, TanStack Query, Tailwind v4, shadcn/ui, `sonner` |
| Data layer | `apiFetch` in [`src/lib/api.ts`](../../../src/lib/api.ts) — single-flight refresh on `401`, `/forbidden` redirect on `403` |
| Error reading | `errorBodyOf` / `fieldMessage` in [`src/lib/error-details.ts`](../../../src/lib/error-details.ts) |
| Query keys | `[feature, 'list', params]` / `[feature, 'detail', id]`, factories colocated with the hook |
| Guards | `<RequireAuth>` in `(app)/layout.tsx`, `<RequireRole allow={…}>` per route group; a disallowed role gets `<NotFoundView />`, not `/forbidden` |
| Nav | Inline in [`(app)/layout.tsx`](<../../../src/app/(app)/layout.tsx>) as `NAV_SECTIONS: Record<UserRole, Array<NavSection>>` |
| Pagination | `RolesPagination` in `features/roles/components/` — the only pager in the app |
| Primitives | badge, button, card, dialog, dropdown-menu, field, input, label, select, separator, skeleton, sonner, table, textarea. **No tabs, popover, tooltip, command, sheet, drawer, calendar or avatar** |
| Audit | **nothing.** No route, no nav entry, no feature folder |

### Decisions carried from the interview

| # | Question | Decision |
|---|---|---|
| D-1 | Where does the feed live? | A top-level `/audit` route, recruiter-only, plus deep links from other features' detail pages |
| D-2 | Table or timeline? | **Table.** A trace is scanned and filtered, not read as prose, and `Table` is already vendored |
| D-3 | Where do filters live? | **The URL.** A trace nobody can link to is a trace people screenshot |
| D-4 | How is `metadata` rendered? | A formatter per known `action`, with a raw key/value fallback. **Never `JSON.stringify` as the primary render**, and never a crash on an unknown key |
| D-5 | Is the feed live/polled? | **No.** A manual Refresh action, no interval. Polling an append-only table nobody is watching in real time is wasted requests |
| D-6 | Does the client link `entityId` to its record? | **Yes, where the entity type has a route** — `APPLICATION` and `CANDIDATE` link into `/candidates/…` once that feature ships. Until then the id renders as text |
| D-7 | New dependency? | **None.** Table, Select, Button, Badge, Card and `lucide-react` cover it |

---

## Users / Actors

| Actor | Sees |
|---|---|
| Anonymous | `/login` — `<RequireAuth>` redirects with `?next=/audit` |
| Candidate | The app's 404. No nav entry, no route |
| Interviewer | The app's 404. No nav entry, no route |
| Recruiter | The full feed with all filters |

**Deliberate trade-off:** a candidate cannot see their own trace, matching the backend. The
walkthrough gives candidates Jobs and My Applications only.

---

## User Stories

| ID | Story |
|---|---|
| **US-01** | As a recruiter, I want one screen listing every recorded action, so that I do not need database access to answer a question about a candidate. |
| **US-02** | As a recruiter, I want to filter to one application, so that a dispute about one person is one page rather than a search. |
| **US-03** | As a recruiter, I want to filter to every stage override, so that I can review exceptions without reading everything else. |
| **US-04** | As a recruiter, I want an override's reason and the name of whoever performed it visible in the row, so that the answer is where the question is. |
| **US-05** | As a recruiter, I want to paste a link to the trace I am reading, so that a colleague sees the same thing. |
| **US-06** | As a recruiter, I want the page to say clearly when there is nothing to show, so that an empty feed is not indistinguishable from a broken one. |

---

## Functional Requirements

### FR-1 — Route and access

- **FR-1.1** A new route `/audit`, in the `(app)` group, with a `layout.tsx` wrapping it in
  `<RequireRole allow={AUDIT_USER_ROLES}>` where
  `AUDIT_USER_ROLES: ReadonlyArray<UserRole> = ['RECRUITER']`.
- **FR-1.2** A disallowed role renders `<NotFoundView />` — the app's own 404 — matching every other
  guarded route. It does **not** redirect to `/forbidden`, which is reserved for a server refusal.
- **FR-1.3** `NAV_SECTIONS.RECRUITER` gains a **Records** section containing a single Audit link,
  icon `ScrollTextIcon`. `NAV_SECTIONS.INTERVIEWER` and `.CANDIDATE` are unchanged.
- **FR-1.4** The guard and the nav entry are **UX, not security**. The backend returns `403` to any
  non-recruiter regardless (AZ-1).

### FR-2 — The feed

- **FR-2.1** `/audit` renders a table of entries, newest first, in the order the API returns them.
  **The client never re-sorts** — the API's `createdAt desc, id desc` is the order, and a second
  sort in the client is a second source of truth.
- **FR-2.2** Columns: **When · Action · Entity · Actor · Details**.
- **FR-2.3** **When** renders a relative time (`2 hours ago`) with the absolute UTC timestamp in the
  `title` attribute. A trace needs both: scanning wants relative, disputing wants absolute.
- **FR-2.4** **Action** renders a `<Badge>` with a human label from
  `ACTION_LABELS: Record<AuditAction, string>` — a total map, so a new backend action is a **compile
  error**, not a blank cell. Badge variant is chosen by a second total map, so overrides read as
  exceptional.

  | `action` | Label | Variant |
  |---|---|---|
  | `CANDIDATE_STAGE_CHANGED` | Stage changed | `secondary` |
  | `STAGE_OVERRIDE_CREATED` | **Stage override** | `destructive` |
  | `APPLICATION_OUTCOME_SET` | Outcome set | `default` |
  | `INTERVIEW_CREATED` | Interview scheduled | `secondary` |
  | `INTERVIEWER_ASSIGNED` | Interviewer assigned | `outline` |
  | `INTERVIEWER_UNASSIGNED` | Interviewer removed | `outline` |
  | `FEEDBACK_SUBMITTED` | Feedback submitted | `secondary` |
  | `FEEDBACK_UPDATED` | Feedback edited | `outline` |
  | `CANDIDATE_CONTACT_UPDATED` | Contact details updated | `outline` |

- **FR-2.5** **Entity** renders `<label> #<id>` — e.g. `Application #12` — from
  `ENTITY_LABELS: Record<AuditEntityType, string>`. Once the candidates feature ships, `CANDIDATE`
  entities link to `/candidates/{entityId}` (D-6); until then every entity renders as text.
- **FR-2.6** **Actor** renders `entry.actor.name` with the role as a muted suffix. It is never
  blank: the API guarantees `actor` is always present (XBE-5).
- **FR-2.7** **Details** renders the formatted `metadata` (FR-3).
- **FR-2.8** Paginated with the existing pagination component's props shape. Page lives in the URL.

### FR-3 — Rendering `metadata`

- **FR-3.1** A formatter maps a known `action` to a short readable line:

  | `action` | Rendered as |
  |---|---|
  | `CANDIDATE_STAGE_CHANGED` | `Applied → Screen` (stage labels, an arrow) |
  | `STAGE_OVERRIDE_CREATED` | `Screen → Offer · skipped 1 stage` on one line, then the reason in quotes on a second, in `text-muted-foreground` |
  | `APPLICATION_OUTCOME_SET` | `Active → Hired · at Offer` |
  | `INTERVIEW_CREATED` | `Technical · for Interview · 24 Sep 2026` |
  | `INTERVIEWER_ASSIGNED` / `_UNASSIGNED` | `Interviewer #5` |
  | `FEEDBACK_SUBMITTED` | `Rated 4/5 · round #7` |
  | `FEEDBACK_UPDATED` | `Rating 4 → 5 · round #7` |
  | `CANDIDATE_CONTACT_UPDATED` | `Changed: phone, location` — **field names, which is all the API sends** |

- **FR-3.2** **An unknown key is rendered, not dropped**: any `metadata` key the formatter does not
  handle appears in a fallback `key: value` list below the formatted line. A trace that hides part
  of what was recorded is a worse trace than an ugly one.
- **FR-3.3** **An unknown `action`** — one the API sends that this client's maps do not contain,
  which can only happen if the backend ships ahead of the client — renders the raw action string in
  a neutral badge and the whole `metadata` as the fallback list. **It must not throw and must not
  render an empty row** (XBE-4).
- **FR-3.4** Values are rendered as text. A nested object or array falls back to
  `JSON.stringify`, but **only inside the fallback list** — never as the primary render of a known
  action (D-4).
- **FR-3.5** An override's reason renders **in full**, not truncated. It is the field the brief
  requires be recorded, and a trace that elides it defeats the point. Long reasons wrap.

### FR-4 — Filters

- **FR-4.1** Four filters, all in the URL: `entityType`, `entityId`, `action`, `actorId`. Plus
  `page`.
- **FR-4.2** `entityType` and `action` are `<Select>` controls with an "All" option that **removes**
  the parameter from the URL rather than setting it to an empty string.
- **FR-4.3** `entityId` is an `<Input type="number">`. It is **disabled while no `entityType` is
  selected**, and clearing `entityType` clears `entityId` from the URL in the same navigation — the
  API rejects the pair (XBE-7), and the UI should not let a recruiter construct a request it knows
  will fail.
- **FR-4.4** `actorId` is not exposed as a control in this pass. It is **honoured if present in the
  URL**, so a deep link from a future "everything this person did" affordance works, but no input
  renders for it — an id input a recruiter has to guess at is not a filter.
- **FR-4.5** Changing any filter resets `page` to 1. A filter change that leaves a recruiter on page
  7 of a two-page result looks broken.
- **FR-4.6** Invalid URL values are **sanitised, not sent**: `?action=BANANA&page=-2` renders the
  unfiltered first page, matching `parseRolesSearchParams`. The client does not forward garbage to
  earn a `400` it can predict.
- **FR-4.7** A "Clear filters" button appears only while at least one filter is active, and
  navigates to bare `/audit`.
- **FR-4.8** Default values are **omitted from the href** — `/audit`, not `/audit?page=1` — matching
  `buildRolesHref`.

### FR-5 — Refreshing

- **FR-5.1** A Refresh button invalidates the audit list query. **There is no polling and no
  interval** (D-5).
- **FR-5.2** While refetching, the button shows a spinner and the existing rows stay on screen —
  never a flash back to the skeleton.

### FR-6 — What this client must never do

- **FR-6.1** It must never render a contact field from an audit entry. The API sends none
  (XBE-6); if one ever appears, **that is a backend bug to report, not a field to hide here.**
- **FR-6.2** It must never render feedback `notes` from an audit entry. The API sends none.
- **FR-6.3** It must not treat the route guard as the access control (AZ-1).
- **FR-6.4** It must not write any part of an audit entry to `localStorage`, `sessionStorage` or a
  cookie (DM-2).

---

## Frontend Requirements

### File structure

```
src/
  app/
    (app)/
      audit/
        layout.tsx                            NEW   — <RequireRole allow={AUDIT_USER_ROLES}>
        page.tsx                              NEW   — <Suspense><AuditView /></Suspense>
      layout.tsx                              MOD   — NAV_SECTIONS.RECRUITER gains a Records section
  features/
    audit/
      api/audit.api.ts                        NEW   — listAuditEntries()
      hooks/useAuditQuery.ts                  NEW   — useAuditQuery + auditListKey
      components/AuditView.tsx                NEW   — orchestrates filters + table + pager
      components/AuditTable.tsx               NEW   — the <Table>
      components/AuditFilters.tsx             NEW   — the two Selects + the id Input + Clear
      components/AuditMetadata.tsx            NEW   — FR-3, including the fallback
      components/AuditActionBadge.tsx         NEW   — FR-2.4
      labels.ts                               NEW   — ACTION_LABELS, ENTITY_LABELS, variants
      permissions.ts                          NEW   — AUDIT_USER_ROLES
      search-params.ts                        NEW   — parseAuditSearchParams / buildAuditHref
      types.ts                                NEW   — AuditEntry, AuditAction, AuditEntityType, …
```

Primitives reused from `components/ui/`: `Table`, `Select`, `Input`, `Button`, `Badge`, `Card`,
`Skeleton`. **No new primitive is added, and no new dependency** (D-7).

### State matrix — `/audit`

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Loading | first fetch | A `Skeleton` table of 8 rows; filters render and are usable |
| Loaded | `200` with entries | The table + pager. Row count and total in a muted line above |
| Empty, no filters | `200`, `total: 0` | **"No recorded activity yet."** with the sub-line **"Stage changes, overrides, assignments and feedback appear here as they happen."** |
| Empty, filtered | `200`, `total: 0`, a filter active | **"No activity matches these filters."** plus a **Clear filters** button |
| Refetching | Refresh pressed | Existing rows stay; the Refresh button shows a spinner and is disabled |
| Query error | non-2xx other than 401/403 | An inline error card: **"Could not load the audit trail."** with a **Try again** button |
| `403` | non-recruiter reaching it by URL despite the guard | `apiFetch` redirects to `/forbidden`. Should be unreachable; handled anyway |
| Page past the end | `?page=999` | The empty-filtered state plus a **Back to first page** link |

### State matrix — the filter bar

| State | Trigger | Renders |
| ----- | ------- | ------- |
| Idle, no filters | bare `/audit` | Both Selects on "All"; the id input **disabled** with placeholder **"Select a type first"**; no Clear button |
| Entity type chosen | `?entityType=APPLICATION` | The id input becomes enabled, placeholder **"Entity ID"**; Clear appears |
| Entity type cleared | "All" chosen | The id input empties **and is disabled**, and `entityId` leaves the URL in the same navigation (FR-4.3) |
| Id typed | debounced 400 ms | URL updates, `page` resets to 1 |
| Any filter active | — | **Clear filters** button, navigating to `/audit` |

### Other frontend rules

- **FE-1** `AuditView` is the only component that reads `useSearchParams()`. It is wrapped in
  `<Suspense>` by `page.tsx`, **without which `next build` fails** — see the Next.js 16 note.
- **FE-2** All data access goes through `features/audit/api/audit.api.ts`, which is the only file
  that names the `/api/audit` path. One exported function, `listAuditEntries(params)`.
- **FE-3** Query key: `auditListKey(params) = ['audit', 'list', params] as const`, plus
  `AUDIT_LIST_KEY = ['audit', 'list'] as const` as the invalidation prefix. Matching the shipped
  `rolesListKey` / `ROLES_LIST_KEY` pair.
- **FE-4** `useAuditQuery` sets `placeholderData: (previous) => previous`, so paging and filtering
  keep the previous rows visible instead of flashing a skeleton — matching `useJobsQuery`.
- **FE-5** `ACTION_LABELS` and `ENTITY_LABELS` are `Record<AuditAction, string>` and
  `Record<AuditEntityType, string>` — **total maps**, so a new backend value is a compile error
  (FR-2.4). A tolerant accessor handles the runtime case where the backend is ahead of the client
  (FR-3.3).
- **FE-6** There is **no mutation** in this feature. Nothing on this screen writes, and no `api`
  function beyond the single read exists — an exported wrapper for an endpoint with no UI is how a
  removed feature comes back by accident.
- **FE-7** `AuditMetadata` receives `metadata: Record<string, unknown>` and is **written to be
  total**: every branch ends in the fallback list, and no branch indexes into a nested object
  without a guard (FR-3.2, FR-3.3).
- **FE-8** Relative time uses a small local helper beside the shipped
  [`format-date.ts`](../../../src/lib/format-date.ts), built on `Intl.RelativeTimeFormat`. **No date
  library is added.**
- **FE-9** The table is horizontally scrollable below `md` rather than collapsing to cards. Five
  columns of short values read fine in a scroll container, and a card layout would separate the
  action from its details.

---

## Backend Requirements

The guarantees this client depends on. If any changes, this spec breaks. Source:
[../../../../backend/specs/features/audit/spec.md](../../../../backend/specs/features/audit/spec.md).

- **XBE-1** `GET /api/audit` is **recruiter-only**. Interviewer and candidate sessions get `403`.
- **XBE-2** The envelope is `{ entries, pagination: { page, pageSize, total, totalPages } }` —
  byte-identical in shape to the one `GET /api/roles` returns, so the existing pager's props are
  reusable.
- **XBE-3** Entries are ordered `createdAt desc, id desc` by the API. The client does not re-sort
  (FR-2.1).
- **XBE-4** `entry.action` and `entry.entityType` are stable enum strings, and `entry.metadata` is
  an **open object whose shape depends on `action`**. The client renders it defensively; an unknown
  key must not throw (FR-3.2, FR-3.3).
- **XBE-5** `entry.actor` is **always present** and always `{ id, name, role }` — never null, because
  the actor foreign key is `onDelete: Restrict`.
- **XBE-6** `metadata` contains **no `email`, no `phone`, no feedback `notes`**. The only free-text
  value it may carry is an override `reason`. **If any other free text ever appears, that is a
  backend bug to report, not a field to hide client-side.**
- **XBE-7** Filters are query parameters. **`entityId` without `entityType` is a `400`** with
  `details.entityId` — which is why FR-4.3 disables the input.
- **XBE-8** `?pageSize=101` is a `400`, not a clamp. The client never sends `pageSize`; the server
  default of 20 stands.
- **XBE-9** Unknown query parameters are **stripped, not rejected**, so a stale bookmark carrying
  `?sort=asc` renders normally.
- **XBE-10** `createdAt` is an ISO 8601 UTC string. Formatting is entirely the client's job.
- **XBE-11** There is **no** `PATCH` or `DELETE` on an audit entry; both answer `404`. The client
  offers no edit or delete affordance (FE-6).

---

## API Contract

| Call | When | Sends | Expects |
|---|---|---|---|
| `GET /api/audit` | `/audit` mounts; any filter or page changes; Refresh pressed | `entityType`, `entityId`, `action`, `actorId`, `page` — **each omitted at its default** | `200 { entries, pagination }` · `400` · `401` · `403` |

### Client-side rules

- **API-1** Every call goes through `apiFetch`. No component calls `fetch` directly.
- **API-2** The call is wrapped in `features/audit/api/audit.api.ts`; no component assembles a path
  or a query string.
- **API-3** The query string is built with `URLSearchParams`, and **parameters at their defaults are
  omitted** so the request matches the URL the recruiter sees — matching `listRoles`.
- **API-4** `pageSize` is never sent (XBE-8). It is not user-configurable.
- **API-5** Query key `['audit', 'list', params]`, invalidated by the `AUDIT_LIST_KEY` prefix
  (FE-3).
- **API-6** `actorId` is forwarded from the URL if present, even though no control produces it
  (FR-4.4).

---

## Data Model Changes

Client state only. No server state is mirrored, and nothing here is persisted.

| State | Where it lives | Lifetime | Persisted? |
|---|---|---|---|
| Filters + page | The URL (`useSearchParams`) | Until navigation | **In the URL only** — shareable by design (D-3) |
| Audit entries | TanStack Query cache, key `['audit','list',params]` | Until invalidated or the tab closes | **Never** — memory only |
| Debounced `entityId` input | `useState` in `AuditFilters` | Until the component unmounts | **Never** |

- **DM-1** No token, name, email or role is written to `localStorage`, `sessionStorage` or a cookie.
  The access token stays in memory, as the authentication feature established.
- **DM-2** **No audit entry is persisted anywhere on the client** (FR-6.4). A trace cached in
  browser storage is a copy of recruiter-only data sitting outside the session that fetched it.
- **DM-3** No optimistic updates. There is nothing to write.

---

## Authentication / Authorization

**This matrix is UX, not a control.** Every row describes what renders; the backend re-authorizes
every request behind it.

| Route | Anonymous | Candidate | Interviewer | Recruiter |
|---|---|---|---|---|
| `/audit` | → `/login?next=/audit` | app 404 | app 404 | ✅ |

- **AZ-1** **None of the above is a security control.** `<RequireAuth>` and `<RequireRole>` decide
  what renders. `GET /api/audit` answers `403` to a non-recruiter whether or not this client ever
  calls it, and that `403` is the control.
- **AZ-2** The Audit nav link renders for recruiters only, from `NAV_SECTIONS` — a lookup table, not
  a permission check.
- **AZ-3** A disallowed role reaching `/audit` by URL gets `<NotFoundView />`, not `/forbidden`.
  `/forbidden` is reserved for a server refusal that `apiFetch` intercepted, and conflating the two
  makes a routing decision look like an API one.
- **AZ-4** `<RequireRole>` is composed **inside** `<RequireAuth>`, in a route `layout.tsx`, never per
  page — matching `/roles` and `/jobs`.

---

## Validation

There is no form in this feature. What validation exists is URL sanitisation.

| Field | Rule | Message |
|---|---|---|
| `entityType` (URL) | Must be one of the four enum values, else dropped | — (silent) |
| `action` (URL) | Must be one of the nine enum values, else dropped | — (silent) |
| `entityId` (URL) | Positive integer, else dropped. **Also dropped if `entityType` is absent** | — (silent) |
| `actorId` (URL) | Positive integer, else dropped | — (silent) |
| `page` (URL) | Integer ≥ 1, else 1 | — (silent) |
| `entityId` (input) | Digits only; non-numeric keystrokes are not committed to the URL | — |

- **VAL-1** Invalid URL values are **sanitised, never forwarded** (FR-4.6). The client does not send
  a request it can predict will `400`, and does not show an error for a URL a recruiter may have
  hand-edited.
- **VAL-2** The `entityId` input is debounced 400 ms before it reaches the URL, so typing `123` is
  one navigation and one request rather than three.
- **VAL-3** The `entityId`-requires-`entityType` rule is enforced **twice**: by disabling the input
  (FR-4.3) and by dropping the parameter during parse. The backend's `400` (XBE-7) is the third and
  authoritative check.

---

## Error Handling

| Status / `code` | Where | UI behaviour |
|---|---|---|
| `401` | any call | `apiFetch` refreshes once and replays; a second `401` ends the session and redirects to `/login?next=/audit` |
| `403` | any call | `apiFetch` redirects to `/forbidden`. Unreachable through the UI (AZ-1) but handled |
| `400 VALIDATION_ERROR` | list | Inline error card: **"That filter combination isn't valid."** plus **Clear filters**. Should be unreachable given VAL-1 |
| `500` / network | list | Inline error card: **"Could not load the audit trail."** plus **Try again** |
| unknown `action` in a `200` | `AuditMetadata` | The raw action string in a neutral badge and the fallback key/value list. **Never a throw, never a blank row** (FR-3.3) |

- **ERR-1** A **query** failure renders an inline error state with a retry. There are no mutations in
  this feature, so there are no toasts.
- **ERR-2** An error state never clears the filter bar. A recruiter whose request failed should not
  also lose what they typed.
- **ERR-3** `AuditMetadata` is written so that no malformed `metadata` can crash the page. A render
  error in one row must not take down the table — the fallback path is total (FE-7).

---

## Edge Cases

| ID | Case | Behaviour |
|---|---|---|
| **EC-01** | The backend ships a tenth `AuditAction` before this client does | The row renders with the raw action string and the fallback metadata list. No crash, no blank row (FR-3.3) |
| **EC-02** | `metadata` carries a key the formatter does not know | It appears in the fallback list below the formatted line. Nothing is hidden (FR-3.2) |
| **EC-03** | `metadata` is `{}` | The Details cell renders `—` |
| **EC-04** | An override reason is 900 characters | Rendered in full, wrapped. Not truncated, not behind a "show more" (FR-3.5) |
| **EC-05** | A recruiter types an `entityId` with no `entityType` | Impossible through the UI — the input is disabled (FR-4.3). Via a hand-edited URL, the parameter is dropped (VAL-1) |
| **EC-06** | A recruiter clears `entityType` while an id is set | Both leave the URL in one navigation (FR-4.3) |
| **EC-07** | `?page=999` on a two-page result | The empty-filtered state plus **Back to first page** |
| **EC-08** | `?action=BANANA` from a stale bookmark | Dropped during parse; the unfiltered feed renders (FR-4.6) |
| **EC-09** | A filter changes while on page 7 | `page` resets to 1 in the same navigation (FR-4.5) |
| **EC-10** | Zero entries on a fresh database | The unfiltered empty state, which explains what will appear here — not the filtered one |
| **EC-11** | Two entries share a `createdAt` to the millisecond | They render in the API's order; the client does not re-sort and has no tiebreak of its own (FR-2.1) |
| **EC-12** | A recruiter's session expires while the page is open | The next call `401`s, `apiFetch` refreshes once, and the page continues. A second `401` redirects to `/login?next=/audit` |
| **EC-13** | The Refresh button is pressed twice quickly | TanStack Query dedupes; the rows do not flash (FR-5.2) |
| **EC-14** | An interviewer navigates to `/audit` by typing the URL | `<NotFoundView />`. No request is issued (AZ-3) |

---

## Security Requirements

- **SEC-1** The route guard and the nav entry are **UX**. The `403` from `GET /api/audit` is the
  control (AZ-1). This spec never claims otherwise.
- **SEC-2** **Nothing from an audit entry is written to browser storage** (DM-2). The feed is
  recruiter-only data and it stays in memory for the life of the session.
- **SEC-3** The client never renders a contact field or feedback notes from an entry, because the
  API sends none (XBE-6). **There is no conditional hiding of such a field in this feature**, and if
  one ever arrives in a payload that is a backend bug to report.
- **SEC-4** The `entityId` filter is a number input. Nothing a recruiter types is interpolated into
  markup; React escapes it, and no `dangerouslySetInnerHTML` appears in this feature.
- **SEC-5** An override `reason` and any fallback `metadata` value are rendered as **text nodes**,
  never as HTML. They are the only free text on this screen and the only values that originate from
  another user's keyboard.
- **SEC-6** **Known accepted gaps.** (a) A recruiter can page the entire trace as fast as the server
  answers; there is no client throttle and none is asked for. (b) Entries stay in the TanStack Query
  cache until the tab closes, so a shared machine with an open tab shows the last-viewed trace after
  a `Back` — the same property every other authenticated view in this app has, and the session
  redirect on `401` is what bounds it. Both are accepted for a localhost POC.

---

## Performance Requirements

- **PERF-1** Mounting `/audit` issues **exactly one** request: `GET /api/audit`. No prefetch, no
  second call for labels, no per-row lookup.
- **PERF-2** A filter change issues **exactly one** request. Debouncing the id input (VAL-2) is what
  makes typing three digits one request rather than three.
- **PERF-3** **No polling and no refetch interval** (D-5). Refetching happens on mount, on a filter
  or page change, and when Refresh is pressed. Nothing else.
- **PERF-4** `placeholderData` keeps the previous page's rows during a fetch (FE-4), so paging never
  flashes a skeleton after the first load.
- **PERF-5** Page render stays under 100 ms for a 20-row page on a mid-range laptop. There is no
  virtualisation, and none is needed: the page size is fixed at 20 by the server default.
- **PERF-6** `ACTION_LABELS`, `ENTITY_LABELS` and the badge-variant map are module-level constants,
  not rebuilt per render.

---

## Acceptance Criteria

Verified by hand, in the browser, with DevTools open. There is no test suite. Roles: **R** =
recruiter, **I** = interviewer, **C** = candidate, all seeded by `npm run db:seed`.

`AC-F*` are functional checks driven through the UI. `AC-M*` additionally require a running backend
and a seeded database — **which, for this feature, is all of them**, since every criterion reads a
live feed.

### Route and access

- **AC-F01** — **Given** a session as R, **when** the app shell renders, **then** a **Records**
  section with an **Audit** link is in the sidebar (FR-1.3).
- **AC-F02** — **Given** a session as I, **when** the sidebar is read, **then** there is **no**
  Audit link (FR-1.3).
- **AC-F03** — **Given** a session as C, **when** `/audit` is typed into the address bar, **then**
  the app's 404 renders and the Network tab shows **no** request to `/api/audit` (AZ-3, EC-14).
- **AC-F04** — **Given** no session, **when** `/audit` is opened, **then** the browser lands on
  `/login?next=%2Faudit` (AZ-1).

### The feed

- **AC-F05** — **Given** R on a seeded database, **when** `/audit` loads, **then** a table renders
  with the columns **When, Action, Entity, Actor, Details** (FR-2.2).
- **AC-F06** — **Given** the same, **when** the Network tab is read, **then** there is **exactly
  one** `GET /api/audit` request (PERF-1).
- **AC-F07** — **Given** the same, **when** the rows are read top to bottom, **then** the When
  column is non-increasing, matching the API's order (FR-2.1, XBE-3).
- **AC-F08** — **Given** any row, **when** the When cell is hovered, **then** the `title` attribute
  shows the absolute UTC timestamp (FR-2.3).
- **AC-F09** — **Given** a `STAGE_OVERRIDE_CREATED` row, **when** it is read, **then** the Action
  badge reads **"Stage override"** in the `destructive` variant, and the Details cell shows the
  stage arrow, the skip count **and the full reason text** (FR-2.4, FR-3.1, FR-3.5).
- **AC-F10** — **Given** a `CANDIDATE_CONTACT_UPDATED` row, **when** the Details cell is read,
  **then** it names the changed **fields** and contains **no phone number or address** (FR-3.1,
  XBE-6).
- **AC-F11** — **Given** any row, **when** the Actor cell is read, **then** it shows a name and a
  role and is never blank (FR-2.6, XBE-5).

### Filters

- **AC-F12** — **Given** `/audit`, **when** the page first renders, **then** the entity-id input is
  **disabled** with the placeholder **"Select a type first"** and no Clear button is present
  (FR-4.3).
- **AC-F13** — **Given** the same, **when** **Application** is chosen in the entity-type select,
  **then** the URL becomes `/audit?entityType=APPLICATION`, the id input becomes enabled, and a
  **Clear filters** button appears (FR-4.2, FR-4.7).
- **AC-F14** — **Given** that state, **when** an id is typed, **then** after ~400 ms **exactly one**
  request fires and the URL carries both parameters (VAL-2, PERF-2).
- **AC-F15** — **Given** both filters set, **when** the entity type is returned to **All**, **then**
  the URL carries **neither** `entityType` nor `entityId` and the id input is disabled again
  (FR-4.3, EC-06).
- **AC-F16** — **Given** `/audit?page=3`, **when** an action filter is chosen, **then** the URL's
  `page` is absent — reset to 1 (FR-4.5, EC-09).
- **AC-F17** — **Given** `/audit?action=BANANA&page=-2`, **when** the page loads, **then** the
  unfiltered first page renders and the request carries **neither** parameter (FR-4.6, VAL-1,
  EC-08).
- **AC-F18** — **Given** any active filter, **when** **Clear filters** is pressed, **then** the URL
  is bare `/audit` — **not** `/audit?page=1` (FR-4.7, FR-4.8).
- **AC-F19** — **Given** `/audit?actorId=1`, **when** the page loads, **then** the request carries
  `actorId=1` although no control produced it (FR-4.4, API-6).

### States

- **AC-F20** — **Given** a fresh database with no activity, **when** `/audit` loads, **then**
  **"No recorded activity yet."** renders with its explanatory sub-line — **not** the filtered empty
  state (EC-10).
- **AC-F21** — **Given** a filter matching nothing, **when** the page loads, **then**
  **"No activity matches these filters."** renders with a **Clear filters** button.
- **AC-F22** — **Given** `/audit?page=999`, **when** the page loads, **then** the empty state
  renders with a **Back to first page** link (EC-07).
- **AC-F23** — **Given** a loaded page, **when** **Refresh** is pressed, **then** the existing rows
  stay visible, the button shows a spinner, and **no** skeleton appears (FR-5.2, PERF-4).
- **AC-F24** — **Given** a loaded page, **when** the tab is left open for five minutes, **then** the
  Network tab shows **no** further `/api/audit` request — there is no polling (PERF-3, D-5).
- **AC-F25** — **Given** the API is stopped, **when** Refresh is pressed, **then** an inline
  **"Could not load the audit trail."** card with **Try again** renders, and the filter bar keeps
  its values (ERR-1, ERR-2).

### Defensive rendering

- **AC-F26** — **Given** a row whose `metadata` is mocked in DevTools to contain an unknown key,
  **when** it renders, **then** the key appears in the fallback list and the page does not crash
  (FR-3.2, EC-02).
- **AC-F27** — **Given** a row whose `action` is mocked to an unknown string, **when** it renders,
  **then** the raw action shows in a neutral badge with the full metadata fallback, and **no error
  boundary is triggered** (FR-3.3, EC-01).
- **AC-F28** — **Given** a row whose `metadata` is `{}`, **when** it renders, **then** the Details
  cell shows `—` (EC-03).

### Cross-cutting invariants

- **AC-M01** — **Given** a full session as R across every filter combination, **when** every
  `/api/audit` response body in the Network tab is searched, **then** the strings `"email"`,
  `"phone"` and `"notes"` appear **zero** times. *Verified in the payload, not the DOM* (XBE-6,
  SEC-3).
- **AC-M02** — **Given** the same session, **when** `localStorage`, `sessionStorage` and
  `document.cookie` are read in the console at the end, **then** **none** contains a token, a name,
  an email, or any audit entry (DM-1, DM-2, SEC-2).
- **AC-M03** — **Given** an **interviewer** session, **when**
  `fetch('<API>/api/audit', { headers: { Authorization: 'Bearer ' + token } })` is issued **by hand
  from the DevTools console**, **then** the response is **`403`**. *This is the criterion that
  proves neither the hidden nav link nor the route guard is what is protecting the endpoint*
  (AZ-1, SEC-1, XBE-1).
- **AC-M04** — **Given** R, **when** `/audit?entityId=12` is opened **without** an `entityType`,
  **then** the request carries neither parameter and the response is `200` — the client never
  produces the `400` the API would return (VAL-1, VAL-3, XBE-7).
- **AC-M05** — **Given** R with an expired access token, **when** Refresh is pressed, **then** the
  Network tab shows one `401`, one `POST /api/auth/refresh`, and one successful replay — **exactly
  one** refresh per expiry event (EC-12).

---

## Out of Scope

| Excluded | Why |
|---|---|
| A candidate- or interviewer-facing trace | The backend answers `403`; disclosure to either is a product decision this POC does not make |
| Exporting the feed to CSV | The brief asks for a trace, not a reporting tool |
| Live updates / websockets / polling | D-5. Nothing on this screen changes while a recruiter reads it, and polling an append-only table is wasted requests |
| An actor picker for the `actorId` filter | Needs a user-search endpoint that does not exist. The parameter is honoured from the URL instead (FR-4.4) |
| Date-range filtering | The API offers no date parameters, and a client-side range over a paginated feed would be wrong |
| Grouping entries into a per-entity timeline | The candidates feature renders a candidate's timeline from `stageHistory`, which is the right source for it |
| Deleting or editing entries | The API has no such route (XBE-11) |
| Virtualising the table | The page size is fixed at 20 by the server default (PERF-5) |

---

## Dependencies

**Blocked by:** [../../../../backend/specs/features/audit/spec.md](../../../../backend/specs/features/audit/spec.md).
**Nothing in this spec can be verified until that backend ships** — every acceptance criterion reads
a live feed.

**Blocks:** nothing directly. The four features after it each deep-link into `/audit` with filters,
so this route existing first makes those links land somewhere.

**New npm dependencies:** **none.** `Table`, `Select`, `Input`, `Button`, `Badge`, `Card` and
`Skeleton` are already vendored in [`src/components/ui/`](../../../src/components/ui/), and relative
time uses `Intl.RelativeTimeFormat` (FE-8).

**Environment variables:** none. `NEXT_PUBLIC_API_URL` already exists.

**Modified existing files**

| Path | Change |
|---|---|
| [`src/app/(app)/layout.tsx`](<../../../src/app/(app)/layout.tsx>) | `NAV_SECTIONS.RECRUITER` gains a **Records** section with the Audit link |
| [`CLAUDE.md`](../../../CLAUDE.md) | Feature table row |

**Framework note.** **This is Next.js 16; its APIs differ from older versions.**
`AuditView` reads `useSearchParams()`, so `page.tsx` **must** wrap it in `<Suspense>` or
`next build` fails (FE-1). Route `params` are a Promise in this version — not used by this feature,
which has no dynamic segment, but the rule holds for the features that follow. `LayoutProps<'/audit'>`
is globally generated and is the type the new `layout.tsx` uses.

**External dependencies:** none.

**Cross-repo:** this client and the backend share one API contract. A change to the endpoint, the
envelope, the `AuditAction` values, the `metadata` shapes or the error codes must be made in
**both** specs — see
[../../../../backend/specs/features/audit/spec.md](../../../../backend/specs/features/audit/spec.md).
