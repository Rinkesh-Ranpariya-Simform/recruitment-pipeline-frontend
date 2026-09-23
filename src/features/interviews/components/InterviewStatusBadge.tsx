import { Badge } from '@/components/ui/badge';
import { interviewStatusLabel } from '../labels';
import type { InterviewStatus } from '../types';

/**
 * Variants are a `Record<InterviewStatus, …>` for the same reason the labels
 * are: adding a status to the backend enum should be a compile error here, not
 * an unstyled badge.
 *
 * **`CANCELLED` is `destructive`, unlike a rejected application.** The tones
 * are deliberately different: a rejected application is an outcome shown to the
 * person it happened to, where red is the wrong note — whereas a cancelled
 * round is an operational fact an interviewer must not skim past. A round that
 * is quietly listed as though it were still happening is the failure this badge
 * exists to prevent.
 */
const VARIANTS: Record<InterviewStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SCHEDULED: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

interface InterviewStatusBadgeProps {
  status: InterviewStatus;
}

export const InterviewStatusBadge: React.FC<InterviewStatusBadgeProps> = ({ status }) => {
  return <Badge variant={VARIANTS[status] ?? 'outline'}>{interviewStatusLabel(status)}</Badge>;
};
