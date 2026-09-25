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
 * The three editable fields, in the order the dialog shows them — and the only
 * three this surface owns (XBE-4, FR-11.5).
 *
 * It drives the changed-field diff, the patch it builds and the server-error
 * mapping, so "which fields exist here" is written once. There is no `name` and
 * no `email` in it, and adding one would not make them editable: the API drops
 * both.
 */
const EDITABLE_FIELDS = ['phone', 'location', 'headline'] as const;

interface ContactDetailsDialogProps {
  candidate: RecruiterCandidate;
}

/**
 * Recording a candidate's phone, location and headline (FR-8).
 *
 * Three things about it are not decoration:
 *
 * - **Name and email are shown read-only, with the reason** (FR-8.2, D-4,
 *   XBE-4, AC-F23). Omitting them would leave a recruiter wondering where they
 *   went; offering them as inputs would be worse, because the API **drops**
 *   them from a body that carries them and answers `200` — a form that submitted
 *   them would appear to succeed while changing nothing. Rendering them
 *   read-only is honest about which fields this surface owns. **It is UX; the
 *   API's dropping is the control** (AZ-7, AC-M05).
 * - **Only what changed is sent, and an emptied field is sent as `null`**
 *   (FR-8.3, VAL-2, API-5, EC-08, AC-F27). The API distinguishes `null`
 *   ("remove this") from an omitted key ("leave it alone"), so a recruiter
 *   editing the location cannot wipe a phone number they never touched. The
 *   `""` → `null` transform lives in the schema, so it cannot be forgotten here.
 * - **Submit is disabled until something differs** (FR-8.4, EC-09, AC-F24). An
 *   empty patch is a `400` keyed `_` at the API; this makes it unreachable
 *   rather than letting a recruiter earn an error the client could predict.
 *
 * A failed request **never discards what was typed** (ERR-1, FR-8.6): a `400`
 * renders under the field with the values intact. The one exception is a `404`
 * — the candidate is gone, so there is no field to attach anything to and
 * nothing left to save.
 *
 * Nothing is drafted to storage, not even an unsent number (DM-2, SEC-4). It is
 * a candidate's contact detail on a possibly shared machine, and it belongs on
 * the server or nowhere.
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
    // Three type parameters, and the third is the point: react-hook-form runs
    // the resolver's TRANSFORM, so `handleSubmit` receives the schema's OUTPUT
    // — each field already `string | null`. That is where `""` has become the
    // explicit `null` that clears a value (VAL-2, XBE-5b), and declaring it
    // here means the submit handler cannot forget to parse.
  } = useForm<ContactDetailsFormValues, unknown, ContactDetailsValues>({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: defaults,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // `useWatch` rather than `watch()` — `watch()` returns a new function every
  // render, which opts this component out of the React Compiler.
  const current = useWatch({ control }) as Partial<ContactDetailsFormValues>;

  /** Which fields differ from what the server currently holds (FR-8.4). */
  const changed = EDITABLE_FIELDS.filter(
    (field) => (current[field] ?? '').trim() !== defaults[field],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Reset on open so a dialog reopened after a failure starts from what the
      // server now actually holds.
      reset(defaults);
      setFormError(null);
      setOpen(true);
      return;
    }

    // It stays open while a write is in flight — closing it would leave the
    // recruiter unsure whether the edit landed.
    if (isSubmitting) {
      return;
    }

    setOpen(false);
  };

  const onSubmit = async (values: ContactDetailsValues) => {
    setFormError(null);

    // **Only what changed.** An untouched key is absent, which the API reads as
    // "leave it alone" (FR-8.3, API-5) — so editing the location cannot wipe a
    // phone number this recruiter never touched.
    const patch: CandidateContactPatch = {};

    for (const field of changed) {
      patch[field] = values[field];
    }

    try {
      await updateMutation.mutateAsync({ candidateId: candidate.id, patch });
      // The mutation has already written the server's response into the detail
      // cache and raised the toast, so there is nothing to refetch (FR-8.5,
      // PERF-4, AC-F26).
      setOpen(false);
    } catch (error) {
      // 403 is handled globally: `apiFetch` has already redirected to
      // /forbidden and this view is unmounting, so anything set here would
      // flash over the page the recruiter is being sent to.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        // Nothing left to edit. The list is invalidated so the row goes too.
        setOpen(false);
        toast.error('That candidate no longer exists.');
        return;
      }

      const body = errorBodyOf(error);

      // `details` is keyed by request-body field name, so a rule the client
      // missed still lands on the right input — and the dialog stays open with
      // everything typed still in it (FR-8.6, ERR-1).
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
            {/* Read-only, and the note says why (FR-8.2, AC-F23). Rendered as
                text rather than as disabled inputs: a disabled input is still an
                input, and this surface does not own these two fields at all. */}
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
              {/* `type="text"`, not `type="tel"`: no format is enforced on
                  either side, and a numeric keypad would be wrong for a number
                  typed with a country code and spaces (VAL-1). */}
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
            {/* Disabled until something differs (FR-8.4, EC-09). */}
            <Button type="submit" disabled={isSubmitting || changed.length === 0}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
