/** Represents a feedback assessment submitted by an interviewer. */
export interface Feedback {
  id: number;
  interviewId: number;
  /** An integer 1–5. The API rejects `0`, `6`, `4.5` and `"4"` alike. */
  rating: number;
  notes: string;
  createdAt: string;
  /** Equal to `createdAt` until the author edits; that difference is the "edited" marker. */
  updatedAt: string;
  interviewer: { id: number; name: string };
}

/**
 * `GET /api/interviews/:id/feedback` — 200.
 *
 * **No pagination envelope**, deliberately: a round's panel is bounded by one
 * row per interviewer and by how many a recruiter assigns, so it is single
 * digits and the API does not page it. Do not add a `pagination` field "for
 * symmetry" with the roles, audit and interviews envelopes.
 */
export interface FeedbackListResponse {
  feedback: Array<Feedback>;
}

/** `POST` — 201, and `PATCH` — 200. The same single-entry shape either way. */
export interface FeedbackResponse {
  feedback: Feedback;
}

/**
 * The body of a `PATCH`.
 *
 * Both fields are optional **on the wire**, because the client sends only what
 * changed — which is what keeps the audit trail's `fromRating`/`toRating` pair
 * meaningful. The form still requires both to be present and valid; an edit
 * that clears the notes is an empty assessment.
 *
 * An empty object is a `400` keyed `_` at the API. The form cannot produce one:
 * Save is disabled while nothing has changed.
 */
export interface FeedbackPatch {
  rating?: number;
  notes?: string;
}
