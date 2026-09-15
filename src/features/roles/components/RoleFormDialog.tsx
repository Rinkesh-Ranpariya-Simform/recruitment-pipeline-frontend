'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { PencilIcon, PlusIcon } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { errorBodyOf, fieldMessage } from '@/lib/error-details';
import { roleCreateSchema, roleEditSchema, type RoleCreateValues } from '@/lib/schemas/role';
import { useCreateRole, useUpdateRole } from '../hooks/useRoleMutations';
import type { RolePatch } from '../api/roles.api';
import type { Role } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** Description is capped at 5,000; the counter appears only as that gets close. */
const DESCRIPTION_LIMIT = 5000;
const COUNTER_THRESHOLD = 4500;

/** The only fields a server validation error can be mapped onto. */
const SERVER_FIELDS = ['title', 'description'] as const;

type RoleFormDialogProps =
  | { mode: 'create'; role?: never; onNotFound?: never }
  | { mode: 'edit'; role: Role; onNotFound?: () => void };

/**
 * Create and edit in one component. The modes differ only in their default
 * values, submit label, which mutation they call, and what happens on success —
 * not enough to justify two dialogs that would drift apart.
 *
 * Neither mode has a status control: a new role is always `OPEN`, and closing
 * one is a separate action with its own confirmation.
 */
export function RoleFormDialog({ mode, role, onNotFound }: RoleFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const isCreate = mode === 'create';
  const isSubmitting = isCreate ? createMutation.isPending : updateMutation.isPending;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<RoleCreateValues>({
    resolver: zodResolver(isCreate ? roleCreateSchema : roleEditSchema),
    defaultValues: { title: role?.title ?? '', description: role?.description ?? '' },
    // Validate on submit, then re-validate as the user corrects, same as the
    // login form.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  /**
   * Reset on open so the form shows the role as it is now — another recruiter's
   * edit may have landed since this component mounted. Done here rather than in
   * an effect so the reset is part of opening the dialog.
   */
  const openDialog = () => {
    reset({ title: role?.title ?? '', description: role?.description ?? '' });
    setFormError(null);
    setOpen(true);
  };

  // `useWatch` rather than `watch()` — `watch()` returns a new function every
  // render, which opts this component out of the React Compiler.
  const descriptionLength = useWatch({ control, name: 'description' })?.length ?? 0;

  /**
   * A close request the dialog can refuse: it stays open while a write is in
   * flight, and asks before discarding unsaved text.
   */
  const requestClose = () => {
    if (isSubmitting) {
      return;
    }

    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }

    setOpen(false);
  };

  /** Maps a failed write onto the form. Never rethrows. */
  const handleWriteError = (error: unknown) => {
    // 403 is handled globally: `apiFetch` has already redirected to /forbidden
    // and then rejected, so this view is unmounting. A form error set here would
    // flash over the 403 page.
    if (error instanceof ApiError && error.status === 403) {
      return;
    }

    const body = errorBodyOf(error);

    // The role went away while the dialog was open. Close it and let the detail
    // view show the not-found state.
    if (error instanceof ApiError && error.status === 404) {
      setOpen(false);
      onNotFound?.();
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

    // A 500 and a network failure look the same to the user. The dialog stays
    // open with everything they typed still in it.
    setFormError(GENERIC_ERROR_MESSAGE);
  };

  const onSubmit = async (values: RoleCreateValues) => {
    setFormError(null);

    try {
      if (isCreate) {
        const { role: created } = await createMutation.mutateAsync(values);
        setOpen(false);
        // To the new role, not back to the list — on a list filtered to Closed
        // the new role wouldn't even appear.
        router.push(`/roles/${created.id}`);
        return;
      }

      // Send only what changed. `dirtyFields` decides rather than a value
      // comparison, so typing a character and deleting it again isn't a change.
      const patch: RolePatch = {};

      if (dirtyFields.title) {
        patch.title = values.title;
      }

      if (dirtyFields.description) {
        patch.description = values.description;
      }

      if (Object.keys(patch).length === 0) {
        // Nothing changed, and the server rejects an empty patch — just close.
        setOpen(false);
        return;
      }

      await updateMutation.mutateAsync({ roleId: role.id, patch });
      setOpen(false);
    } catch (error) {
      handleWriteError(error);
    }
  };

  return (
    <>
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
        <DialogTrigger
          render={isCreate ? <Button size="sm" /> : <Button variant="outline" size="sm" />}
        >
          {isCreate ? <PlusIcon aria-hidden="true" /> : <PencilIcon aria-hidden="true" />}
          {isCreate ? 'New role' : 'Edit'}
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg" showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>{isCreate ? 'New role' : 'Edit role'}</DialogTitle>
            <DialogDescription>
              {isCreate
                ? 'Open a requisition the team can see.'
                : 'Update this requisition’s title or description.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="role-title" className="font-semibold">
                  Title
                </FieldLabel>
                <Input
                  id="role-title"
                  placeholder="Senior Backend Engineer"
                  autoComplete="off"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'role-title-error' : undefined}
                  {...register('title')}
                />
                <FieldError
                  id="role-title-error"
                  className="text-xs"
                  errors={errors.title ? [errors.title] : undefined}
                />
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="role-description" className="font-semibold">
                  Description
                </FieldLabel>
                <Textarea
                  id="role-description"
                  rows={6}
                  placeholder="What the role is for, and what you're looking for."
                  disabled={isSubmitting}
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'role-description-error' : undefined}
                  {...register('description')}
                />
                {/* Hidden until the limit is near, so it doesn't nag someone
                    writing two sentences. */}
                {descriptionLength > COUNTER_THRESHOLD && (
                  <p className="text-right text-xs text-muted-foreground" aria-live="polite">
                    {descriptionLength} / {DESCRIPTION_LIMIT}
                  </p>
                )}
                <FieldError
                  id="role-description-error"
                  className="text-xs"
                  errors={errors.description ? [errors.description] : undefined}
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
                onClick={requestClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isCreate
                    ? 'Creating…'
                    : 'Saving…'
                  : isCreate
                    ? 'Create role'
                    : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nothing is drafted to storage, so a discarded form is gone for good. */}
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              Your changes to this role haven&apos;t been saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false);
                setOpen(false);
              }}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
