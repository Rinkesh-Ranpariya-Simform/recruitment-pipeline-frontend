import { Badge } from '@/components/ui/badge';
import { actionLabel, actionVariant } from '../labels';
import type { AuditAction } from '../types';

interface AuditActionBadgeProps {
  action: AuditAction;
}

/** Badge component rendering formatted labels and status colors for audit log action types. */
export const AuditActionBadge: React.FC<AuditActionBadgeProps> = ({ action }) => {
  return <Badge variant={actionVariant(action)}>{actionLabel(action)}</Badge>;
};
