/**
 * The client's copy of the backend candidate-access contract
 * (backend/specs/features/candidate-access/spec.md § API Contract).
 *
 * Nothing is shared by import between the two repos — only by agreement — so a
 * change to either projection, the `?q=` role restriction, the `PATCH` field
 * list or the `404`-not-`403` rule has to be made here as well.
 *
 * ## The one rule this file exists to enforce
 *
 * **Two candidate interfaces, never one with optional contact fields** (FE-3,
 * D-1, FR-11.1). `InterviewerCandidate` has two fields. It has no `email`, no
 * `phone`, no `applications`, no `stageHistory` and no `feedback` — **not
 * optional, absent** — because the API's interviewer projection selects none of
 * them.
 *
 * **Do not add an optional field to it**, for the same reason
 * `InterviewerInterview` must not gain an optional `assignments`: a shape with
 * `email?: string` is one `&&` away from rendering what the API deliberately
 * withheld, and the whole point is that an interviewer's components have
 * nothing to render. If such a field ever turns up in a payload, **that is a
 * backend bug to report, not a field to hide here** — per
 * [frontend/CLAUDE.md](../../../CLAUDE.md).
 */

/**
 * **Re-exported, never redeclared** (FE-12). All four unions already exist in
 * the features that own them, and two declarations of one union eventually
 * disagree.
 *
 * `PipelineStage` and `ApplicationStatus` come from `features/applications`,
 * which is where every other feature takes them from. `InterviewType` and
 * `InterviewStatus` come from `features/interviews` rather than from
 * `features/applications`' own copy: this feature is recruiter- and
 * interviewer-facing only, so there is no candidate bundle to keep the
 * interviews module out of.
 */
export type { ApplicationStatus, PipelineStage } from '@/features/applications/types';
export type { InterviewStatus, InterviewType } from '@/features/interviews/types';

import type { ApplicationStatus, PipelineStage } from '@/features/applications/types';
import type { Feedback } from '@/features/feedback/types';
import type { InterviewStatus, InterviewType } from '@/features/interviews/types';

/** Matching the shipped roles, audit and interviews pagers, so the pager is reusable in shape. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------
 * What an INTERVIEWER is sent — and the whole of it
 * ---------------------------------------------------------------------- */

/**
 * Everything the API sends an interviewer about a candidate, on **both** of its
 * reads (XBE-3, backend FR-3.7, FR-6.4).
 *
 * Two fields. See the rule at the top of this file before adding a third.
 */
export interface InterviewerCandidate {
  id: number;
  name: string;
}

/**
 * One of the interviewer's **own** rounds with that candidate (backend FR-6.6,
 * FR-6.7).
 *
 * It arrives as a separate `interviews` key rather than hanging off the
 * candidate, and it carries **no panel and no feedback**: an interviewer's
 * payload does not name their colleagues, and a candidate interviewed by three
 * panels shows each panellist their own round and nothing about the others
 * (EC-05).
 */
export interface InterviewerCandidateInterview {
  id: number;
  type: InterviewType;
  stage: PipelineStage;
  /**
   * **Nullable**, though FE-3's sketch wrote it as `string`. A round a recruiter
   * started from the applications table has no date until they set one, which
   * is ordinary rather than an error — the same nullability
   * `InterviewerInterview.scheduledAt` already carries.
   */
  scheduledAt: string | null;
  status: InterviewStatus;
  role: { id: number; title: string };
}

/* -------------------------------------------------------------------------
 * What a RECRUITER is sent
 * ---------------------------------------------------------------------- */

/**
 * One row of the recruiter's `/candidates` table (backend FR-3.6).
 *
 * A **separate interface** from `RecruiterCandidate`, not a subset of it: a
 * list row carries a flat `phone` and an `applicationCount`, and the detail
 * carries a `profile` object and each application's whole history. A component
 * written for one cannot be handed the other.
 */
export interface RecruiterCandidateRow {
  id: number;
  name: string;
  email: string;
  /** `null` when no phone has been recorded, which is the normal state (XBE-12). */
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

/**
 * A candidate's contact details (XBE-12, backend FR-2.5).
 *
 * **Always an object, never `null`**, with three possibly-null fields. A
 * candidate a recruiter has recorded nothing about gets three nulls rather than
 * an absent object, so the client renders `—` per field and never needs a "no
 * profile" empty state (EC-06).
 *
 * `updatedAt` is `null` in exactly that case.
 */
export interface CandidateProfile {
  phone: string | null;
  location: string | null;
  headline: string | null;
  updatedAt: string | null;
}

/** One seat on a round's panel, as the recruiter detail renders it. */
export interface CandidateAssignment {
  id: number;
  interviewer: { id: number; name: string };
}

/**
 * One assessment on a round, inline in the candidate payload (XBE-6, FR-6.2).
 *
 * **`Feedback` itself, re-exported rather than redeclared** (FE-12). The API
 * sends exactly that shape here, which is what lets the recruiter's detail hand
 * these entries straight to the feedback feature's `<FeedbackList>` and render
 * every round's assessments in **zero** extra requests (D-7, FE-7, PERF-2). A
 * near-copy of the interface would drift from it, and the first symptom would
 * be the list component refusing a payload it was designed to take.
 */
export type { Feedback as CandidateFeedback } from '@/features/feedback/types';

/** One round on a recruiter's candidate detail, with its panel and its feedback. */
export interface CandidateRound {
  id: number;
  type: InterviewType;
  stage: PipelineStage;
  /** Nullable: an undated round is ordinary, not an error state. */
  scheduledAt: string | null;
  status: InterviewStatus;
  assignments: Array<CandidateAssignment>;
  feedback: Array<Feedback>;
}

/**
 * A deliberate stage skip, attached to the history entry it produced (FR-5.4).
 *
 * `reason` is what the brief's §3.3 requires be genuinely recorded, and this is
 * the screen where it is read — **in full, never truncated** (FR-5.5, EC-13).
 */
export interface CandidateStageOverride {
  id: number;
  reason: string;
  createdAt: string;
  performedBy: { id: number; name: string };
}

/**
 * One step of an application's stage timeline (FR-5).
 *
 * **`fromStage` is `null` on the first entry only** — entry into `APPLIED`,
 * which renders as "Applied" rather than `null → Applied` (FR-5.3, EC-14).
 *
 * The API sends these **oldest first**, because a history reads forwards, and
 * **this client does not re-sort** (FR-5.1, XBE-5).
 */
export interface CandidateStageHistoryEntry {
  id: number;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  toStatus: ApplicationStatus;
  createdAt: string;
  changedBy: { id: number; name: string };
  /** Non-null exactly when this transition used the override path. */
  override: CandidateStageOverride | null;
}

/** One application on a recruiter's candidate detail, with its whole history. */
export interface RecruiterCandidateApplication {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  stageEnteredAt: string;
  createdAt: string;
  role: { id: number; title: string; status: 'OPEN' | 'CLOSED' };
  stageHistory: Array<CandidateStageHistoryEntry>;
  interviews: Array<CandidateRound>;
}

/**
 * The whole candidate, as a recruiter reads them — **one request** (XBE-2,
 * FR-4.6, PERF-2).
 *
 * Contact, applications, stage history with override reasons, rounds, panels
 * and feedback, all in one payload: no per-application call, no per-round call,
 * no per-feedback call.
 */
export interface RecruiterCandidate {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  profile: CandidateProfile;
  applications: Array<RecruiterCandidateApplication>;
}

/* -------------------------------------------------------------------------
 * Envelopes
 * ---------------------------------------------------------------------- */

/** `GET /api/candidates` — 200, as a recruiter. */
export interface RecruiterCandidatesResponse {
  candidates: Array<RecruiterCandidateRow>;
  pagination: Pagination;
}

/** `GET /api/candidates` — 200, as an interviewer. Same endpoint, other projection. */
export interface InterviewerCandidatesResponse {
  candidates: Array<InterviewerCandidate>;
  pagination: Pagination;
}

/** `GET /api/candidates/:id` — 200, as a recruiter, and the body of `PATCH` (XBE-11). */
export interface RecruiterCandidateResponse {
  candidate: RecruiterCandidate;
}

/**
 * `GET /api/candidates/:id` — 200, as an interviewer.
 *
 * `interviews` is a **separate, separately scoped key** rather than something
 * hanging off the candidate — the candidate object itself has two fields and no
 * path to an application.
 */
export interface InterviewerCandidateResponse {
  candidate: InterviewerCandidate;
  interviews: Array<InterviewerCandidateInterview>;
}

/**
 * The body of `PATCH /api/candidates/:id`.
 *
 * **Three fields and only three** (XBE-4). `name` and `email` are not here, and
 * the API drops them from a body that carries them anyway — which is why the
 * dialog renders them read-only rather than editable (FR-8.2, AZ-7).
 *
 * Each is `string | null`: an explicit `null` **clears** the field and an
 * omitted key **leaves it unchanged** (XBE-5b, FR-8.3). A form that sent `""`
 * for an emptied input would store an empty string where a recruiter meant
 * "remove this", so the schema's transform turns it into `null` before it gets
 * here (VAL-2).
 */
export interface CandidateContactPatch {
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
}
