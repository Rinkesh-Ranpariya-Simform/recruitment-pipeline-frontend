import type { RoleStatus } from '@/features/roles/types';

/**
 * The client's copy of the backend pipeline contract
 * (backend/specs/features/pipeline/spec.md § API Contract).
 *
 * Nothing is shared by import between the two repos — only by agreement — so a
 * change to the board shape, the summary's field list, the three `409` codes or
 * a write's response has to be made here as well (FE-11).
 */

/**
 * **Re-exported, never redeclared** (FE-11). Both unions already exist in
 * `features/applications/types.ts`, and two declarations of one union
 * eventually disagree — which for `PipelineStage` would mean the board and a
 * candidate's own view disagreeing about what the stages are.
 */
export type { ApplicationStatus, PipelineStage } from '@/features/applications/types';

import type { ApplicationStatus, PipelineStage } from '@/features/applications/types';

/**
 * One cell of the board: a role, a stage, and what is sitting in it.
 *
 * **`avgDaysInStage` and `maxDaysInStage` are `number | null`, and they are
 * `null` exactly when `candidateCount` is `0`** (XBE-7). The distinction is
 * load-bearing and the renderer must keep it: `null` means *no candidates*,
 * `0` means *no time* — an application that entered this stage a minute ago
 * legitimately reads `0`. Formatting `null` as "0 days" states something false.
 *
 * **There is no candidate array and no name here, and that is the point**
 * (XBE-8). The board's payload is bounded by roles rather than by people, which
 * is what keeps it usable at 20,000 candidates.
 */
export interface PipelineStageCell {
  stage: PipelineStage;
  candidateCount: number;
  avgDaysInStage: number | null;
  maxDaysInStage: number | null;
}

/**
 * One role's column group.
 *
 * `stages` is **densified by the API** (XBE-6): every role carries all four
 * stages, in the backend's `STAGE_ORDER`, including zero-count ones. The client
 * renders the array in the order given and **never sorts it and never invents a
 * missing stage**, because it never has to (FR-3.2, FR-3.3).
 */
export interface PipelineRole {
  id: number;
  title: string;
  status: RoleStatus;
  totalActive: number;
  stages: Array<PipelineStageCell>;
}

/** `GET /api/pipeline` — 200. Unpaginated; an empty result is `roles: []`. */
export interface PipelineBoardResponse {
  roles: Array<PipelineRole>;
}

/**
 * The dashboard headline.
 *
 * **Seven keys as of the interviews feature**, which added `interviews` — the
 * count of SCHEDULED rounds — and with it the walkthrough's fourth headline
 * tile. This supersedes the note that used to stand here saying the field would
 * not exist; it does now, and pipeline XBE-9 is inverted along with it.
 */
export interface PipelineSummary {
  openRoles: number;
  totalApplicants: number;
  activeApplicants: number;
  offers: number;
  hired: number;
  rejected: number;
  interviews: number;
}

/** `GET /api/pipeline/summary` — 200. */
export interface PipelineSummaryResponse {
  summary: PipelineSummary;
}

/**
 * What every successful write returns (XBE-12) — enough to update a row without
 * a refetch, though this client invalidates instead (FE-6).
 *
 * **There is no `candidateUserId` and no `candidate`.** The API selects
 * neither, so there is nothing here a component could render by accident, and
 * no email or phone anywhere in this feature's types (XBE-11, SEC-2).
 */
export interface PipelineApplication {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  stageEnteredAt: string;
  role: { id: number; title: string };
}

/**
 * The override row as `POST …/stage-override` returns it.
 *
 * `performedBy.name` is **a recruiter's** and is the only name any endpoint in
 * this feature returns. `skipped` is how many stages the move jumped — `0` when
 * the override was used for a move the graph would have allowed anyway.
 */
export interface StageOverride {
  id: number;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  reason: string;
  skipped: number;
  createdAt: string;
  performedBy: { id: number; name: string };
}

/** `PATCH …/stage` and `PATCH …/outcome` — 200. */
export interface PipelineApplicationResponse {
  application: PipelineApplication;
}

/** `POST …/stage-override` — 201. */
export interface StageOverrideResponse {
  application: PipelineApplication;
  override: StageOverride;
}

/** The two terminal outcomes. `ACTIVE` is not one — the API rejects it with a 400. */
export type OutcomeStatus = Extract<ApplicationStatus, 'HIRED' | 'REJECTED'>;
