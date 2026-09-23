'use client';

import { useRouter } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INTERVIEW_STATUS_LABELS } from '../labels';
import { buildInterviewsHref, isInterviewStatus } from '../search-params';
import type { InterviewsSearchParams } from '../search-params';
import type { InterviewStatus } from '../types';

/** The select needs a value for "All"; it cannot be absent. */
const ALL = 'ALL';

type FilterValue = typeof ALL | InterviewStatus;

const OPTIONS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: ALL, label: 'All statuses' },
  { value: 'SCHEDULED', label: INTERVIEW_STATUS_LABELS.SCHEDULED },
  { value: 'COMPLETED', label: INTERVIEW_STATUS_LABELS.COMPLETED },
  { value: 'CANCELLED', label: INTERVIEW_STATUS_LABELS.CANCELLED },
];

interface InterviewsStatusFilterProps {
  basePath: string;
  params: InterviewsSearchParams;
}

/**
 * All · Scheduled · Completed · Cancelled, stored in the URL as `?status=` and
 * omitted for All.
 *
 * `router.push` rather than `replace`, so Back returns to the previous filter.
 * Changing the filter resets to page 1 — page 3 of everything is rarely page 3
 * of cancelled rounds. The other two filters are carried through untouched:
 * they are deep-link scope, and a status change must not silently widen it.
 */
export const InterviewsStatusFilter: React.FC<InterviewsStatusFilterProps> = ({
  basePath,
  params,
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
          buildInterviewsHref(basePath, {
            ...params,
            status: isInterviewStatus(value) ? value : undefined,
            page: 1,
          }),
        );
      }}
    >
      <SelectTrigger size="sm" className="w-44" aria-label="Filter interviews by status">
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
