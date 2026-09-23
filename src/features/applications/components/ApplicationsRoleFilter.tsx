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

/** The select needs a value for "All"; it cannot be absent. */
const ALL = 'ALL';

interface ApplicationsRoleFilterProps {
  basePath: string;
  params: ApplicationsSearchParams;
  omit?: ReadonlyArray<keyof ApplicationsSearchParams>;
}

/**
 * **Everyone who applied to one requisition** — the question the applications
 * table exists to answer, given a control (applications FR-1.4).
 *
 * `?roleId=` was already in the URL vocabulary so that other surfaces could deep
 * link into a scoped list. This makes it reachable without one, because "show me
 * the candidates for the Senior Backend Engineer req" is the first thing a
 * recruiter with more than one open role wants.
 *
 * ## The first page of roles, and why that is honest here
 *
 * `GET /api/roles` is paged, and this reads **page one, unfiltered** — both
 * statuses, twenty roles. A recruiter with more than twenty requisitions will not
 * find their twenty-first here, and the honest fix at that point is a searchable
 * combobox rather than a longer page. Two things keep it from being a trap
 * meanwhile:
 *
 * - **Closed roles are included.** Filtering to `OPEN` would hide the
 *   applications to a requisition that has just been closed, which are exactly
 *   the ones somebody still has to write to.
 * - **A `roleId` the list does not contain still filters.** It came from the URL,
 *   the query still carries it, and the trigger falls back to naming the id — so
 *   a deep link into a scoped list never silently becomes an unscoped one.
 *
 * The roles query shares `rolesListKey` with `/roles`, so a recruiter arriving
 * from there pays nothing for this control.
 */
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
