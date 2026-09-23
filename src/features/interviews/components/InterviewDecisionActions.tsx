'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';

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
import { errorBodyOf } from '@/lib/error-details';
import { PIPELINE_STAGE_LABELS } from '@/features/pipeline/labels';
import { useRecordInterviewDecision } from '../hooks/useInterviewMutations';
import { interviewTypeLabel } from '../labels';
import type { RecruiterInterview } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * **Select / Reject** — the verdict at one round, at the top of its page
 * (applications FR-3).
 *
 * Green for select, red for reject, and both behind a confirmation, because
 * **neither can be undone**: a decision is written once and a second attempt is
 * `409 DECISION_ALREADY_RECORDED`. Undoing one is a stage override, with a
 * recorded reason — which is deliberately a heavier action than clicking the
 * other button would be.
 *
 * The confirmation copy says what each does to the *application*, not to the
 * round, because that is the part a recruiter cannot see from here and the part
 * they would regret: Select advances the candidate to this round's stage, and
 * Reject closes their application outright.
 *
 * ## What is offered, and what actually decides
 *
 * The pair renders only while the round is `SCHEDULED`, has no verdict, and sits
 * on a live application. **That is an affordance.** The API refuses each of
 * those cases with its own `409` — `DECISION_ALREADY_RECORDED`,
 * `INTERVIEW_CANCELLED`, `APPLICATION_NOT_ACTIVE` — and each is handled below,
 * because the row can go stale in another tab between render and click.
 */

interface InterviewDecisionActionsProps {
  interview: RecruiterInterview;
}

type PendingDecision = 'SELECTED' | 'REJECTED' | null;

export const InterviewDecisionActions: React.FC<InterviewDecisionActionsProps> = ({
  interview,
}) => {
  const [pending, setPending] = useState<PendingDecision>(null);
  const decisionMutation = useRecordInterviewDecision();

  const isSubmitting = decisionMutation.isPending;
  const stageLabel =
    PIPELINE_STAGE_LABELS[interview.stage] ?? (interview.stage as unknown as string);

  const decide = async (decision: 'SELECTED' | 'REJECTED') => {
    try {
      await decisionMutation.mutateAsync({ interviewId: interview.id, decision });
      setPending(null);
      toast.success(
        decision === 'SELECTED'
          ? `${interview.application.candidate.name} moved forward.`
          : `${interview.application.candidate.name} was not selected.`,
      );
    } catch (error) {
      // 403 is handled globally: `apiFetch` has already redirected and rejected,
      // so this view is unmounting and a message here would flash over it.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      const body = errorBodyOf(error);
      setPending(null);

      if (body?.code === 'DECISION_ALREADY_RECORDED') {
        // `onSettled` has already invalidated, so these buttons are about to
        // disappear on their own and be replaced by the recorded verdict.
        toast.error('A decision was already recorded for this interview.');
        return;
      }

      if (body?.code === 'INVALID_STAGE_TRANSITION') {
        // The one refusal a recruiter can act on, so it names the way through
        // rather than just reporting the wall.
        toast.error(
          `Moving this candidate to ${stageLabel} would skip a stage. Use a stage override on the pipeline board, which records why.`,
        );
        return;
      }

      if (body?.code === 'APPLICATION_NOT_ACTIVE') {
        toast.error('This application is already closed.');
        return;
      }

      if (body?.code === 'INTERVIEW_CANCELLED') {
        toast.error('This interview was cancelled, so there is nothing to decide.');
        return;
      }

      if (body?.code === 'STAGE_CONFLICT') {
        toast.error('Somebody else moved this candidate. Reload and try again.');
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        toast.error('This interview no longer exists.');
        return;
      }

      toast.error(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/40"
          onClick={() => setPending('SELECTED')}
          disabled={isSubmitting}
        >
          <ThumbsUpIcon aria-hidden="true" />
          Select
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setPending('REJECTED')}
          disabled={isSubmitting}
        >
          <ThumbsDownIcon aria-hidden="true" />
          Reject
        </Button>
      </div>

      <Dialog
        open={pending !== null}
        onOpenChange={(nextOpen) => {
          if (isSubmitting) {
            return;
          }

          if (!nextOpen) {
            setPending(null);
          }
        }}
      >
        <DialogContent showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>
              {pending === 'SELECTED'
                ? `Move ${interview.application.candidate.name} forward?`
                : `Reject ${interview.application.candidate.name}?`}
            </DialogTitle>
            <DialogDescription>
              {pending === 'SELECTED' ? (
                <>
                  This marks the {interviewTypeLabel(interview.type).toLowerCase()} round as passed
                  and moves the application to <strong>{stageLabel}</strong> if it is not there
                  already. It cannot be undone — reversing it needs a stage override with a recorded
                  reason.
                </>
              ) : (
                <>
                  This marks the {interviewTypeLabel(interview.type).toLowerCase()} round as failed
                  and <strong>closes the application</strong>. The candidate stays recorded at{' '}
                  {PIPELINE_STAGE_LABELS[interview.application.currentStage] ??
                    interview.application.currentStage}
                  , so it is clear how far they got. It cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            {pending === 'SELECTED' ? (
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => void decide('SELECTED')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Recording…' : 'Select'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => void decide('REJECTED')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Recording…' : 'Reject'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
