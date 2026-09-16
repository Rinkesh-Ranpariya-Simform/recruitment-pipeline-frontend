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

/**
 * One row of `GET /api/applications`, and the body of a successful apply.
 *
 * **These are all the fields there are, and that is the point.** There is no
 * `feedback`, `rating`, `notes`, `interviewer`, `overrideReason` or
 * `stageHistory` — the backend never selects them, and declaring one here would
 * let a component render something a candidate must not see. If such a field
 * ever appears in a payload, that is a backend bug to report, not a field to
 * hide in the UI.
 *
 * `role` carries `id` and `title` only. It is not a `Job`: there is no
 * `description` and no `status`, so this list can't become a second view of the
 * requisition table.
 */
export type Application = {
  id: number;
  status: ApplicationStatus;
  currentStage: PipelineStage;
  /** When the candidate applied — the "Applied:" date. */
  createdAt: string;
  role: { id: number; title: string };
};

/** `GET /api/applications` — 200. Empty is `[]`, never a 404. */
export type ApplicationsListResponse = {
  applications: Application[];
};

/** `POST /api/applications` — 201. */
export type ApplicationResponse = {
  application: Application;
};
