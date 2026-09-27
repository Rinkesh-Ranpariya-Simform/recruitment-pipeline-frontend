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

/** Confirmation dialog for closing an application as Hired or Rejected with an optional note. */
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
      // Only send reason if non-empty.
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

      // Non-validation errors are reported via toast from the mutation.
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
