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

interface RolesStatusFilterProps {
  status: RoleStatus | undefined;
}

/** Role status filter dropdown. Stored in URL params, resets to page 1 on change. */
export const RolesStatusFilter: React.FC<RolesStatusFilterProps> = ({ status }) => {
  const router = useRouter();

  return (
    <Select
      // Provide items so the trigger shows the label, not the raw value.
      items={OPTIONS}
      value={status ?? ALL}
      // Narrow the value to a valid status type.
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
};
