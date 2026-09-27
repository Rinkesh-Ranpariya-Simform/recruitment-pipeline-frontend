import { z } from 'zod';

/** Client-side validation schema for candidate contact details updates. */

/** Trims input, limits length, and transforms empty strings into null. */
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
