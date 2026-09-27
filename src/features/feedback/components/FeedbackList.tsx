'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFeedbackQuery } from '../hooks/useFeedbackQuery';
import { FeedbackCard } from './FeedbackCard';
import type { Feedback } from '../types';

/** Two cards' worth, shaped like the list rather than a spinner. */
const ListSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
};

interface FeedbackListProps {
  interviewId: number;
  /** Whether the current user can edit feedback on this round. */
  editable: boolean;
  /** Optional preloaded feedback entries; if provided, skips network fetch. */
  entries?: Array<Feedback> | undefined;
  /** Focuses the form below. Only passed where a form exists. */
  onEdit?: (() => void) | undefined;
}

/**
 * Displays the list of feedback assessments submitted by interviewers for a round.
 */
export const FeedbackList: React.FC<FeedbackListProps> = ({
  interviewId,
  editable,
  entries,
  onEdit,
}) => {
  const { user } = useAuth();

  // Disabled outright when the caller supplied the entries — the hook takes
  // Avoid redundant fetch if entries are provided.
  const feedbackQuery = useFeedbackQuery(entries === undefined ? interviewId : null);

  if (entries === undefined) {
    if (feedbackQuery.isPending) {
      return <ListSkeleton />;
    }

    if (feedbackQuery.isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">Could not load feedback.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void feedbackQuery.refetch()}
            disabled={feedbackQuery.isFetching}
          >
            {feedbackQuery.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      );
    }
  }

  const rows = entries ?? feedbackQuery.data?.feedback ?? [];

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {/* Split on whether the viewer can write, because "yours will be the
            first" is only true for somebody who has a form below. */}
        {editable
          ? 'No feedback yet. Yours will be the first.'
          : 'No feedback submitted for this round yet.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((entry) => {
        // Display user's own feedback badge and controls if applicable
        const isOwn = user !== null && entry.interviewer.id === user.id;

        return (
          <FeedbackCard
            key={entry.id}
            entry={entry}
            isOwn={isOwn}
            onEdit={editable && isOwn ? onEdit : undefined}
          />
        );
      })}
    </div>
  );
};
