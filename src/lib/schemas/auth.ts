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

/**
 * Client-side signup validation. Same rule as above: UX, never authorization.
 *
 * **There is deliberately no `role` field**, and there must never be one. The
 * backend hard-codes `CANDIDATE`; a role input on a public form would be a
 * selector for a privilege the server no longer grants.
 *
 * There is also no `confirmPassword`: the backend contract has no such field, so
 * adding one would invent a validation rule the server does not have.
 *
 * Unlike `loginSchema`, `password` DOES carry a minimum here, and the asymmetry
 * is deliberate. On login a minimum would reveal that no account can have a
 * short password; on signup the rule is public by definition — it is what the
 * user is being asked to satisfy.
 */
export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter a valid email address')
    .email('Enter a valid email address')
    .max(254, 'Email must be at most 254 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    // BYTES, not characters — bcrypt silently truncates past 72, so two
    // different long passwords could otherwise authenticate the same account.
    // A multi-byte password hits this sooner than its length suggests, which is
    // why the message says bytes.
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      'Password must be at most 72 bytes',
    ),
});

export type SignupValues = z.infer<typeof signupSchema>;
