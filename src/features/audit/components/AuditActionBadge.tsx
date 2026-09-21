import { Badge } from '@/components/ui/badge';
import { actionLabel, actionVariant } from '../labels';
import type { AuditAction } from '../types';

interface AuditActionBadgeProps {
  action: AuditAction;
}

/**
 * The Action cell (FR-2.4).
 *
 * Both the label and the variant come from `Record<AuditAction, …>` maps, so a
 * value added to the backend enum is a compile error here rather than a blank
 * cell or an unstyled badge.
 *
 * The accessors are tolerant on top of that, for the one case the types cannot
 * cover — the backend shipping a tenth action before this client does. Then the
 * **raw action string** renders in the neutral `outline` variant rather than
 * nothing at all (FR-3.3, EC-01).
 */
export const AuditActionBadge: React.FC<AuditActionBadgeProps> = ({ action }) => {
  return <Badge variant={actionVariant(action)}>{actionLabel(action)}</Badge>;
};
