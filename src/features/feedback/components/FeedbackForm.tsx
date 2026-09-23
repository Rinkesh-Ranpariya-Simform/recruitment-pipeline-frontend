'use client';

import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import { feedbackSchema, type FeedbackValues } from '@/lib/schemas/feedback';
import { useSubmitFeedback, useUpdateFeedback } from '../hooks/useFeedbackMutations';
import { StarRating } from './StarRating';
import type { Feedback, FeedbackPatch } from '../types';

/** The counter appears only past this, so a normal note has no countdown (VAL-5). */
const COUNTER_THRESHOLD = 4500;
const NOTES_MAXIMUM = 5000;

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface FeedbackFormProps {
  interviewId: number;
  /**
   * The signed-in interviewer's existing entry, or `null`.
   *
   * **Derived by the caller from the fetched list, never stored** (DM-3): a
   * refetch that reveals an entry flips this form into edit mode with no second
   * source of truth to keep in step — which is exactly what makes the `409`
   * recovery work without a mode flag to set.
   */
  existing: Feedback | null;
  /** Called when the round turns out to be cancelled mid-flight (FR-3.10, EC-08). */
  onCancelled: () => void;
}

/**
 * Rating and notes — **one component that creates or edits, from the start**
 * (FR-3, D-3).
 *
 * It is not a create form that later grew an edit branch, and the reason is the
 * API's concurrency policy: a second `POST` from the same interviewer is a
 * `409`, whose documented remedy is a `PATCH` on the same path. A form that
 * treated "you already submitted" as an error would be a dead end exactly where
 * the person has just written a considered assessment (FR-4.4).
 *
 * Three behaviours are worth reading before changing anything here:
 *
 * - **A failed request never discards what was typed** (ERR-1, FR-3.8, FR-4.3).
 *   This is the single most important thing this file does. An interviewer has
 *   just written their judgement of a person; losing it to a `400`, a `409` or a
 *   dropped connection is the worst outcome this screen can produce. Every
 *   branch below leaves the field values alone.
 * - **The `409` is a state transition, not a failure** (FR-4.2). The mutation
 *   invalidates `onSettled`, so the list has already refetched by the time the
 *   toast is read; `existing` then arrives, the form is in edit mode, and the
 *   text typed **here** is still in the field — the prefill effect deliberately
 *   does not overwrite a form somebody has touched.
 * - **Submit being disabled is UX; the API's `400` is the control** (AZ-4).
 *   AC-M05 fires `rating: 0` and `rating: 4.5` from the console and gets a `400`
 *   both times, which is the criterion that proves the star control is not what
 *   is enforcing the bounds.
 *
 * Nothing here is drafted to browser storage, not even an unsent assessment
 * (DM-2, SEC-5). It is one person's judgement of another, and a shared machine
 * should not keep it. The cost — a lost draft on an accidental reload — is
 * accepted rather than traded away.
 */
export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  interviewId,
  existing,
  onCancelled,
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const submitMutation = useSubmitFeedback(interviewId);
  const updateMutation = useUpdateFeedback(interviewId);

  const isEditing = existing !== null;
  const isSubmitting = submitMutation.isPending || updateMutation.isPending;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    // `0` is "unselected" and the schema refuses it, so Submit stays disabled
    // until a star is chosen. It is never sent.
    defaultValues: { rating: existing?.rating ?? 0, notes: existing?.notes ?? '' },
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  // `useWatch` rather than `watch()` — `watch()` returns a new function every
  // render, which opts this component out of the React Compiler.
  const rating = useWatch({ control, name: 'rating' }) ?? 0;
  const notes = useWatch({ control, name: 'notes' }) ?? '';
  const trimmedNotes = notes.trim();

  // Which entry the fields were last filled from. A ref, not state: it must not
  // cause a render, and it is the thing that makes the prefill run once per
  // entry rather than on every refetch.
  const syncedFrom = useRef<number | null>(null);

  useEffect(() => {
    if (existing === null) {
      syncedFrom.current = null;
      return;
    }

    if (syncedFrom.current === existing.id) {
      return;
    }

    // **The prefill never overwrites a form somebody has touched** (FR-4.3).
    // After a `409` the refetch brings the older entry back, and replacing the
    // words this interviewer just typed with it would be the exact data loss
    // ERR-1 exists to prevent. The prefill supplies only what they did not
    // change — which here means: nothing, if they changed anything.
    if (isDirty) {
      syncedFrom.current = existing.id;
      return;
    }

    syncedFrom.current = existing.id;
    reset({ rating: existing.rating, notes: existing.notes });
  }, [existing, isDirty, reset]);

  // Client-side validity, for the disabled state only. The schema is what the
  // resolver enforces; this mirrors it so the button can respond without a
  // submit attempt.
  const isValid = rating >= 1 && rating <= 5 && trimmedNotes.length > 0;

  // In edit mode, unchanged means nothing to save (FR-3.6, AC-F11).
  const isUnchanged =
    existing !== null && rating === existing.rating && trimmedNotes === existing.notes;

  const submitLabel = (): string => {
    if (isSubmitting) {
      return isEditing ? 'Saving…' : 'Submitting…';
    }

    return isEditing ? 'Save changes' : 'Submit feedback';
  };

  /**
   * Only what changed (API-3).
   *
   * Sending both fields every time would record a `fromRating` equal to
   * `toRating` on a notes-only edit, which makes the audit trail's one useful
   * pair say nothing.
   */
  const buildPatch = (values: FeedbackValues, current: Feedback): FeedbackPatch => {
    const patch: FeedbackPatch = {};

    if (values.rating !== current.rating) {
      patch.rating = values.rating;
    }

    if (values.notes !== current.notes) {
      patch.notes = values.notes;
    }

    return patch;
  };

  const onSubmit = async (values: FeedbackValues) => {
    setFormError(null);

    try {
      if (existing !== null) {
        await updateMutation.mutateAsync(buildPatch(values, existing));
        toast.success('Feedback updated.');
        return;
      }

      await submitMutation.mutateAsync(values);
      toast.success('Feedback submitted.');
      // No mode flag to set: the invalidation above refetches the list, the
      // caller derives `existing` from it, and this form is in edit mode on the
      // next render (DM-3).
      return;
    } catch (error) {
      // 403 is handled globally — `apiFetch` has already redirected to
      // /forbidden and this view is unmounting, so anything set here would flash
      // over the page the user is being sent to. It is unreachable through the
      // UI in any case: no form renders for a recruiter.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      const body = errorBodyOf(error);

      // `details` is keyed by request-body field name, so a rule the client
      // missed still lands on the right input — **and every character stays in
      // the field** (FR-3.8, ERR-1).
      if (body?.code === 'VALIDATION_ERROR') {
        const ratingMessage = fieldMessage(body.details, 'rating');
        const notesMessage = fieldMessage(body.details, 'notes');

        if (ratingMessage) {
          setError('rating', { type: 'server', message: ratingMessage });
        }

        if (notesMessage) {
          setError('notes', { type: 'server', message: notesMessage });
        }

        if (!ratingMessage && !notesMessage) {
          setFormError(body.message);
        }
        return;
      }

      // **Not an error state** (FR-4.2, ERR-2). Another tab, or another device,
      // filed this interviewer's feedback first. The list has already been
      // invalidated `onSettled`, so `existing` is on its way; the toast is
      // informational, the form becomes an edit form, and what was typed here
      // stays.
      if (body?.code === 'FEEDBACK_ALREADY_SUBMITTED') {
        toast.info(
          'You have already submitted feedback for this round. Your existing entry is loaded for editing.',
        );
        return;
      }

      // The round was cancelled while this was open. The form is replaced by the
      // cancellation line — there is nothing left to submit (FR-3.10, EC-08).
      if (body?.code === 'INTERVIEW_CANCELLED') {
        toast.error('This interview was cancelled. Feedback can no longer be submitted.');
        onCancelled();
        return;
      }

      // The round is gone, or this interviewer is no longer on it. **No copy
      // here distinguishes the two** — the API answers them identically and
      // guessing would hand back exactly what it withheld (ERR-4, FR-6.3). The
      // detail query was invalidated alongside, so the page resolves itself into
      // its not-found view.
      if (error instanceof ApiError && error.status === 404) {
        toast.error('This interview is no longer available.');
        return;
      }

      // A 500 and a dropped connection look the same from here. The form keeps
      // everything typed (ERR-1, EC-15).
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.rating}>
          {/* A plain element, not a `<label>`: the control below is a
              `radiogroup` rather than a single labellable input, so it is
              associated by `aria-labelledby` instead. */}
          <span id="feedback-rating-label" className="text-sm font-semibold">
            Rating
          </span>
          {/* A `Controller`, because the control is not an input: it emits a
              number through `onChange` and cannot produce a string (FE-5). */}
          <Controller
            control={control}
            name="rating"
            render={({ field }) => (
              <StarRating
                value={field.value ?? 0}
                onChange={field.onChange}
                disabled={isSubmitting}
                aria-labelledby="feedback-rating-label"
              />
            )}
          />
          <FieldError className="text-xs" errors={errors.rating ? [errors.rating] : undefined} />
        </Field>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="feedback-notes" className="font-semibold">
            Notes
          </FieldLabel>
          <Textarea
            id="feedback-notes"
            rows={5}
            placeholder="What you asked, how they answered, and what you concluded."
            disabled={isSubmitting}
            aria-invalid={!!errors.notes}
            aria-describedby="feedback-notes-counter"
            {...register('notes')}
          />
          {/* Silent until the limit is in sight, then counts down. A normal note
              should not be accompanied by a running tally (VAL-5). */}
          <p
            id="feedback-notes-counter"
            className="text-right text-xs text-muted-foreground"
            aria-live="polite"
          >
            {notes.length > COUNTER_THRESHOLD
              ? `${notes.length} / ${NOTES_MAXIMUM} characters`
              : null}
          </p>
          <FieldError className="text-xs" errors={errors.notes ? [errors.notes] : undefined} />
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isValid || isUnchanged}>
            {submitLabel()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};
