'use client';

import { useRef, useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { InterviewStatus } from '@/features/interviews/types';
import { useFeedbackQuery } from '../hooks/useFeedbackQuery';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackList } from './FeedbackList';

interface FeedbackSectionProps {
  interviewId: number;
  /** The round's own status. Drives the cancelled case only (FR-3.10). */
  status: InterviewStatus;
}

/**
 * The interviewer's half of this feature: the panel, then their own form
 * (FR-1.1).
 *
 * **The list is above the form, deliberately** (FR-3.1, D-4). The brief opens by
 * naming the problem this order solves — _"Interviewers can't see prior feedback
 * before their round"_ — so colleagues' notes are read on the way to the form
 * rather than found after submitting. The anchoring risk that creates is an
 * accepted, named gap.
 *
 * **This component performs no assignment check, and must not gain one** (AZ-2,
 * SEC-3). It never renders for an unassigned interviewer, because
 * `GET /api/interviews/:id` already answered `404` and the whole page is the
 * not-found view by then. A second check here would be a second place for the
 * rule to rot, and it would be the copy that leaked what the API withheld.
 *
 * Create-or-edit mode is **derived** from the fetched list plus the signed-in
 * id, never stored (DM-3). That is what makes the `409` recovery work: the
 * mutation's `onSettled` invalidation refetches, the entry appears, and the form
 * is an edit form on the next render with no flag to set and nothing to keep in
 * step.
 */
export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ interviewId, status }) => {
  const { user } = useAuth();
  const feedbackQuery = useFeedbackQuery(interviewId);
  const formRef = useRef<HTMLDivElement>(null);

  // A round cancelled *while this page was open*, learnt from a `409` rather
  // than from the payload the page loaded with (EC-08). Local, because it
  // describes this tab's discovery; the detail query refetches alongside and
  // `status` catches up on its own.
  const [cancelledDuringSubmit, setCancelledDuringSubmit] = useState(false);

  const isCancelled = status === 'CANCELLED' || cancelledDuringSubmit;

  // **A display decision** — which of the fetched entries is the signed-in
  // interviewer's — and never an authorization one (FR-2.3, FR-6.2). The API
  // resolves the row a `PATCH` touches from the token, in its own `where`.
  const existing =
    feedbackQuery.data?.feedback.find((entry) => entry.interviewer.id === user?.id) ?? null;

  const focusForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    formRef.current?.querySelector('textarea')?.focus();
  };

  return (
    <section className="flex flex-col gap-6 border-t pt-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Feedback</h2>
        <FeedbackList interviewId={interviewId} editable onEdit={focusForm} />
      </div>

      <Separator />

      <div ref={formRef} className="flex flex-col gap-4">
        {isCancelled ? (
          <p className="text-sm text-muted-foreground">
            This interview was cancelled. Feedback can no longer be submitted.
          </p>
        ) : (
          <>
            <h3 className="text-sm font-semibold">
              {existing === null ? 'Your feedback' : 'Edit your feedback'}
            </h3>
            <FeedbackForm
              interviewId={interviewId}
              existing={existing}
              onCancelled={() => setCancelledDuringSubmit(true)}
            />
          </>
        )}
      </div>
    </section>
  );
};
