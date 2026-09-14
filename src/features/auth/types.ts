/**
 * The client's mirror of the backend auth contract
 * (backend/specs/features/authentication/spec.md § API Contract).
 *
 * Nothing is shared by import between the two repos — only by agreement — so a
 * change to the backend's safe-user shape or error shape must be made here too.
 */

export type Role = 'INTERVIEWER' | 'RECRUITER';

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
  role: Role;
  createdAt: string;
};

/** `POST /api/auth/login` — 200. The refresh token is not here; it is an HttpOnly cookie. */
export type LoginResponse = {
  user: User;
  accessToken: string;
  expiresIn: number;
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
  details?: Record<string, string>;
};
