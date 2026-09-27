'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { PencilIcon } from 'lucide-react';

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
  contactDetailsSchema,
  type ContactDetailsFormValues,
  type ContactDetailsValues,
} from '@/lib/schemas/candidate';
import { useUpdateCandidateContact } from '../hooks/useCandidateMutations';
import type { CandidateContactPatch, RecruiterCandidate } from '../types';

/**
 * Editable contact fields for candidates (phone, location, headline).
 */
const EDITABLE_FIELDS = ['phone', 'location', 'headline'] as const;

interface ContactDetailsDialogProps {
  candidate: RecruiterCandidate;
}

/**
 * Dialog for editing candidate contact details (phone, location, and headline).
 * Displays name and email as read-only account metadata.
 */
export const ContactDetailsDialog: React.FC<ContactDetailsDialogProps> = ({ candidate }) => {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateCandidateContact();
  const isSubmitting = updateMutation.isPending;

  // A controlled `<Input>` cannot hold `null`, so the form works in strings and
  // the schema turns an emptied box back into `null` on submit.
  const defaults: ContactDetailsFormValues = {
    phone: candidate.profile.phone ?? '',
    location: candidate.profile.location ?? '',
    headline: candidate.profile.headline ?? '',
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
    // React-hook-form parses inputs via the zod schema transform so that empty string values
    // are converted to null before being passed to handleSubmit.
  } = useForm<ContactDetailsFormValues, unknown, ContactDetailsValues>({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: defaults,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // `useWatch` rather than `watch()` — `watch()` returns a new function every
  // render, which opts this component out of the React Compiler.
  const current = useWatch({ control }) as Partial<ContactDetailsFormValues>;

  /** Fields that differ from the current candidate profile. */
  const changed = EDITABLE_FIELDS.filter(
    (field) => (current[field] ?? '').trim() !== defaults[field],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Reset form to latest values when opened
      reset(defaults);
      setFormError(null);
      setOpen(true);
      return;
    }

    if (isSubmitting) {
      return;
    }

    setOpen(false);
  };

  const onSubmit = async (values: ContactDetailsValues) => {
    setFormError(null);

    // Send only modified fields in patch payload
    const patch: CandidateContactPatch = {};

    for (const field of changed) {
      patch[field] = values[field];
    }

    try {
      await updateMutation.mutateAsync({ candidateId: candidate.id, patch });
      // Mutation updates cache directly; close dialog upon success
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setOpen(false);
        toast.error('That candidate no longer exists.');
        return;
      }

      const body = errorBodyOf(error);

      // Map backend validation errors to form fields
      if (body?.code === 'VALIDATION_ERROR') {
        let matched = false;

        for (const field of EDITABLE_FIELDS) {
          const message = fieldMessage(body.details, field);

          if (message) {
            setError(field, { type: 'server', message });
            matched = true;
          }
        }

        if (!matched) {
          // Includes the API's whole-body rule, which it keys `_`.
          setFormError(fieldMessage(body.details, '_') ?? body.message);
        }
        return;
      }

      // A 500 and a network failure look the same to a recruiter.
      setFormError('Something went wrong. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon aria-hidden="true" />
        Edit contact details
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Edit contact details</DialogTitle>
          <DialogDescription>
            Recorded against this candidate and visible to recruiters only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {/* Read-only account fields managed by the candidate */}
            <div className="rounded-lg bg-muted px-3 py-2.5 text-sm">
              <dl className="grid gap-1.5 sm:grid-cols-[auto_1fr] sm:gap-x-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="break-words">{candidate.name}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{candidate.email}</dd>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Managed by the candidate&apos;s account.
              </p>
            </div>

            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="contact-phone" className="font-semibold">
                Phone
              </FieldLabel>
              <Input
                id="contact-phone"
                placeholder="+91 98765 43210"
                disabled={isSubmitting}
                aria-invalid={!!errors.phone}
                {...register('phone')}
              />
              <FieldError className="text-xs" errors={errors.phone ? [errors.phone] : undefined} />
            </Field>

            <Field data-invalid={!!errors.location}>
              <FieldLabel htmlFor="contact-location" className="font-semibold">
                Location
              </FieldLabel>
              <Input
                id="contact-location"
                placeholder="Ahmedabad, IN"
                disabled={isSubmitting}
                aria-invalid={!!errors.location}
                {...register('location')}
              />
              <FieldError
                className="text-xs"
                errors={errors.location ? [errors.location] : undefined}
              />
            </Field>

            <Field data-invalid={!!errors.headline}>
              <FieldLabel htmlFor="contact-headline" className="font-semibold">
                Headline
              </FieldLabel>
              <Input
                id="contact-headline"
                placeholder="Backend engineer, 6y"
                disabled={isSubmitting}
                aria-invalid={!!errors.headline}
                {...register('headline')}
              />
              <FieldError
                className="text-xs"
                errors={errors.headline ? [errors.headline] : undefined}
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
            {/* Disabled until at least one field has changed */}
            <Button type="submit" disabled={isSubmitting || changed.length === 0}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
