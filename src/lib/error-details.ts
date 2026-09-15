import { ApiError } from '@/lib/api';
import type { ApiErrorBody } from '@/features/auth/types';

/**
 * Reading the backend's flat error body, in one place.
 *
 * `errorBodyOf` lived inside `LoginForm` until a second form needed it. It is
 * here rather than in `lib/api.ts` because `apiFetch` deliberately knows nothing
 * about the body's shape — it normalises status codes, and the shape is an
 * agreement between the two repos that only the UI layer reads.
 */

/**
 * Narrows an unknown thrown value to the backend's flat error body.
 *
 * Returns `null` for anything that is not an `ApiError` carrying a `code` — a
 * network `TypeError`, a thrown string, a 500 whose body is HTML. Callers branch
 * on `body?.code`, never on `message` copy.
 */
export function errorBodyOf(error: unknown): ApiErrorBody | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const body = error.body;

  if (body && typeof body === 'object' && 'code' in body) {
    return body as ApiErrorBody;
  }

  return null;
}

/**
 * The **first** message the backend recorded for a field, or `undefined`.
 *
 * `details[field]` is an array: the backend accumulates every rule a field
 * failed. Forms show one message per input, so the first is what renders —
 * passing the array itself to react-hook-form's `setError` would render
 * `["Title is required"]`, brackets and all.
 */
export function fieldMessage(
  details: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  return details?.[field]?.[0];
}
