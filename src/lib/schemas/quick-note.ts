import { z } from 'zod';

/**
 * Minimal schema used to prove the RHF + Zod + shadcn wiring end to end.
 * Not tied to a backend route yet — swap in real domain schemas
 * (candidate, feedback, override, ...) once those endpoints exist.
 */
export const quickNoteSchema = z.object({
  title: z.string().trim().min(3, 'Must be at least 3 characters'),
  note: z.string().trim().min(1, "Note can't be empty").max(280, 'Keep it under 280 characters'),
});

export type QuickNoteValues = z.infer<typeof quickNoteSchema>;
