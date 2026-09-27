'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CalendarClockIcon } from 'lucide-react';

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
import { ApiError } from '@/lib/api';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import {
  editInterviewDateSchema,
  toLocalDateTimeValue,
  toScheduledAtInstant,
  type EditInterviewDateFormValues,
} from '@/lib/schemas/interview';
import { useUpdateInterview } from '../hooks/useInterviewMutations';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface EditInterviewDateDialogProps {
  interviewId: number;
  scheduledAt: string | null;
}

/** Dialog for setting or rescheduling an interview round date and time. */
export const EditInterviewDateDialog: React.FC<EditInterviewDateDialogProps> = ({
  interviewId,
  scheduledAt,
}) => {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateInterview();
  const isSubmitting = updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EditInterviewDateFormValues>({
    resolver: zodResolver(editInterviewDateSchema),
    defaultValues: { scheduledAt: toLocalDateTimeValue(scheduledAt) },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  /**
   * Reset on open so the field reflects the round as it is now — somebody may
   * have changed the date since this component mounted. Done here rather than in
   * an effect so the reset is part of opening.
   */
  const openDialog = () => {
    reset({ scheduledAt: toLocalDateTimeValue(scheduledAt) });
    setFormError(null);
    setOpen(true);
  };

  const requestClose = () => {
    if (isSubmitting) {
      return;
    }

    setOpen(false);
  };

  const onSubmit = async (values: EditInterviewDateFormValues) => {
    setFormError(null);

    try {
      await updateMutation.mutateAsync({
        interviewId,
        // Always present, and `null` when blank — the key being absent would
        // mean "leave it alone", which is a different request.
        scheduledAt: toScheduledAtInstant(values.scheduledAt),
      });

      setOpen(false);
      toast.success(values.scheduledAt === '' ? 'Date cleared.' : 'Interview date updated.');
    } catch (error) {
      // 403 is handled globally: `apiFetch` has already redirected and rejected,
      // so this view is unmounting and a message here would flash over it.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      const body = errorBodyOf(error);

      if (body?.code === 'INVALID_STAGE_TRANSITION') {
        // The round was completed or cancelled first. Nothing in the form is
        // wrong, so it closes rather than showing a field error.
        setOpen(false);
        toast.error('This interview is already closed, so its date cannot change.');
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setOpen(false);
        toast.error('This interview no longer exists.');
        return;
      }

      if (body?.code === 'VALIDATION_ERROR' && body.details) {
        const message = fieldMessage(body.details, 'scheduledAt');

        if (message) {
          setError('scheduledAt', { type: 'server', message });
          return;
        }
      }

      // The dialog stays open with the value still in it.
      setFormError(GENERIC_ERROR_MESSAGE);
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <CalendarClockIcon aria-hidden="true" />
        {scheduledAt === null ? 'Set date' : 'Edit date'}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>{scheduledAt === null ? 'Set the date' : 'Edit the date'}</DialogTitle>
          <DialogDescription>
            Leave it blank to put this round back to “no date yet”. A past date is fine —
            backfilling a round that already happened is a normal thing to do.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.scheduledAt}>
              <FieldLabel htmlFor="edit-scheduled-at" className="font-semibold">
                Date and time
              </FieldLabel>
              {/* No `min`: a past instant is a legitimate entry. */}
              <Input
                id="edit-scheduled-at"
                type="datetime-local"
                disabled={isSubmitting}
                aria-invalid={!!errors.scheduledAt}
                {...register('scheduledAt')}
              />
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
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
