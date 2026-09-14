import { z } from 'zod';

/**
 * Client-side login validation. This is **UX only** — it mirrors the backend's
 * rules so the form can respond without a round trip, and is never a substitute
 * for what the API enforces. Where the two disagree, the backend is correct.
 *
 * `password` deliberately has **no minimum length beyond non-empty**: a short
 * password must produce a server 401, not a client-side error, or the form
 * would reveal that no account can have a password under N characters.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter a valid email address')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginValues = z.infer<typeof loginSchema>;
