import { apiFetch, refreshAccessToken } from '@/lib/api';
import type { LoginValues, SignupValues } from '@/lib/schemas/auth';
import type { LoginResponse, MeResponse, SignupResponse, User } from '../types';

/**
 * Every auth call the client makes, in one place — components never assemble a
 * path or a header.
 *
 * This module exports **exactly five functions**.
 *
 * `signup` was forbidden here until the candidate feature, on the grounds that
 * the endpoint was "anonymous and role-accepting" — a browser caller would have
 * been an account-creation path that could mint a recruiter. The backend removed
 * `role` from that contract and hard-codes `CANDIDATE`, so the reason is gone
 * and the wrapper is allowed. **The prohibition on a role field is not gone**:
 * `signup` sends three keys and must never send a fourth.
 *
 * One backend endpoint is still deliberately never called and must not gain a
 * wrapper here:
 *
 *  - the user-listing endpoint — recruiter-gated, but has no UI.
 *
 * An exported wrapper for an endpoint with no UI is how a removed feature comes
 * back by accident.
 */

/**
 * Creates a CANDIDATE account. Always a candidate — the server decides the role
 * and this client has no say in it, which is the point.
 *
 * Deliberately returns **no session**: the backend issues no token and sets no
 * cookie on signup, so the caller must send the user to `/login`. Auto-logging
 * them in here would hide that guarantee behind a second request nobody asked
 * for.
 */
export function signup(values: SignupValues): Promise<SignupResponse> {
  return apiFetch<SignupResponse>('/api/auth/signup', {
    method: 'POST',
    body: values,
  });
}

/** Sets the HttpOnly refresh cookie as a side effect; the token is in the body. */
export function login(values: LoginValues): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: values,
  });
}

/**
 * Exchanges the refresh cookie for a new access token and stores it.
 *
 * Delegates to the single-flight refresh in `lib/api.ts` so that a bootstrap
 * refresh and a 401-triggered one can never both be in flight — the backend
 * rotates the cookie on every refresh and treats a reused token as theft.
 */
export function refresh(): Promise<void> {
  return refreshAccessToken();
}

/** The authority on identity. Role is read from here and nowhere else. */
export async function getMe(): Promise<User> {
  const { user } = await apiFetch<MeResponse>('/api/auth/me');
  return user;
}

/** Revokes the session server-side. Responds 204 even without a valid cookie. */
export async function logout(): Promise<void> {
  await apiFetch<unknown>('/api/auth/logout', { method: 'POST' });
}
