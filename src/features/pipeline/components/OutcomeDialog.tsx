'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import { outcomeSchema, type OutcomeValues } from '@/lib/schemas/pipeline';
import { useSetOutcome } from '../hooks/usePipelineMutations';
import type { OutcomeStatus } from '../types';

interface OutcomeDialogProps {
  applicationId: number;
  status: OutcomeStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Closing an application, hired or rejected (FR-5.3).
 *
 * **The reason is optional and has no minimum**, unlike the override's
 * (VAL-3, VAL-5). Rejecting at the defined end of a stage is not an exception
 * to the process — skipping one is, which is why only the override demands an
 * explanation. The label says **Optional** rather than leaving a recruiter to
 * work out whether Submit will let them through.
 *
 * Hiring gets the same dialog rather than firing straight from the menu: the
 * API takes an optional reason on both, and a confirmation step on a terminal,
 * irreversible action is worth one extra click. There is no un-hiring and no
 * un-rejecting in this POC.
 *
 * It does **not** move the stage, and says so: the API leaves `currentStage`
 * where it was on purpose, because "rejected at Screen" and "rejected at Offer"
 * are different outcomes.
 */
export const OutcomeDialog: React.FC<OutcomeDialogProps> = ({
  applicationId,
  status,
  open,
  onOpenChange,
}) => {
  const [formError, setFormError] = useState<string | null>(null);
  const outcomeMutation = useSetOutcome();
  const isSubmitting = outcomeMutation.isPending;

  const hiring = status === 'HIRED';

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OutcomeValues>({
    resolver: zodResolver(outcomeSchema),
    defaultValues: { status, reason: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      reset({ status, reason: '' });
      setFormError(null);
      onOpenChange(true);
      return;
    }

    if (isSubmitting) {
      return;
    }

    onOpenChange(false);
  };

  const onSubmit = async (values: OutcomeValues) => {
    setFormError(null);

    try {
      // An empty reason is not a reason: the api module omits the key rather
      // than sending `""`, so the audit metadata carries a reason or nothing.
      await outcomeMutation.mutateAsync({ applicationId, values: { ...values, status } });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      const body = errorBodyOf(error);

      if (body?.code === 'VALIDATION_ERROR') {
        const message = fieldMessage(body.details, 'reason');

        if (message) {
          setError('reason', { type: 'server', message });
          return;
        }

        setFormError(body.message);
        return;
      }

      // Every other failure has already raised its own toast from the mutation
      // — including `409 INVALID_STAGE_TRANSITION`, which is what a **Mark
      // hired** outside Offer earns if it is fired anyway (EC-07). Closing is
      // right for all of them: none is fixable by editing this form.
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>{hiring ? 'Mark as hired' : 'Mark as rejected'}</DialogTitle>
          <DialogDescription>
            {hiring
              ? 'This closes the application. It cannot be reopened.'
              : 'This closes the application at its current stage. It cannot be reopened.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.reason}>
              <FieldLabel htmlFor="outcome-reason" className="font-semibold">
                Reason <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="outcome-reason"
                rows={3}
                placeholder={hiring ? 'Accepted the offer on…' : 'Why this application is closing.'}
                disabled={isSubmitting}
                aria-invalid={!!errors.reason}
                {...register('reason')}
              />
              <FieldError
                className="text-xs"
                errors={errors.reason ? [errors.reason] : undefined}
              />
            </Field>

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
            <Button
              type="submit"
              variant={hiring ? 'default' : 'destructive'}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : hiring ? 'Mark as hired' : 'Mark as rejected'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
