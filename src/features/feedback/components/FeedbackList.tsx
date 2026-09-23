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
  /**
   * Whether the viewer may write on this round at all.
   *
   * `false` for every recruiter (FE-7, FR-5.4). It is a **second, independent**
   * reason the Edit button does not render for them — the first being that a
   * recruiter's id never matches an author's — and neither is what makes it
   * safe. The API's `403` is.
   */
  editable: boolean;
  /**
   * Entries supplied by the caller, for a surface that already has them.
   *
   * When present, **this component issues no request** — that is what lets the
   * recruiter's candidate detail render feedback for five rounds from the
   * candidate payload in zero extra calls rather than six (FR-1.2, API-6,
   * PERF-4).
   */
  entries?: Array<Feedback> | undefined;
  /** Focuses the form below. Only passed where a form exists. */
  onEdit?: (() => void) | undefined;
}

/**
 * A round's panel of assessments (FR-2).
 *
 * **The API's order is the order** — newest first — and this component does not
 * re-sort (FR-2.1). Nor does it filter: an interviewer's list is complete for
 * the round they are on, because the request they made was scoped by the server.
 * If a row appears that should not have, that is a backend bug to report, not a
 * row to drop here.
 *
 * **An assigned interviewer sees their colleagues' entries, including before
 * writing their own.** That is the brief's opening complaint —
 * _"Interviewers can't see prior feedback before their round"_ — being fixed,
 * and it is why this renders **above** the form rather than below it (D-4,
 * FR-3.1). The anchoring risk it creates is an accepted, named gap rather than
 * something half-mitigated with a blind-until-submitted rule nobody asked for.
 *
 * **No candidate data reaches this component**, because none is in the payload.
 * `Feedback` declares no candidate field, so there is nothing here to hide and
 * nothing a future edit could reveal by accident (SEC-1, XBE-2).
 *
 * Unpaginated and unvirtualised: a panel is single digits, bounded by one row
 * per interviewer per round (PERF-5).
 */
export const FeedbackList: React.FC<FeedbackListProps> = ({
  interviewId,
  editable,
  entries,
  onEdit,
}) => {
  const { user } = useAuth();

  // Disabled outright when the caller supplied the entries — the hook takes
  // `null` for exactly this, so the candidate detail costs no request (PERF-4).
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
        // **A display decision, never an authorization one** (FR-2.3, FR-6.2,
        // AZ-3). The API scopes `PATCH` by the token in its own `where`; this
        // only decides which card wears the badge. A recruiter passes
        // `editable={false}`, so even the coincidence of a matching id could not
        // produce an Edit button for them.
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
