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

/** Error message when the role was reopened by someone else. */
const REOPENED_ERROR_MESSAGE =
  'This role is open again — it must be closed before it can be deleted.';

interface RoleDeleteActionProps {
  role: Role;
  onDeleted: () => void;
  onNotFound?: () => void;
}

/** Delete role button (only shown for closed roles). Requires confirmation. */
export const RoleDeleteAction: React.FC<RoleDeleteActionProps> = ({
  role,
  onDeleted,
  onNotFound,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteMutation = useDeleteRole();

  const isSubmitting = deleteMutation.isPending;

  // Only closed roles can be deleted.
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
      // 403 is handled globally — this view is already unmounting.
      if (thrown instanceof ApiError && thrown.status === 403) {
        return;
      }

      // Already deleted — close dialog and show not-found.
      if (thrown instanceof ApiError && thrown.status === 404) {
        setConfirmOpen(false);
        onNotFound?.();
        return;
      }

      // Role was reopened — show error, dialog stays open.
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
          // Keep dialog open while delete request is in flight.
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
};
