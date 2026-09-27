'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRolesQuery } from '@/features/roles/hooks/useRolesQuery';
import { pipelineStageLabel, pipelineStatusLabel } from '@/features/pipeline/labels';
import { PIPELINE_STAGES, isPipelineStage } from '@/features/pipeline/search-params';
import {
  APPLICATION_STATUS_VALUES,
  buildCandidatesHref,
  isApplicationStatus,
  type RecruiterCandidatesSearchParams,
} from '../search-params';
import type { ApplicationStatus, PipelineStage } from '../types';

/**
 * Debounce delay in milliseconds for candidate search input.
 */
const DEBOUNCE_MS = 400;

/** The sentinel a `<Select>` uses for "no filter" — `null` is not a valid item value. */
const ANY = '__any__';

interface CandidatesFiltersProps {
  params: RecruiterCandidatesSearchParams;
  /** Whether to render the candidate search input (recruiter view only). */
  showSearch: boolean;
}

/**
 * Candidate filter bar providing controls for text search, role, pipeline stage, and application status.
 * Filters are stored in URL search parameters to support bookmarking and link sharing.
 */
export const CandidatesFilters: React.FC<CandidatesFiltersProps> = ({ params, showSearch }) => {
  const router = useRouter();

  const rolesQuery = useRolesQuery({ status: undefined, page: 1 });
  const roles = rolesQuery.data?.roles ?? [];

  // Every change resets to page 1: staying on page 3 of the previous result set
  // would show an empty page for a narrower filter.
  const go = (next: Partial<RecruiterCandidatesSearchParams>) => {
    router.push(buildCandidatesHref({ ...params, ...next, page: 1 }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showSearch && <CandidatesSearch value={params.q} params={params} />}

      <Select
        items={[
          { value: ANY, label: 'All roles' },
          ...roles.map((role) => ({ value: String(role.id), label: role.title })),
        ]}
        value={params.roleId === undefined ? ANY : String(params.roleId)}
        onValueChange={(value) => {
          if (value === null) {
            return;
          }

          go({ roleId: value === ANY ? undefined : Number(value) });
        }}
      >
        <SelectTrigger aria-label="Filter by role" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={String(role.id)}>
              {role.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={[
          { value: ANY, label: 'All stages' },
          ...PIPELINE_STAGES.map((stage) => ({ value: stage, label: pipelineStageLabel(stage) })),
        ]}
        value={params.stage ?? ANY}
        onValueChange={(value) => {
          // Widened to `string | null` by base-ui, so it is narrowed through the
          // same predicate the URL parser uses rather than cast.
          go({ stage: isPipelineStage(value) ? (value as PipelineStage) : undefined });
        }}
      >
        <SelectTrigger aria-label="Filter by stage" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All stages</SelectItem>
          {PIPELINE_STAGES.map((stage) => (
            <SelectItem key={stage} value={stage}>
              {pipelineStageLabel(stage)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={[
          { value: ANY, label: 'Any status' },
          ...APPLICATION_STATUS_VALUES.map((status) => ({
            value: status,
            label: pipelineStatusLabel(status),
          })),
        ]}
        value={params.status ?? ANY}
        onValueChange={(value) => {
          go({ status: isApplicationStatus(value) ? (value as ApplicationStatus) : undefined });
        }}
      >
        <SelectTrigger aria-label="Filter by application status" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any status</SelectItem>
          {APPLICATION_STATUS_VALUES.map((status) => (
            <SelectItem key={status} value={status}>
              {pipelineStatusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface CandidatesSearchProps {
  value: string | undefined;
  params: RecruiterCandidatesSearchParams;
}

/**
 * Debounced search input for querying candidates by name or email.
 */
const CandidatesSearch: React.FC<CandidatesSearchProps> = ({ value, params }) => {
  const router = useRouter();
  const [term, setTerm] = useState(value ?? '');

  // React's documented "reset state when a prop changes" pattern: adjusted
  // during render rather than in an effect, so there is no flash of the stale
  // term and `react-hooks/set-state-in-effect` is not tripped.
  const [lastCommitted, setLastCommitted] = useState(value);

  if (value !== lastCommitted) {
    setLastCommitted(value);
    setTerm(value ?? '');
  }

  const committed = value ?? '';

  // `useRef` so the timer survives re-renders; cleared on unmount so a pending
  // navigation cannot fire after the recruiter has left the page.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const onChange = (next: string) => {
    setTerm(next);

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      const trimmed = next.trim();

      // Typing and deleting a character should not push a duplicate history
      // entry, or fire a second identical request.
      if (trimmed === committed) {
        return;
      }

      router.replace(
        buildCandidatesHref({ ...params, q: trimmed === '' ? undefined : trimmed, page: 1 }),
      );
    }, DEBOUNCE_MS);
  };

  return (
    <div className="relative w-full max-w-sm">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={term}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name or email"
        aria-label="Search candidates by name or email"
        className="pl-9"
      />
    </div>
  );
};
