import { z } from 'zod';

/** Client-side login form validation (mirrors backend rules for quick UX feedback). */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter a valid email address')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginValues = z.infer<typeof loginSchema>;

/** Client-side signup form validation. No role field — the backend always assigns CANDIDATE. */
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
    // bcrypt truncates at 72 bytes — enforce byte limit, not character limit.
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      'Password must be at most 72 bytes',
    ),
});

export type SignupValues = z.infer<typeof signupSchema>;
