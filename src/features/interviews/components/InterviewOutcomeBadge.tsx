import { Badge } from '@/components/ui/badge';
import type { InterviewOutcome } from '../types';

interface InterviewOutcomeBadgeProps {
  outcome: InterviewOutcome | null;
  decidedBy: { id: number; name: string } | null;
}

/**
 * The verdict at one round, as a badge beside its status.
 *
 * **Green for selected, red for rejected** — the same two colours
 * `StageTimeline` and `InterviewRoundCard` use, so one round reads the same way
 * everywhere it appears. The word is always present too: colour never carries
 * the meaning on its own.
 *
 * It renders **nothing** when there is no verdict rather than a grey "Pending"
 * pill, because the status badge beside it already says `Scheduled` and a second
 * pill saying the same thing in other words is noise. Once a decision exists it
 * appears, and it names who made it — a verdict with no actor behind it is not a
 * record, which is why the column is non-null in the database.
 */
export const InterviewOutcomeBadge: React.FC<InterviewOutcomeBadgeProps> = ({
  outcome,
  decidedBy,
}) => {
  if (outcome === null) {
    return null;
  }

  const suffix = decidedBy ? ` by ${decidedBy.name}` : '';

  if (outcome === 'SELECTED') {
    return (
      <Badge className="border-emerald-600/40 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
        Selected{suffix}
      </Badge>
    );
  }

  return <Badge variant="destructive">Rejected{suffix}</Badge>;
};
