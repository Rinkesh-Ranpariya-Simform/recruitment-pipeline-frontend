import { z } from 'zod';

/**
 * Client-side contact validation, for UX only. It mirrors the backend's rules
 * so the dialog can respond without a round trip; **the API is what actually
 * enforces them** (VAL-6, AZ-7). If the two disagree, this file is the one that
 * is wrong.
 *
 * **There is no `name` and no `email` field, and that is the point** (D-4,
 * XBE-4, FR-11.5). The API accepts three fields; a form that offered a fourth
 * would appear to succeed while changing nothing. The dialog renders name and
 * email as read-only text instead, which is honest about why (FR-8.2).
 *
 * **No format validation on `phone`** (VAL-1), matching the API. A POC that
 * rejects a valid international number is worse than one that stores a string.
 *
 * **An emptied field becomes `null`, never `""`** (VAL-2, FR-8.3, XBE-5b). The
 * API distinguishes the two — `null` clears a value, `""` stores an empty
 * string — and a recruiter who clears the phone box means the first. The
 * transform lives **in the schema rather than in the component**, so every call
 * site gets it.
 */

/** Trim, cap, and turn an emptied box into an explicit `null` (VAL-2). */
const contactField = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === '' ? null : value));

export const contactDetailsSchema = z.object({
  phone: contactField(40, 'Keep the phone number under 40 characters.'),
  location: contactField(120, 'Keep the location under 120 characters.'),
  headline: contactField(200, 'Keep the headline under 200 characters.'),
});

/**
 * What the form holds while it is being typed — three strings, because an
 * `<Input>`'s value is a string and a controlled field cannot hold `null`.
 *
 * `ContactDetailsValues` below is what the schema produces, where each field
 * has already become `string | null`. The two are deliberately different types:
 * the first is what a recruiter is editing, the second is what the API is told.
 */
export type ContactDetailsFormValues = z.input<typeof contactDetailsSchema>;

/** The parsed result — `null` where a field was emptied. */
export type ContactDetailsValues = z.output<typeof contactDetailsSchema>;
