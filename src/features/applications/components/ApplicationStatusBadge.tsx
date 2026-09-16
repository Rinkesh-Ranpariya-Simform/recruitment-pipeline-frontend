import { Badge } from '@/components/ui/badge';
import { statusLabel } from '../labels';
import type { ApplicationStatus } from '../types';

/**
 * Variants are a `Record<ApplicationStatus, …>` for the same reason the labels
 * are: adding a status to the backend enum should be a compile error here, not
 * an unstyled badge.
 *
 * `REJECTED` is `secondary` rather than `destructive` — it is an outcome, not an
 * error, and shouting it in red at the person it happened to is the wrong tone.
 */
const VARIANTS: Record<ApplicationStatus, 'default' | 'secondary' | 'outline'> = {
  ACTIVE: 'default',
  HIRED: 'default',
  REJECTED: 'secondary',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={VARIANTS[status] ?? 'outline'}>{statusLabel(status)}</Badge>;
}
