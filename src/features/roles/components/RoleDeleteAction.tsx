'use client';

import { useState } from 'react';
import { Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api';
import { useDeleteRole } from '../hooks/useRoleMutations';
import type { Role } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Shown when the server refuses the delete with `409 ROLE_NOT_CLOSED` — the
 * role was reopened elsewhere after this page loaded. Retrying can't help, so
 * the copy names the remedy instead.
 */
const REOPENED_ERROR_MESSAGE =
  'This role is open again — it must be closed before it can be deleted.';

/**
 * Delete role — the only irreversible action in the app.
 *
 * Renders only for a `CLOSED` role, mirroring the server's rule: deleting a
 * requisition takes two deliberate steps, close then delete. The server still
 * answers `DELETE` on an open role with a 409 regardless of what this renders.
 *
 * The confirmation names the role and says the action can't be undone. Unlike
 * the close dialog, there's no "you can undo this later" to offer.
 */
export function RoleDeleteAction({
  role,
  onDeleted,
  onNotFound,
}: {
  role: Role;
  onDeleted: () => void;
  onNotFound?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteMutation = useDeleteRole();

  const isSubmitting = deleteMutation.isPending;

  // An open role offers no delete — the recruiter closes it first, using the
  // control next to this one.
  if (role.status !== 'CLOSED') {
    return null;
  }

  const run = async () => {
    setError(null);

    try {
      await deleteMutation.mutateAsync(role.id);
      setConfirmOpen(false);
      onDeleted();
    } catch (thrown) {
      // `apiFetch` has already redirected to /forbidden and then rejected, so
      // this view is unmounting — an error rendered here would only flash.
      if (thrown instanceof ApiError && thrown.status === 403) {
        return;
      }

      // Already deleted by someone else. The user got the outcome they asked
      // for, so close the dialog and let the detail view show not-found.
      if (thrown instanceof ApiError && thrown.status === 404) {
        setConfirmOpen(false);
        onNotFound?.();
        return;
      }

      // Reopened elsewhere. The dialog stays open because the user can act on
      // this.
      if (thrown instanceof ApiError && thrown.status === 409) {
        setError(REOPENED_ERROR_MESSAGE);
        return;
      }

      setError(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
      >
        <Trash2Icon aria-hidden="true" />
        Delete role
      </Button>

      <Dialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => {
          // Not dismissable mid-request: the DELETE is already on its way, and
          // a dialog closing while it lands would read as "cancelled".
          if (!nextOpen && isSubmitting) {
            return;
          }

          setConfirmOpen(nextOpen);
        }}
      >
        <DialogContent showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>Delete this role?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{role.title}</span> will be permanently
              deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div role="alert" className="text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isSubmitting} onClick={() => void run()}>
              {isSubmitting ? 'Deleting…' : 'Delete role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
