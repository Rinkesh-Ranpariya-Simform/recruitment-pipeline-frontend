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

/** Paths that should not trigger a token refresh on 401 (login/refresh failures are real errors). */
const REFRESH_EXEMPT_PATHS = ['/api/auth/login', '/api/auth/session/refresh'];

/** Auth callbacks registered by AuthProvider (kept outside React). */
interface AuthHandlers {
  onAuthFailure: () => void;
  onForbidden: () => void;
}

let authHandlers: AuthHandlers | null = null;

export const registerAuthHandlers = (handlers: AuthHandlers): void => {
  authHandlers = handlers;
};

/** Deduplicates concurrent refresh attempts — multiple 401s share a single refresh request. */
let refreshPromise: Promise<void> | null = null;

/** Refreshes the access token. A 401 is surfaced to the caller so the caller
 * decides whether the session is actually gone; a bootstrap refresh may simply
 * mean “no valid cookie” and should resolve to anonymous, not a forced logout.
 */
export const refreshAccessToken = (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const data = await apiFetch<RefreshResponse>('/api/auth/session/refresh', {
          method: 'POST',
        });
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

/** Clears the token and notifies the auth layer that the session is over. */
const endSession = (): void => {
  clearAccessToken();
  authHandlers?.onAuthFailure();
};

const buildHeaders = (headers: HeadersInit | undefined): HeadersInit => {
  const token = getAccessToken();

  return {
    'Content-Type': 'application/json',
    // Attach token if available; caller's headers can still override Authorization.
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

/** Fetch wrapper that sends/reads JSON, attaches auth, and auto-retries on expired tokens. */
export const apiFetch = async <T>(
  path: string,
  { body, headers, ...init }: RequestOptions = {},
): Promise<T> => {
  // Serialize body once so retries send the exact same payload.
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
    // If refresh fails, the error propagates to the caller.
    await refreshAccessToken();

    // Retry the original request exactly once after refresh.
    res = await attempt();

    if (res.status === 401) {
      // Still 401 after a successful refresh — the session is unrecoverable.
      endSession();
    }
  }

  if (res.status === 403) {
    // 403 — access denied. Redirect to the forbidden page.
    authHandlers?.onForbidden();
  }

  return parseResponse<T>(res, path);
};
