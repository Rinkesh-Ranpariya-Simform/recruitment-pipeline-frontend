import { z } from 'zod';

/**
 * Client-side role validation, for UX only. It mirrors the backend's rules so
 * the dialog can respond without a round trip; the API is what actually
 * enforces them. If the two disagree, this file is the one that's wrong.
 *
 * `.trim()` runs before `.min(1)`, so a title of `"   "` fails here rather than
 * being sent and rejected.
 *
 * Neither schema has a `status` field: a new role is always `OPEN`, and status
 * is changed by its own action rather than by a form field.
 */

const title = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(120, 'Title must be 120 characters or fewer');

const description = z
  .string()
  .trim()
  .min(1, 'Description is required')
  .max(5000, 'Description must be 5000 characters or fewer');

export const roleCreateSchema = z.object({ title, description });

/**
 * The same rules as create — an edit can't empty a field that create required.
 * Which fields actually get sent is decided by what the user touched.
 */
export const roleEditSchema = z.object({ title, description });

/** One type for both modes, since the two schemas have the same shape. */
export type RoleCreateValues = z.infer<typeof roleCreateSchema>;
