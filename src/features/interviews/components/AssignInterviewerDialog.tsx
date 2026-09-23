'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon } from 'lucide-react';

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
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api';
import { errorBodyOf } from '@/lib/error-details';
import { useAssignInterviewer } from '../hooks/useInterviewMutations';
import { useInterviewersQuery } from '../hooks/useInterviewersQuery';
import type { InterviewAssignment } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface AssignInterviewerDialogProps {
  interviewId: number;
  /** The current panel, used only to disable options that would conflict. */
  assignments: Array<InterviewAssignment>;
}

/**
 * Adds one interviewer to a round.
 *
 * **The picker's disabled options are a convenience; the API's `409` is the
 * check.** Somebody assigned from another tab still appears selectable here
 * until this page refetches, and choosing them gets the conflict — which is
 * then surfaced and the view corrected. That is the intended path, not a bug:
 * a client cannot hold a lock on a panel.
 *
 * `GET /api/users` is fetched **only while this dialog is open**, so a recruiter
 * who never assigns anybody never requests the list at all.
 */
export const AssignInterviewerDialog: React.FC<AssignInterviewerDialogProps> = ({
  interviewId,
  assignments,
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const interviewersQuery = useInterviewersQuery(open);
  const assignMutation = useAssignInterviewer();

  const isSubmitting = assignMutation.isPending;

  /** Ids already on the panel — recomputed only when either list changes. */
  const assignedIds = useMemo(() => {
    return new Set(assignments.map((assignment) => assignment.interviewer.id));
  }, [assignments]);

  // `?? []` inside the memo, not outside it: a fresh literal on every render
  // would make `options` recompute every time and defeat the memo entirely.
  const interviewers = interviewersQuery.data?.users;

  const options = useMemo(() => {
    return (interviewers ?? []).map((interviewer) => ({
      value: String(interviewer.id),
      label: assignedIds.has(interviewer.id)
        ? `${interviewer.name} — already assigned`
        : interviewer.name,
      disabled: assignedIds.has(interviewer.id),
    }));
  }, [interviewers, assignedIds]);

  const isLoadingList = open && interviewersQuery.isPending;
  const hasNobody = !isLoadingList && !interviewersQuery.isError && options.length === 0;

  const placeholder = isLoadingList
    ? 'Loading interviewers…'
    : interviewersQuery.isError
      ? 'Could not load interviewers'
      : hasNobody
        ? 'No interviewer accounts exist yet.'
        : 'Choose an interviewer';

  const onSubmit = async () => {
    if (selected === null) {
      return;
    }

    const interviewerId = Number(selected);
    const chosen = interviewers?.find((interviewer) => interviewer.id === interviewerId);

    try {
      await assignMutation.mutateAsync({ interviewId, interviewerId });
      setOpen(false);
      setSelected(null);
      toast.success(`${chosen?.name ?? 'Interviewer'} assigned.`);
    } catch (error) {
      // 403 is handled globally: `apiFetch` has already redirected and then
      // rejected, so this view is unmounting and a toast would flash over it.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      const code = errorBodyOf(error)?.code;

      if (code === 'ALREADY_ASSIGNED') {
        // The mutation's `onSettled` has already invalidated the detail, so the
        // option that was evidently stale is about to be disabled correctly.
        setOpen(false);
        setSelected(null);
        toast.error('That interviewer is already on this round.');
        return;
      }

      if (code === 'NOT_AN_INTERVIEWER') {
        // Unreachable through this picker, whose source returns interviewers
        // only — which is exactly why it is handled.
        toast.error('That user cannot be assigned as an interviewer.');
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setOpen(false);
        toast.error('This interview no longer exists.');
        return;
      }

      // The dialog stays open with the selection intact: a failed request must
      // not discard what the recruiter chose.
      toast.error(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Refuses to close mid-write, so a request cannot outlive its dialog.
        if (isSubmitting) {
          return;
        }

        setSelected(null);
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlusIcon aria-hidden="true" />
        Assign interviewer
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Assign interviewer</DialogTitle>
          <DialogDescription>
            They will be able to see this candidate and this round.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="assign-interviewer" className="font-semibold">
            Interviewer
          </FieldLabel>
          <Select
            items={options}
            value={selected}
            onValueChange={(value) => setSelected(value)}
            disabled={isSubmitting || isLoadingList || hasNobody || interviewersQuery.isError}
          >
            <SelectTrigger id="assign-interviewer" className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting || !selected}
          >
            {isSubmitting ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
