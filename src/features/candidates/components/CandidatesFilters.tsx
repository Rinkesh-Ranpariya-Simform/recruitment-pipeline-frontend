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
 * Long enough that a typed word is one request, short enough to feel live
 * (FR-2.3, PERF-1, AC-F13). The spec's figure, and slightly longer than
 * `JobsSearch`'s 300 ms because this search reaches a bigger table.
 */
const DEBOUNCE_MS = 400;

/** The sentinel a `<Select>` uses for "no filter" — `null` is not a valid item value. */
const ANY = '__any__';

interface CandidatesFiltersProps {
  params: RecruiterCandidatesSearchParams;
  /**
   * Whether to render the search box (FR-2.4, FR-3.2, D-6).
   *
   * **False for an interviewer, and its absence is not what protects
   * anything** (SEC-6, AC-M04). Their parser never produces a `q`, so this
   * client cannot send one even from a hand-edited URL (VAL-5, API-4) — and the
   * API answers an interviewer's `?q=` with a `400` regardless (XBE-8). Three
   * independent reasons, and the third is the only one that is a control.
   */
  showSearch: boolean;
}

/**
 * The `/candidates` filter bar: search, role, stage and status (FR-2.3).
 *
 * Every one of them lives **in the URL** rather than in state, so a list a
 * recruiter is looking at is a list they can send to someone, and Back works
 * with no cache handling. This component holds only the in-flight search text
 * until the debounce fires — **nothing is written to browser storage, and the
 * search term in particular is not**, because it may be a candidate's email
 * address (DM-3, SEC-4, EC-20).
 *
 * The role options come from `GET /api/roles`, which is the one request this
 * feature makes that is not for candidates. It is cached for the session by
 * TanStack Query, so it costs one call on the first visit and none afterwards;
 * `/pipeline` avoids the equivalent only because its board response already
 * names every role, and there is no such free source here.
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
 * Name-and-email search, written to the URL rather than held in state
 * (FR-2.4, XBE-7).
 *
 * The placeholder says what it searches, because "Search" alone would leave a
 * recruiter guessing whether an email fragment will match — and it is the field
 * they actually search by.
 *
 * Mirrors the shipped `JobsSearch`, including the reset-state-during-render
 * pattern that keeps the box in step when the URL changes from outside this
 * component (Back, or the empty state's Clear filters).
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
