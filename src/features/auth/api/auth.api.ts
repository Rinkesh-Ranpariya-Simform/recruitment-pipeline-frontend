import { apiFetch, refreshAccessToken } from '@/lib/api';
import type { LoginValues } from '@/lib/schemas/auth';
import type { LoginResponse, MeResponse, User } from '../types';

/**
 * Every auth call the client makes, in one place — components never assemble a
 * path or a header.
 *
 * This module exports **exactly four functions**. Two backend endpoints are
 * deliberately never called and must not gain a wrapper here:
 *
 *  - the backend's signup endpoint — anonymous and role-accepting. It is an
 *    operator tool (curl/Postman/seed); a caller in the browser would put an
 *    account-creation path in the client.
 *  - the backend's user-listing endpoint — recruiter-gated, but has no UI.
 *
 * An exported wrapper for an endpoint with no UI is how a removed feature comes
 * back by accident.
 */

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
