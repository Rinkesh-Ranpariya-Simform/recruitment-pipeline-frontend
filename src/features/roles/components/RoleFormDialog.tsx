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

/** Shared dialog for creating and editing roles. */
export const RoleFormDialog: React.FC<RoleFormDialogProps> = ({ mode, role, onNotFound }) => {
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
    // Validate on submit, then re-validate on change.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  /** Reset form to latest role data when dialog opens. */
  const openDialog = () => {
    reset({ title: role?.title ?? '', description: role?.description ?? '' });
    setFormError(null);
    setOpen(true);
  };

  // useWatch is more React Compiler friendly than watch().
  const descriptionLength = useWatch({ control, name: 'description' })?.length ?? 0;

  /** Handles close — blocks during submission, prompts if there are unsaved changes. */
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

  /** Maps API errors to form fields. */
  const handleWriteError = (error: unknown) => {
    // 403 is handled globally — this view is already unmounting.
    if (error instanceof ApiError && error.status === 403) {
      return;
    }

    const body = errorBodyOf(error);

    // Role was deleted — close dialog and show not-found.
    if (error instanceof ApiError && error.status === 404) {
      setOpen(false);
      onNotFound?.();
      return;
    }

    if (body?.code === 'VALIDATION_ERROR' && body.details) {
      // Map server validation errors to the matching form fields.
      for (const field of SERVER_FIELDS) {
        const message = fieldMessage(body.details, field);

        if (message) {
          setError(field, { type: 'server', message });
        }
      }
      return;
    }

    // Show generic error — dialog stays open to preserve user input.
    setFormError(GENERIC_ERROR_MESSAGE);
  };

  const onSubmit = async (values: RoleCreateValues) => {
    setFormError(null);

    try {
      if (isCreate) {
        const { role: created } = await createMutation.mutateAsync(values);
        setOpen(false);
        // Navigate to the newly created role.
        router.push(`/roles/${created.id}`);
        return;
      }

      // Send only changed fields in the patch.
      const patch: RolePatch = {};

      if (dirtyFields.title) {
        patch.title = values.title;
      }

      if (dirtyFields.description) {
        patch.description = values.description;
      }

      if (Object.keys(patch).length === 0) {
        // Nothing changed — just close the dialog.
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
                {/* Character counter, shown only near the limit. */}
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

      {/* Confirm dialog for discarding unsaved changes. */}
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
};
