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

/** Toggle role status (Open/Closed) with a confirmation dialog for closing. */
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
      // 403 is handled globally — this view is already unmounting.
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
          // Keep dialog open while the request is in flight.
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
