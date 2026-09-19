import { clearAccessToken, getAccessToken, setAccessToken } from '@/features/auth/access-token';
import type { RefreshResponse } from '@/features/auth/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Paths excluded from the 401 interceptor. A 401 from login or refresh is a real
 * failure, not something a refresh can recover — and refreshing in response to a
 * failed refresh would recurse.
 */
const REFRESH_EXEMPT_PATHS = ['/api/auth/login', '/api/auth/refresh'];

/**
 * Callbacks registered by AuthProvider. They live here as plain functions so
 * this module stays free of React and router imports.
 */
interface AuthHandlers {
  onAuthFailure: () => void;
  onForbidden: () => void;
}

let authHandlers: AuthHandlers | null = null;

export const registerAuthHandlers = (handlers: AuthHandlers): void => {
  authHandlers = handlers;
};

/**
 * The in-flight refresh, if any. Concurrent 401s await this same promise, so ten
 * queries expiring together produce exactly one POST /api/auth/refresh rather
 * than ten. Cleared in a `finally` — leaving a settled promise cached here would
 * resolve every later 401 against a dead token.
 */
let refreshPromise: Promise<void> | null = null;

/**
 * Refreshes the access token at most once per expiry event.
 *
 * A `401` means the refresh token itself is gone — expired, revoked, or its
 * family killed by reuse detection — so the session is over: the token is
 * cleared and the auth layer is notified (it clears the query cache and
 * redirects to /login). Anything else — a 500, or a `TypeError` from an
 * unreachable backend — says nothing about whether the session is still valid,
 * so it is rethrown untouched. Ending a session on a dropped connection would
 * log out a user whose refresh token is perfectly good.
 *
 * Either way it rethrows, so the caller's request fails rather than silently
 * hanging.
 */
export const refreshAccessToken = (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const data = await apiFetch<RefreshResponse>('/api/auth/refresh', { method: 'POST' });
        setAccessToken(data.accessToken);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          endSession();
        }
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

/**
 * Tears down the client side of a session the server has finished with.
 *
 * Both callers reach it from a `401` that no further refresh can fix, and both
 * must do the same two things — drop the token and tell the auth layer — or the
 * app keeps rendering as signed in against a session that no longer exists.
 */
const endSession = (): void => {
  clearAccessToken();
  authHandlers?.onAuthFailure();
};

const buildHeaders = (headers: HeadersInit | undefined): HeadersInit => {
  const token = getAccessToken();

  return {
    'Content-Type': 'application/json',
    // Attached only when a token is in memory, and before the caller's own
    // headers are spread so an explicit Authorization still wins.
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
};

const parseResponse = async <T>(res: Response, path: string): Promise<T> => {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      isJson && data && typeof data === 'object' && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `Request to ${path} failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
};

/**
 * Thin fetch wrapper for talking to the Express backend.
 * Always sends/reads JSON and normalizes non-2xx responses into ApiError.
 *
 * It additionally carries the session: the in-memory access token is attached as
 * a Bearer header, `credentials: 'include'` lets the HttpOnly refresh cookie
 * travel cross-origin, and a 401 is recovered by refreshing once and replaying
 * the request once.
 */
export const apiFetch = async <T>(
  path: string,
  { body, headers, ...init }: RequestOptions = {},
): Promise<T> => {
  // Serialised once, before the first attempt, so a replay sends a byte-identical payload.
  const serializedBody = body !== undefined ? JSON.stringify(body) : undefined;

  const attempt = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: buildHeaders(headers),
      body: serializedBody,
    });

  let res = await attempt();

  if (res.status === 401 && !REFRESH_EXEMPT_PATHS.includes(path)) {
    // Throws if the refresh itself fails, which is the unrecoverable case.
    await refreshAccessToken();

    // Exactly one replay. It is never itself retried, or a genuinely revoked
    // session would loop.
    res = await attempt();

    if (res.status === 401) {
      // The refresh succeeded and the server still refuses the token it just
      // issued, so the session is over even though the refresh was fine — a
      // deleted user row, or a token revoked between the two calls. Surfacing
      // this to the caller and stopping there (as this did) left the app signed
      // in on a session that can never recover: `<RequireAuth>` rendered its
      // retryable error, and every retry took this same path. Not retried, but
      // it must end the session.
      endSession();
    }
  }

  if (res.status === 403) {
    // 403 is terminal: the server refused this account, and no refresh can help.
    // It renders the 403 view rather than a toast, so the refusal is visible.
    authHandlers?.onForbidden();
  }

  return parseResponse<T>(res, path);
};
