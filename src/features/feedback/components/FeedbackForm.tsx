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

/** Character threshold above which the character count indicator is displayed. */
const COUNTER_THRESHOLD = 4500;
const NOTES_MAXIMUM = 5000;

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface FeedbackFormProps {
  interviewId: number;
  /** Existing feedback entry if editing, or null if creating new feedback. */
  existing: Feedback | null;
  /** Callback invoked if the interview round is cancelled during form submission. */
  onCancelled: () => void;
}

/**
 * Form component for submitting or editing interview feedback (rating and notes).
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

    // Do not overwrite form with prefill if user has started editing
    if (isDirty) {
      syncedFrom.current = existing.id;
      return;
    }

    syncedFrom.current = existing.id;
    reset({ rating: existing.rating, notes: existing.notes });
  }, [existing, isDirty, reset]);

  // Client-side validity check for submit button state
  const isValid = rating >= 1 && rating <= 5 && trimmedNotes.length > 0;

  // In edit mode, check if any fields were modified
  const isUnchanged =
    existing !== null && rating === existing.rating && trimmedNotes === existing.notes;

  const submitLabel = (): string => {
    if (isSubmitting) {
      return isEditing ? 'Saving…' : 'Submitting…';
    }

    return isEditing ? 'Save changes' : 'Submit feedback';
  };

  /** Builds payload containing only modified fields for PATCH request. */
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
      // keep entered text in field.
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

      // Feedback already submitted; load existing entry for editing
      if (body?.code === 'FEEDBACK_ALREADY_SUBMITTED') {
        toast.info(
          'You have already submitted feedback for this round. Your existing entry is loaded for editing.',
        );
        return;
      }

      // Interview round was cancelled
      if (body?.code === 'INTERVIEW_CANCELLED') {
        toast.error('This interview was cancelled. Feedback can no longer be submitted.');
        onCancelled();
        return;
      }

      // Interview not found or user is not assigned
      if (error instanceof ApiError && error.status === 404) {
        toast.error('This interview is no longer available.');
        return;
      }

      // Unexpected error
      toast.error(GENERIC_ERROR_MESSAGE);
      setFormError(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.rating}>
          {/* Label for star rating group */}
          <span id="feedback-rating-label" className="text-sm font-semibold">
            Rating
          </span>
          {/* Form controller for star rating component */}
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
          {/* Character counter shown only when nearing the character limit */}
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
