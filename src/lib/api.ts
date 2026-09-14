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

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

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
type AuthHandlers = {
  onAuthFailure: () => void;
  onForbidden: () => void;
};

let authHandlers: AuthHandlers | null = null;

export function registerAuthHandlers(handlers: AuthHandlers): void {
  authHandlers = handlers;
}

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
 * On failure it clears the token and notifies the auth layer (which clears the
 * query cache and redirects to /login), then rethrows so the caller's request
 * fails rather than silently hanging.
 */
export function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const data = await apiFetch<RefreshResponse>('/api/auth/refresh', { method: 'POST' });
        setAccessToken(data.accessToken);
      } catch (error) {
        clearAccessToken();
        authHandlers?.onAuthFailure();
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function buildHeaders(headers: HeadersInit | undefined): HeadersInit {
  const token = getAccessToken();

  return {
    'Content-Type': 'application/json',
    // Attached only when a token is in memory, and before the caller's own
    // headers are spread so an explicit Authorization still wins.
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
}

async function parseResponse<T>(res: Response, path: string): Promise<T> {
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
}

/**
 * Thin fetch wrapper for talking to the Express backend.
 * Always sends/reads JSON and normalizes non-2xx responses into ApiError.
 *
 * It additionally carries the session: the in-memory access token is attached as
 * a Bearer header, `credentials: 'include'` lets the HttpOnly refresh cookie
 * travel cross-origin, and a 401 is recovered by refreshing once and replaying
 * the request once.
 */
export async function apiFetch<T>(
  path: string,
  { body, headers, ...init }: RequestOptions = {},
): Promise<T> {
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

    // Exactly one replay. A 401 here is surfaced to the caller — the retry is
    // never itself retried, or a genuinely revoked session would loop.
    res = await attempt();
  }

  if (res.status === 403) {
    // 403 is terminal: the server refused this account, and no refresh can help.
    // It renders the 403 view rather than a toast, so the refusal is visible.
    authHandlers?.onForbidden();
  }

  return parseResponse<T>(res, path);
}

export { API_URL };
