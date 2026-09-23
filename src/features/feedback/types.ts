/**
 * The client's copy of the backend feedback contract
 * (backend/specs/features/feedback/spec.md § API Contract).
 *
 * Nothing is shared by import between the two repos — only by agreement — so a
 * change to the payload, the rating bounds or either `409` code has to be made
 * here as well.
 */

/**
 * One interviewer's assessment of one round, exactly as all three endpoints
 * return it.
 *
 * **These are all the fields there are, and that is the point.** There is no
 * candidate field here — not a name, not an id, and certainly not an `email` or
 * a `phone` — because the API's projection never selects one. The brief's §3.6
 * names a feedback-submission endpoint specifically as the leak path to worry
 * about, and the answer on this side is that **there is nothing in the shape to
 * hide**.
 *
 * **Do not add an optional candidate field to this interface**, for the same
 * reason `InterviewerInterview` must not gain an optional `assignments`: a shape
 * with `candidate?` is one `&&` away from rendering what the API deliberately
 * withheld. The candidate's name on this screen comes from the **interview**
 * payload, which is the interviews feature's contract.
 *
 * If such a field ever turns up in a response, **that is a backend bug to
 * report, not a field to hide here** — per [frontend/CLAUDE.md](../../../CLAUDE.md).
 *
 * There is no raw `interviewerId` either: the expanded `interviewer` object
 * replaces it, so a client has a name to render rather than an id to guess with.
 */
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
