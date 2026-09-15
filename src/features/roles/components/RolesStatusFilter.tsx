'use client';

import { useRouter } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildRolesHref, isRoleStatus } from '../search-params';
import type { RoleStatus } from '../types';

/** The select needs a value for "All"; it can't be absent. */
const ALL = 'ALL';

type FilterValue = typeof ALL | RoleStatus;

const OPTIONS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: ALL, label: 'All roles' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

/**
 * All · Open · Closed, stored in the URL as `?status=OPEN|CLOSED` and omitted
 * for All.
 *
 * Uses `router.push` rather than `replace`, so Back returns to the previous
 * filter. Changing the filter resets to page 1 — page 3 of "all roles" is
 * rarely page 3 of "closed roles".
 */
export function RolesStatusFilter({ status }: { status: RoleStatus | undefined }) {
  const router = useRouter();

  return (
    <Select
      // Without `items`, base-ui's `SelectValue` renders the raw value, so the
      // trigger would read "ALL" instead of "All roles".
      items={OPTIONS}
      value={status ?? ALL}
      // base-ui hands back a widened `string | null`, so narrow it rather than
      // asserting the type.
      onValueChange={(value) => {
        router.push(buildRolesHref({ status: isRoleStatus(value) ? value : undefined, page: 1 }));
      }}
    >
      <SelectTrigger size="sm" className="w-40" aria-label="Filter roles by status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
