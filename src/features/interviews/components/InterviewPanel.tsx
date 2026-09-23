'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserMinusIcon } from 'lucide-react';

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
import { useUnassignInterviewer } from '../hooks/useInterviewMutations';
import { AssignInterviewerDialog } from './AssignInterviewerDialog';
import type { InterviewAssignment } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface InterviewPanelProps {
  interviewId: number;
  assignments: Array<InterviewAssignment>;
}

/**
 * The panel on a recruiter's round detail: who is on it, and the two controls
 * that change that.
 *
 * **It stays usable on a cancelled or completed round**, unlike the status
 * actions. A round's history of who was meant to assess the candidate is worth
 * correcting after the fact, and the API allows it.
 *
 * The removal confirmation states **both** consequences, because both are true
 * and both are surprising: access goes immediately — the API re-evaluates
 * assignment on every request rather than trusting a token — and feedback the
 * person already submitted is kept, because it is a record of an assessment
 * that genuinely happened.
 */
export const InterviewPanel: React.FC<InterviewPanelProps> = ({ interviewId, assignments }) => {
  const [pendingRemoval, setPendingRemoval] = useState<InterviewAssignment | null>(null);
  const unassignMutation = useUnassignInterviewer();

  const isRemoving = unassignMutation.isPending;

  const confirmRemoval = async () => {
    if (pendingRemoval === null) {
      return;
    }

    const { name } = pendingRemoval.interviewer;

    try {
      await unassignMutation.mutateAsync({
        interviewId,
        userId: pendingRemoval.interviewer.id,
      });
      setPendingRemoval(null);
      toast.success(`${name} removed.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        // Somebody removed them first, or the round is gone. `onSettled` has
        // already invalidated, so the panel is about to correct itself.
        setPendingRemoval(null);
        toast.error('That interviewer is no longer on this round.');
        return;
      }

      toast.error(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Panel</h2>
        <AssignInterviewerDialog interviewId={interviewId} assignments={assignments} />
      </div>

      {assignments.length === 0 ? (
        // A warning tone, not a neutral one: a scheduled round with nobody on
        // it is the thing on this page a recruiter most needs to act on.
        <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-destructive">No interviewers assigned yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nobody can see this candidate or submit feedback until somebody is added.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {assignments.map((assignment) => (
            <li key={assignment.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="min-w-0 truncate text-sm font-medium">
                {assignment.interviewer.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setPendingRemoval(assignment)}
                disabled={isRemoving}
              >
                <UserMinusIcon aria-hidden="true" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(nextOpen) => {
          if (isRemoving || nextOpen) {
            return;
          }

          setPendingRemoval(null);
        }}
      >
        <DialogContent showCloseButton={!isRemoving}>
          <DialogHeader>
            <DialogTitle>
              Remove {pendingRemoval?.interviewer.name} from this interview?
            </DialogTitle>
            <DialogDescription>
              They will lose access to this candidate immediately. Feedback they have already
              submitted is kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemoval(null)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmRemoval()}
              disabled={isRemoving}
            >
              {isRemoving ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
