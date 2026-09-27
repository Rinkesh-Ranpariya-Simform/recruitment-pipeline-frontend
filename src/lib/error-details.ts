import { ApiError } from '@/lib/api';
import type { ApiErrorBody } from '@/features/auth/types';

/** Utilities for reading the backend's structured error body. */

/** Extracts the structured error body from an ApiError, or null for non-API errors. */
export const errorBodyOf = (error: unknown): ApiErrorBody | null => {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const body = error.body;

  if (body && typeof body === 'object' && 'code' in body) {
    return body as ApiErrorBody;
  }

  return null;
};

/** Returns the first validation message for a field, or undefined. */
export const fieldMessage = (
  details: Record<string, Array<string>> | undefined,
  field: string,
): string | undefined => {
  return details?.[field]?.[0];
};
