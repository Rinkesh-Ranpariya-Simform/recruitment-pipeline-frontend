/** Authentication and user account types matching backend contracts. */

/** System user roles: RECRUITER, INTERVIEWER, or CANDIDATE. */
export type UserRole = 'INTERVIEWER' | 'RECRUITER' | 'CANDIDATE';

/** Sanitized user profile returned from auth endpoints. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

/** Response payload for login endpoint. */
export interface LoginResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

/** Response payload for signup endpoint. */
export interface SignupResponse {
  user: User;
}

/** Response payload for token refresh endpoint. */
export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

/** Response payload for authenticated user profile endpoint. */
export interface MeResponse {
  user: User;
}

/** Structured error response returned from backend API endpoints. */
export interface ApiErrorBody {
  code: string;
  message: string;
  /** Field-specific validation error messages. */
  details?: Record<string, Array<string>>;
}
