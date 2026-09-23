'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CalendarPlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import { PIPELINE_STAGE_LABELS } from '@/features/pipeline/labels';
import {
  INTERVIEW_TYPE_VALUES,
  PIPELINE_STAGE_VALUES,
  scheduleInterviewSchema,
  toScheduledAtInstant,
  type ScheduleInterviewFormValues,
} from '@/lib/schemas/interview';
import { INTERVIEW_TYPE_LABELS } from '../labels';
import { useCreateInterview } from '../hooks/useInterviewMutations';
import type { PipelineStage } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** The only fields a server validation error can be mapped onto. */
const SERVER_FIELDS = ['type', 'stage', 'scheduledAt'] as const;

const TYPE_OPTIONS = INTERVIEW_TYPE_VALUES.map((value) => ({
  value,
  label: INTERVIEW_TYPE_LABELS[value],
}));

const STAGE_OPTIONS = PIPELINE_STAGE_VALUES.map((value) => ({
  value,
  label: PIPELINE_STAGE_LABELS[value],
}));

interface ScheduleInterviewDialogProps {
  applicationId: number;
  /** Seeds the Stage select. Freely changeable — see below. */
  currentStage: PipelineStage;
  /** The trigger's label, since the two call sites read differently. */
  triggerLabel?: string;
}

/**
 * Schedules a round against one application.
 *
 * **One call site as of the applications feature** — the recruiter's application
 * detail page, where the whole of a candidate's process lives. It was reachable
 * from a round's page too; that link is gone, because "schedule another round"
 * belonged on the page that shows what rounds there already are.
 *
 * Three rules here are easy to get wrong in opposite directions:
 *
 *   - **A date is optional.** A recruiter routinely decides to run a round
 *     before agreeing a time for it, and forcing one here would make them invent
 *     a date that nothing downstream can tell apart from a real one.
 *
 *   - **Stage is seeded from the application's current stage but is freely
 *     changeable.** The API does not require the two to match, because a
 *     recruiter routinely schedules the technical round while the candidate is
 *     still at Screen. A round's stage is what it is *for*, not a claim about
 *     now — so this is a default, never a constraint.
 *
 *   - **A past date is accepted with no warning.** Backfilling a round that
 *     already happened is normal and the API has no floor either; a
 *     confirmation prompt for an ordinary action is noise, and a client-side
 *     minimum would block something legitimate.
 */
export const ScheduleInterviewDialog: React.FC<ScheduleInterviewDialogProps> = ({
  applicationId,
  currentStage,
  triggerLabel = 'Schedule interview',
}) => {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateInterview();
  const isSubmitting = createMutation.isPending;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ScheduleInterviewFormValues>({
    resolver: zodResolver(scheduleInterviewSchema),
    defaultValues: { type: undefined, stage: currentStage, scheduledAt: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  /**
   * Reset on open so the dialog reflects the application as it is now — its
   * stage may have moved since this component mounted. Done here rather than in
   * an effect so the reset is part of opening.
   */
  const openDialog = () => {
    reset({ type: undefined, stage: currentStage, scheduledAt: '' });
    setFormError(null);
    setOpen(true);
  };

  const requestClose = () => {
    if (isSubmitting) {
      return;
    }

    setOpen(false);
  };

  const handleWriteError = (error: unknown) => {
    // 403 is handled globally: `apiFetch` has already redirected and rejected,
    // so this view is unmounting and a message here would flash over it.
    if (error instanceof ApiError && error.status === 403) {
      return;
    }

    const body = errorBodyOf(error);

    if (body?.code === 'APPLICATION_NOT_ACTIVE') {
      // Not a field error — nothing the recruiter typed is wrong, the
      // application is closed. Nothing to correct in the form, so it closes.
      setOpen(false);
      toast.error('This application is closed. Reopen it before scheduling.');
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      setOpen(false);
      toast.error('This application no longer exists.');
      return;
    }

    if (body?.code === 'VALIDATION_ERROR' && body.details) {
      // `details` is keyed by request-body field name, so a rule the client
      // missed still lands on the right input.
      for (const field of SERVER_FIELDS) {
        const message = fieldMessage(body.details, field);

        if (message) {
          setError(field, { type: 'server', message });
        }
      }
      return;
    }

    // The dialog stays open with everything chosen still in it.
    setFormError(GENERIC_ERROR_MESSAGE);
  };

  const onSubmit = async (values: ScheduleInterviewFormValues) => {
    setFormError(null);

    try {
      await createMutation.mutateAsync({
        applicationId,
        values: {
          type: values.type,
          stage: values.stage,
          // Blank becomes `null` — a round with no date yet, which is now an
          // ordinary thing to create. The local-to-UTC conversion lives in
          // `toScheduledAtInstant`, shared with the edit dialog so the two
          // cannot drift: `datetime-local` hands back a local wall-clock string
          // with no zone, and sending it raw would schedule every round in a
          // non-UTC browser at the wrong time.
          scheduledAt: toScheduledAtInstant(values.scheduledAt),
        },
      });

      setOpen(false);
      toast.success('Interview scheduled.');
    } catch (error) {
      handleWriteError(error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          openDialog();
          return;
        }

        requestClose();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <CalendarPlusIcon aria-hidden="true" />
        {triggerLabel}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>
            Add a round to this application. You can assign interviewers once it exists.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.type}>
              <FieldLabel htmlFor="interview-type" className="font-semibold">
                Type
              </FieldLabel>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    items={TYPE_OPTIONS}
                    value={field.value ?? null}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="interview-type" className="w-full">
                      <SelectValue placeholder="Choose an interview type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError className="text-xs" errors={errors.type ? [errors.type] : undefined} />
            </Field>

            <Field data-invalid={!!errors.stage}>
              <FieldLabel htmlFor="interview-stage" className="font-semibold">
                Stage
              </FieldLabel>
              <Controller
                control={control}
                name="stage"
                render={({ field }) => (
                  <Select
                    items={STAGE_OPTIONS}
                    value={field.value ?? null}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="interview-stage" className="w-full">
                      <SelectValue placeholder="Choose the stage this round is for" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                What the round is for. It does not have to match where the candidate is now.
              </p>
              <FieldError className="text-xs" errors={errors.stage ? [errors.stage] : undefined} />
            </Field>

            <Field data-invalid={!!errors.scheduledAt}>
              <FieldLabel htmlFor="interview-scheduled-at" className="font-semibold">
                Date and time <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              {/* No `min`: a past instant is a legitimate entry. */}
              <Input
                id="interview-scheduled-at"
                type="datetime-local"
                disabled={isSubmitting}
                aria-invalid={!!errors.scheduledAt}
                {...register('scheduledAt')}
              />
              <p className="text-xs text-muted-foreground">
                Leave it blank if the time is not agreed yet. You can set it from the round&rsquo;s
                page later.
              </p>
              <FieldError
                className="text-xs"
                errors={errors.scheduledAt ? [errors.scheduledAt] : undefined}
              />
            </Field>

            {formError && (
              <div role="alert" className="text-sm font-normal text-destructive">
                {formError}
              </div>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
