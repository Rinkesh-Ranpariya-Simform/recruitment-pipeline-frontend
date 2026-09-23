import type { ApplicationStatus, PipelineStage } from '@/features/applications/types';

/**
 * The client's copy of the backend interviews contract
 * (backend/specs/features/interviews/spec.md § API Contract).
 *
 * Nothing is shared by import between the two repos — only by agreement — so a
 * change to either projection, the two new `409`/`400` codes or the pagination
 * envelope has to be made here as well.
 */

/**
 * **Re-exported, never redeclared.** Both unions already exist in
 * `features/applications/types.ts`, and two declarations of one union
 * eventually disagree — the same rule `features/pipeline/types.ts` follows.
 */
export type { ApplicationStatus, PipelineStage } from '@/features/applications/types';

/** The five round types. A closed set, so the label map below can be total. */
export type InterviewType =
  'PHONE_SCREEN' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'CULTURE_FIT' | 'HIRING_MANAGER';

/**
 * A round's lifecycle.
 *
 * There is no `RESCHEDULED`: the backend enum has none and no endpoint writes
 * one, so rescheduling is cancel-and-recreate in this POC.
 */
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

/** Matching the shipped roles and audit pagers, so the pager component is reusable in shape. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------
 * The two projections — two interfaces, never one with optional fields
 * ---------------------------------------------------------------------- */

/**
 * Everything the API sends an **assigned interviewer**, and the whole of it.
 *
 * **These are all the fields there are, and that is the point.** There is no
 * contact detail of any kind here and no `assignments` array, because the
 * backend's projection never selects them — so there is nothing for a component
 * to render by accident and nothing to remember to hide.
 *
 * **Do not add an optional field to this interface.** A shape with
 * `assignments?` is one `&&` away from rendering a panel to somebody the API
 * deliberately sent none to, and a shape with an optional contact field invites
 * exactly the leak the whole design exists to prevent. If such a field ever
 * turns up in a payload, **that is a backend bug to report**, per
 * [frontend/CLAUDE.md](../../../CLAUDE.md).
 */
export interface InterviewerInterview {
  id: number;
  type: InterviewType;
  stage: PipelineStage;
  scheduledAt: string;
  status: InterviewStatus;
  role: { id: number; title: string };
  /** `{ id, name }` — the only thing this payload says about the person. */
  candidate: { id: number; name: string };
}

/** One seat on a panel, as a recruiter's payload carries it. */
export interface InterviewAssignment {
  id: number;
  interviewer: { id: number; name: string };
}

/**
 * What a **recruiter** gets: a superset in content, but a genuinely different
 * shape — the application is nested rather than flattened, and the panel is
 * present.
 *
 * It is a separate interface rather than `InterviewerInterview & { … }` so that
 * a component written for one cannot be handed the other. A mistaken dispatch
 * in `[interviewId]/page.tsx` is then a compile error rather than a rendering
 * bug nobody notices.
 */
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
  assignments: Array<InterviewAssignment>;
}

/* -------------------------------------------------------------------------
 * Envelopes
 * ---------------------------------------------------------------------- */

/** `GET /api/interviews` — 200, as an interviewer. */
export interface InterviewerInterviewsResponse {
  interviews: Array<InterviewerInterview>;
  pagination: Pagination;
}

/** `GET /api/interviews` — 200, as a recruiter. Same endpoint, other projection. */
export interface RecruiterInterviewsResponse {
  interviews: Array<RecruiterInterview>;
  pagination: Pagination;
}

/** `GET /api/interviews/:id` — 200, as an interviewer. */
export interface InterviewerInterviewResponse {
  interview: InterviewerInterview;
}

/** `GET /api/interviews/:id` — 200, and the body of both recruiter writes. */
export interface RecruiterInterviewResponse {
  interview: RecruiterInterview;
}

/** `POST /api/interviews/:id/assignments` — 201. */
export interface AssignmentResponse {
  assignment: {
    id: number;
    interviewId: number;
    interviewer: { id: number; name: string };
    createdAt: string;
  };
}

/**
 * One option in the assign picker.
 *
 * **Deliberately narrower than the payload.** `GET /api/users` returns the
 * backend's safe-user shape, which carries more than this; the picker needs an
 * id and a name, so those are the only two fields declared. A field this
 * interface does not name cannot be rendered by a component that takes it.
 */
export interface Interviewer {
  id: number;
  name: string;
}

/** `GET /api/users` — 200. Recruiter-gated, and it returns interviewers only. */
export interface InterviewersResponse {
  users: Array<Interviewer>;
}
