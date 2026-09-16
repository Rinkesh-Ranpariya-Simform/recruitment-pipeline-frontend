'use client';

import { useState } from 'react';
import { LockIcon, RotateCcwIcon } from 'lucide-react';

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
import { useUpdateRole } from '../hooks/useRoleMutations';
import type { Role } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface RoleStatusActionProps {
  role: Role;
  onNotFound?: () => void;
}

/**
 * Close role / Reopen role. Sends `{ status }` and nothing else.
 *
 * Closing asks for confirmation and names the role, because it takes a
 * requisition out of circulation. Reopening doesn't — it's easily undone by
 * closing again.
 */
export const RoleStatusAction: React.FC<RoleStatusActionProps> = ({ role, onNotFound }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateMutation = useUpdateRole();

  const isOpen = role.status === 'OPEN';
  const isSubmitting = updateMutation.isPending;

  const run = async (status: Role['status']) => {
    setError(null);

    try {
      await updateMutation.mutateAsync({ roleId: role.id, patch: { status } });
      setConfirmOpen(false);
    } catch (thrown) {
      // `apiFetch` has already redirected to /forbidden and then rejected, so
      // this view is unmounting — an error rendered here would only flash.
      if (thrown instanceof ApiError && thrown.status === 403) {
        return;
      }

      if (thrown instanceof ApiError && thrown.status === 404) {
        setConfirmOpen(false);
        onNotFound?.();
        return;
      }

      setError(GENERIC_ERROR_MESSAGE);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void run('OPEN')}
        >
          <RotateCcwIcon aria-hidden="true" />
          {isSubmitting ? 'Reopening…' : 'Reopen role'}
        </Button>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
      >
        <LockIcon aria-hidden="true" />
        Close role
      </Button>

      <Dialog
        open={confirmOpen}
        onOpenChange={(nextOpen) => {
          // Not dismissable mid-request: the PATCH is already on its way, and a
          // dialog closing while it lands would read as "cancelled".
          if (!nextOpen && isSubmitting) {
            return;
          }

          setConfirmOpen(nextOpen);
        }}
      >
        <DialogContent showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>Close this role?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{role.title}</span> will be marked
              closed. You can reopen it later.
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
            <Button
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => void run('CLOSED')}
            >
              {isSubmitting ? 'Closing…' : 'Close role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
