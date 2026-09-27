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
  /** Status of the interview round. */
  status: InterviewStatus;
}

/**
 * Section rendering the panel's feedback list alongside the feedback submission form.
 */
export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ interviewId, status }) => {
  const { user } = useAuth();
  const feedbackQuery = useFeedbackQuery(interviewId);
  const formRef = useRef<HTMLDivElement>(null);

  // Tracks if the round was cancelled during submission
  const [cancelledDuringSubmit, setCancelledDuringSubmit] = useState(false);

  const isCancelled = status === 'CANCELLED' || cancelledDuringSubmit;

  // Identify existing feedback authored by the current user
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
