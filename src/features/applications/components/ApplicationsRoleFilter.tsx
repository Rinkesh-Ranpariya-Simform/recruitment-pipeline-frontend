'use client';

import { useRouter } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRolesQuery } from '@/features/roles/hooks/useRolesQuery';
import { buildApplicationsHref, type ApplicationsSearchParams } from '../search-params';

/** Select value representing unfiltered roles. */
const ALL = 'ALL';

interface ApplicationsRoleFilterProps {
  basePath: string;
  params: ApplicationsSearchParams;
  omit?: ReadonlyArray<keyof ApplicationsSearchParams>;
}

/** Dropdown filter component allowing recruiters to filter applications by role. */
export const ApplicationsRoleFilter: React.FC<ApplicationsRoleFilterProps> = ({
  basePath,
  params,
  omit,
}) => {
  const router = useRouter();
  const rolesQuery = useRolesQuery({ status: undefined, page: 1 });

  const roles = rolesQuery.data?.roles ?? [];
  const options = [
    { value: ALL, label: 'All roles' },
    ...roles.map((role) => ({ value: String(role.id), label: role.title })),
  ];

  // A scoped deep link whose role is off page one still has to read as scoped.
  const selected = params.roleId === undefined ? ALL : String(params.roleId);
  const isUnknown = selected !== ALL && !roles.some((role) => String(role.id) === selected);

  return (
    <Select
      // Without `items`, base-ui's `SelectValue` renders the raw value, so the
      // trigger would read "20010" instead of the title.
      items={isUnknown ? [...options, { value: selected, label: `Role #${selected}` }] : options}
      value={selected}
      disabled={rolesQuery.isPending}
      onValueChange={(value) => {
        router.push(
          buildApplicationsHref(
            basePath,
            {
              ...params,
              // base-ui hands back a widened `string | null`. Anything that is
              // not a positive integer becomes "no filter" rather than a `400`.
              roleId: value === null || value === ALL ? undefined : Number(value) || undefined,
              page: 1,
            },
            omit,
          ),
        );
      }}
    >
      <SelectTrigger className="w-56" aria-label="Filter by role">
        <SelectValue placeholder="All roles" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
