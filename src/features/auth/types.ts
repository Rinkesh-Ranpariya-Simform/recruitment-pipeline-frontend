/**
 * The client's mirror of the backend auth contract
 * (backend/specs/features/authentication/spec.md § API Contract).
 *
 * Nothing is shared by import between the two repos — only by agreement — so a
 * change to the backend's safe-user shape or error shape must be made here too.
 */

/**
 * What a *user* is allowed to be. Named `UserRole`, not `Role`, because `Role`
 * means an **open requisition** elsewhere in this app
 * (`features/roles/types.ts`).
 *
 * `CANDIDATE` was added by the candidate feature. Keeping this a union, and
 * every role-keyed map a `Record<UserRole, …>`, is what made that addition a
 * **compile error** in `NAV_SECTIONS` and `ROLE_LANDING` until both were filled
 * in — rather than a role that silently renders an empty sidebar. Add the next
 * role the same way and let the compiler find the gaps.
 */
export type UserRole = 'INTERVIEWER' | 'RECRUITER' | 'CANDIDATE';

/**
 * The backend's "safe user representation" (backend FR-6.1), and the only user
 * shape this app models.
 *
 * There is deliberately no field for `passwordHash` or a token: a payload that
 * ever carried one would fail type-checking here as well as review. Per
 * frontend/CLAUDE.md, such a payload is a backend bug to flag — not a field to
 * hide in the UI.
 */
export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

/** `POST /api/auth/login` — 200. The refresh token is not here; it is an HttpOnly cookie. */
export type LoginResponse = {
  user: User;
  accessToken: string;
  expiresIn: number;
};

/**
 * `POST /api/auth/signup` — 201.
 *
 * There is deliberately **no `accessToken` and no session** in this shape. The
 * backend issues neither, and a type that declared one would invite a caller to
 * look for it.
 */
export type SignupResponse = {
  user: User;
};

/** `POST /api/auth/refresh` — 200. Cookie-driven; no user object is returned. */
export type RefreshResponse = {
  accessToken: string;
  expiresIn: number;
};

/** `GET /api/auth/me` — 200. */
export type MeResponse = {
  user: User;
};

/**
 * The flat error body every non-2xx response uses. Branch on `code` — it is the
 * stable contract; `message` is user-safe copy that may be rendered verbatim.
 */
export type ApiErrorBody = {
  code: string;
  message: string;
  /**
   * Keyed by request-body field name, so it maps straight onto form inputs.
   *
   * **Each value is an array** — the backend accumulates every message a field
   * failed on. This client declared a bare `string` until the roles feature,
   * which was invisible only because the backend's accumulator was broken and
   * always produced `{}`. Read it through `fieldMessage` in
   * `lib/error-details.ts` rather than passing it to `setError` directly.
   */
  details?: Record<string, string[]>;
};
