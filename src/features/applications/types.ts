/**
 * The client's copy of the application contract. Nothing is shared by import
 * between the two repos, so a change to this shape has to be made on both sides.
 */

/**
 * Whether an application is still live, and if not, how it ended.
 *
 * There is no `WITHDRAWN`: the backend enum doesn't have one and no endpoint
 * writes one, so a candidate cannot withdraw in this POC.
 */
export type ApplicationStatus = 'ACTIVE' | 'HIRED' | 'REJECTED';

/**
 * Where a live application sits.
 *
 * Deliberately **disjoint** from `ApplicationStatus` — the terminal outcomes are
 * statuses, not stages — so `status: 'ACTIVE'` with `currentStage: 'REJECTED'`
 * isn't representable on either side of the wire.
 */
export type PipelineStage = 'APPLIED' | 'SCREEN' | 'INTERVIEW' | 'OFFER';

/** The five round types. Re-declared rather than imported to keep this module a leaf. */
export type InterviewType =
  'PHONE_SCREEN' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'CULTURE_FIT' | 'HIRING_MANAGER';

/* -------------------------------------------------------------------------
 * The stage transition timeline
 * ---------------------------------------------------------------------- */

/**
 * How a timeline node reads, and therefore what colour it gets.
 *
 * Three values, and the mapping to colour is `features/applications/labels.ts`'s
 * — green for `PASSED`, red for `REJECTED`, neutral for `PENDING`.
 *
 * **`PENDING` is a round with no verdict yet, not a round with no date.** An
 * undated round is ordinary and is not a different state.
 */
export type TimelineNodeState = 'PASSED' | 'REJECTED' | 'PENDING';

/** What a node IS, which decides how it is labelled. */
export type TimelineNodeKind = 'APPLIED' | 'ROUND' | 'OUTCOME';

/**
 * One node of the stage transition timeline, rendered the same way for both
 * audiences:
 *
 * ```
 * Applied → Screened (phone screen) → Interview (technical) → Interview (system design) → Not selected
 * ```
 *
 * **It carries no interviewer, no rating and no feedback** — the backend selects
 * none of them on either audience's path, so there is nothing for a component to
 * render by accident. If such a field ever turns up in a payload, **that is a
 * backend bug to report**, per [frontend/CLAUDE.md](../../../CLAUDE.md).
 *
 * `interviewId` is present so a recruiter's client can link a node to
 * `/interviews/:id`. A candidate has no such route, and their timeline renders
 * the node as plain text.
 */
export interface TimelineNode {
  /** Stable within one application, so it can be a React key. */
  key: string;
  kind: TimelineNodeKind;
  /** `APPLIED` on the first node, the round's own stage on a `ROUND`, null on an `OUTCOME`. */
  stage: PipelineStage | null;
  interviewType: InterviewType | null;
  /** The terminal status on an `OUTCOME`, null otherwise. */
  status: ApplicationStatus | null;
  state: TimelineNodeState;
  /** ISO. Null on a round with neither a verdict nor a date. */
  at: string | null;
  interviewId: number | null;
}

/* -------------------------------------------------------------------------
 * The candidate's own applications
 * ---------------------------------------------------------------------- */

/**
 * One row of `GET /api/applications` as a CANDIDATE, the body of a successful
 * apply, and the body of `GET /api/applications/:id` for them.
 *
 * **These are all the fields there are, and that is the point.** There is no
 * `feedback`, `rating`, `notes`, `interviewer` or `overrideReason` — the backend
 * never selects them, and declaring one here would let a component render
 * something a candidate must not see.
 *
 * `timeline` is the one addition the applications feature made to this shape. It
 * is what tells a candidate where they stand, which is the brief's §3.5
 * complaint answered for the person it is actually about. It carries no
 * assessor, no rating and no note — see `TimelineNode`.
 *
 * `role` carries `id` and `title` only. It is not a `Job`: there is no
 * `description` and no `status`, so this list can't become a second view of the
 * requisition table.
 */
export interface Application {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  /** When the candidate applied — the "Applied:" date. */
  createdAt: string;
  role: { id: number; title: string };
  timeline: Array<TimelineNode>;
}

/** `GET /api/applications` as a candidate — 200. Empty is `[]`, never a 404. */
export interface ApplicationsListResponse {
  applications: Array<Application>;
}

/** `POST /api/applications` — 201. And `GET /api/applications/:id` as a candidate. */
export interface ApplicationResponse {
  application: Application;
}

/* -------------------------------------------------------------------------
 * The recruiter's view — a genuinely different shape, not a superset
 * ---------------------------------------------------------------------- */

/** Matching the shipped roles, audit and interviews pagers. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * One row of the recruiter's applications table.
 *
 * A **separate interface** rather than `Application & { candidate }`, for the
 * same reason `RecruiterInterview` is separate from `InterviewerInterview`: a
 * component written for one cannot then be handed the other, and a mistaken
 * dispatch is a compile error rather than a rendering bug nobody notices.
 *
 * It carries no `timeline` — a table row has no room for one and the list
 * endpoint does not send it — and **no `email`**: a recruiter may see contact
 * details, but not from a list of applications.
 */
export interface RecruiterApplication {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  /** When the candidate entered `currentStage` — the ageing column. */
  stageEnteredAt: string;
  createdAt: string;
  role: { id: number; title: string };
  candidate: { id: number; name: string };
  /** How many rounds this application has had. `0` is what "not started" looks like. */
  interviewCount: number;
}

/** One round as it appears on a recruiter's application detail. */
export interface ApplicationInterview {
  id: number;
  type: InterviewType;
  stage: PipelineStage;
  /** Nullable: a round started from the applications table has no date yet. */
  scheduledAt: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  /** The recruiter's verdict at this round, null until they record one. */
  outcome: 'SELECTED' | 'REJECTED' | null;
  decidedAt: string | null;
  createdAt: string;
  assignments: Array<{ id: number; interviewer: { id: number; name: string } }>;
}

/** `GET /api/applications/:id` as a RECRUITER — 200. */
export interface RecruiterApplicationDetail {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  stageEnteredAt: string;
  createdAt: string;
  role: { id: number; title: string };
  candidate: { id: number; name: string };
  timeline: Array<TimelineNode>;
  interviews: Array<ApplicationInterview>;
}

/** `GET /api/applications` as a RECRUITER — 200. Same endpoint, other projection. */
export interface RecruiterApplicationsResponse {
  applications: Array<RecruiterApplication>;
  pagination: Pagination;
}

/** `GET /api/applications/:id` as a RECRUITER — 200. */
export interface RecruiterApplicationResponse {
  application: RecruiterApplicationDetail;
}
