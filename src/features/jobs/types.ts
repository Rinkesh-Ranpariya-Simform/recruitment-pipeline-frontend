/**
 * The client's copy of the candidate-facing requisition contract.
 *
 * **The wire keys are `roles` and `role`, not `jobs` and `job.** This client
 * renames the *concept* — a candidate is looking at a job advert, not an open
 * requisition — but the endpoint is the same `/api/roles` the recruiter views
 * use, and renaming the payload keys would break them. Only the reading changes.
 *
 * Nothing is shared by import between the two repos, so a change to this shape
 * has to be made on both sides.
 */

/**
 * What a non-recruiter gets back.
 *
 * `updatedAt` is **absent by construction**: the backend selects it only for a
 * recruiter (`PUBLIC_ROLE_SELECT`). Declaring it here would let a component ask
 * for a field that is never sent.
 *
 * `status` is typed as the literal `'OPEN'` rather than the full union for the
 * same reason. The backend forces `status: OPEN` into a non-recruiter's query,
 * so a `CLOSED` row cannot arrive — and if one ever did, that is a **backend bug
 * to report**, not a row to filter here.
 */
export interface Job {
  id: number;
  title: string;
  description: string;
  status: 'OPEN';
  createdAt: string;
}

/** The list envelope, identical to the recruiter's. */
export interface JobsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** `GET /api/roles` — 200. */
export interface JobsListResponse {
  roles: Array<Job>;
  pagination: JobsPagination;
}

/** `GET /api/roles/:roleId` — 200. */
export interface JobResponse {
  role: Job;
}
