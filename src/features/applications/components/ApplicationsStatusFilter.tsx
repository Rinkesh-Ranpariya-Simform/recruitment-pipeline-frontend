'use client';

import { useRouter } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PIPELINE_STATUS_LABELS } from '@/features/pipeline/labels';
import {
  buildApplicationsHref,
  isApplicationStatus,
  type ApplicationsSearchParams,
} from '../search-params';
import type { ApplicationStatus } from '../types';

/** The select needs a value for "All"; it cannot be absent. */
const ALL = 'ALL';

type FilterValue = typeof ALL | ApplicationStatus;

/**
 * The **recruiter's** status words, not the candidate's: this control sits above
 * a recruiter's table, so `REJECTED` reads "Rejected" rather than "Not
 * selected".
 */
const OPTIONS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: ALL, label: 'All statuses' },
  { value: 'ACTIVE', label: PIPELINE_STATUS_LABELS.ACTIVE },
  { value: 'HIRED', label: PIPELINE_STATUS_LABELS.HIRED },
  { value: 'REJECTED', label: PIPELINE_STATUS_LABELS.REJECTED },
];

interface ApplicationsStatusFilterProps {
  basePath: string;
  params: ApplicationsSearchParams;
  omit?: ReadonlyArray<keyof ApplicationsSearchParams>;
}

/**
 * All · Active · Hired · Rejected, stored in the URL as `?status=` and omitted
 * for All.
 *
 * `router.push` rather than `replace`, so Back returns to the previous filter.
 * Changing the filter resets to page 1 — page 3 of everything is rarely page 3
 * of rejected applications. `roleId` is carried through untouched: it is
 * deep-link scope, and a status change must not silently widen it.
 */
export const ApplicationsStatusFilter: React.FC<ApplicationsStatusFilterProps> = ({
  basePath,
  params,
  omit,
}) => {
  const router = useRouter();

  return (
    <Select
      // Without `items`, base-ui's `SelectValue` renders the raw value, so the
      // trigger would read "ALL" instead of "All statuses".
      items={OPTIONS}
      value={params.status ?? ALL}
      // base-ui hands back a widened `string | null`, so narrow it rather than
      // asserting the type.
      onValueChange={(value) => {
        router.push(
          buildApplicationsHref(
            basePath,
            {
              ...params,
              status: isApplicationStatus(value) ? value : undefined,
              page: 1,
            },
            omit,
          ),
        );
      }}
    >
      <SelectTrigger className="w-44" aria-label="Filter by status">
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
