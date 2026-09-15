'use client';

import { Badge } from '@/components/ui/badge';
import type { RoleStatus } from '../types';

/**
 * A role's status. The badge always carries the word as well as the colour, so
 * it reads correctly in greyscale and for colour-blind users.
 */
export function RoleStatusBadge({ status }: { status: RoleStatus }) {
  return (
    <Badge variant={status === 'OPEN' ? 'default' : 'secondary'}>
      {status === 'OPEN' ? 'Open' : 'Closed'}
    </Badge>
  );
}
