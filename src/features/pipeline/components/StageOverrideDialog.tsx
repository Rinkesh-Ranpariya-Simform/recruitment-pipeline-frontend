'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import { overrideSchema, type OverrideValues } from '@/lib/schemas/pipeline';
import { useOverrideStage } from '../hooks/usePipelineMutations';
import { pipelineStageLabel } from '../labels';
import { PIPELINE_STAGES } from '../search-params';
import type { PipelineStage } from '../types';

/** Mirrors the API's minimum, and the counter counts up to it (FR-6.3, D-7). */
const REASON_MINIMUM = 10;

interface StageOverrideDialogProps {
  applicationId: number;
  currentStage: PipelineStage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The deliberate skip (FR-6, brief §3.3).
 *
 * Three things about it are not decoration:
 *
 * - **The target select never offers the current stage** (FR-6.2, VAL-3). It
 *   offers every *other* stage, forwards and backwards, because the override is
 *   the escape hatch from the stage graph and the API accepts any of them
 *   (XBE-10). A recruiter who advanced someone by mistake needs a recorded way
 *   back, and the reason field is what makes that accountable rather than quiet.
 * - **Submit is disabled until the reason reaches ten characters after trim**
 *   (FR-6.3), with a live counter. **This is UX. The API's `400` is the
 *   control** (AZ-5, SEC-5) — AC-M03 proves it by firing a one-character reason
 *   from the console and getting a `400` back.
 * - **The standing line is always visible, not a tooltip** (FR-6.4). The brief
 *   requires the override be genuinely recorded, and a recruiter should know
 *   that before they type rather than discover it in an audit feed afterwards.
 *
 * A failed request **never discards what was typed** (FR-6.7, ERR-1): a `400`
 * renders under the field with the text intact. Only a conflict closes the
 * dialog, because the target stage the recruiter chose may no longer make sense
 * once someone else has moved the candidate (FR-6.8).
 *
 * Nothing here is drafted to storage, not even as an unsent reason (DM-2,
 * SEC-3): it is a recruiter's statement about a person's process, and it
 * belongs on the server or nowhere.
 */
export const StageOverrideDialog: React.FC<StageOverrideDialogProps> = ({
  applicationId,
  currentStage,
  open,
  onOpenChange,
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const overrideMutation = useOverrideStage();
  const isSubmitting = overrideMutation.isPending;

  // Every stage but the one it is already at (FR-6.2).
  const targetStages = PIPELINE_STAGES.filter((stage) => stage !== currentStage);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<OverrideValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { toStage: targetStages[0], reason: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // `useWatch` rather than `watch()` — `watch()` returns a new function every
  // render, which opts this component out of the React Compiler.
  const toStage = useWatch({ control, name: 'toStage' });
  const reason = useWatch({ control, name: 'reason' }) ?? '';
  const trimmedLength = reason.trim().length;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Reset on open so a dialog reopened after a conflict starts clean and
      // its target select reflects wherever the candidate now actually is.
      reset({ toStage: targetStages[0], reason: '' });
      setFormError(null);
      onOpenChange(true);
      return;
    }

    // It stays open while a write is in flight — closing it would leave the
    // recruiter unsure whether the override landed.
    if (isSubmitting) {
      return;
    }

    onOpenChange(false);
  };

  const onSubmit = async (values: OverrideValues) => {
    setFormError(null);

    try {
      await overrideMutation.mutateAsync({ applicationId, values });
      onOpenChange(false);
    } catch (error) {
      // 403 is handled globally: `apiFetch` has already redirected to
      // /forbidden and this view is unmounting, so anything set here would
      // flash over the page the recruiter is being sent to.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      const body = errorBodyOf(error);

      // `details` is keyed by request-body field name, so a rule the client
      // missed still lands on the right input — and the dialog stays open with
      // the typed text (FR-6.7).
      if (body?.code === 'VALIDATION_ERROR') {
        const message = fieldMessage(body.details, 'reason');
        const stageMessage = fieldMessage(body.details, 'toStage');

        if (message) {
          setError('reason', { type: 'server', message });
        }

        if (stageMessage) {
          setError('toStage', { type: 'server', message: stageMessage });
        }

        if (!message && !stageMessage) {
          setFormError(body.message);
        }
        return;
      }

      // The candidate moved, or the application closed, while this was open.
      // The chosen target may no longer make sense, so the dialog closes and
      // the toast the mutation already raised is the whole message (FR-6.8).
      if (body?.code === 'STAGE_CONFLICT' || body?.code === 'APPLICATION_NOT_ACTIVE') {
        onOpenChange(false);
        return;
      }

      // A 500 and a network failure look the same to a recruiter. The dialog
      // stays open with everything they typed still in it (ERR-1).
      setFormError('Something went wrong. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Override stage</DialogTitle>
          <DialogDescription>
            Move this candidate to a stage the normal progression does not allow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.toStage}>
              <FieldLabel htmlFor="override-stage" className="font-semibold">
                Target stage
              </FieldLabel>
              <Select
                items={targetStages.map((stage) => ({
                  value: stage,
                  label: pipelineStageLabel(stage),
                }))}
                value={toStage}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  if (value !== null) {
                    setValue('toStage', value as PipelineStage, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="override-stage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {pipelineStageLabel(stage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                className="text-xs"
                errors={errors.toStage ? [errors.toStage] : undefined}
              />
            </Field>

            <Field data-invalid={!!errors.reason}>
              <FieldLabel htmlFor="override-reason" className="font-semibold">
                Reason
              </FieldLabel>
              <Textarea
                id="override-reason"
                rows={4}
                placeholder="Why this candidate is skipping the normal progression."
                disabled={isSubmitting}
                aria-invalid={!!errors.reason}
                aria-describedby="override-reason-counter"
                {...register('reason')}
              />
              {/* Counts up to the minimum, then stops nagging. A recruiter
                  should be able to see how close they are without guessing at
                  why Submit is still grey. */}
              <p
                id="override-reason-counter"
                className="text-right text-xs text-muted-foreground"
                aria-live="polite"
              >
                {trimmedLength < REASON_MINIMUM
                  ? `${trimmedLength}/${REASON_MINIMUM} characters minimum`
                  : `${reason.length} characters`}
              </p>
              <FieldError
                className="text-xs"
                errors={errors.reason ? [errors.reason] : undefined}
              />
            </Field>

            {/* Always visible, never a tooltip (FR-6.4). */}
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              This is recorded against your name and appears in the audit trail.
            </p>

            {formError && (
              <div role="alert" className="text-sm font-normal text-destructive">
                {formError}
              </div>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || trimmedLength < REASON_MINIMUM}>
              {isSubmitting ? 'Recording override…' : 'Record override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
