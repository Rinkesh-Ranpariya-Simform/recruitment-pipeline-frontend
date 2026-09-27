'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useInterviewerCandidatesQuery,
  useRecruiterCandidatesQuery,
} from '../hooks/useCandidatesQuery';
import {
  buildCandidatesHref,
  hasActiveCandidateFilters,
  parseInterviewerCandidatesSearchParams,
  parseRecruiterCandidatesSearchParams,
} from '../search-params';
import { CandidatesFilters } from './CandidatesFilters';
import { CandidatesPagination } from './CandidatesPagination';
import {
  InterviewerCandidatesTable,
  InterviewerCandidatesTableSkeleton,
} from './InterviewerCandidatesTable';
import {
  RecruiterCandidatesTable,
  RecruiterCandidatesTableSkeleton,
} from './RecruiterCandidatesTable';

interface EmptyStateProps {
  message: string;
  hint?: string;
  children?: React.ReactNode;
}

/** The shared frame for every empty and error state below. */
const EmptyState: React.FC<EmptyStateProps> = ({ message, hint, children }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{message}</p>
        {hint && <p className="max-w-md text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
};

interface ErrorStateProps {
  onRetry: () => void;
  isFetching: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry, isFetching }) => {
  return (
    <EmptyState message="Couldn't load candidates.">
      <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>
        {isFetching ? 'Retrying…' : 'Try again'}
      </Button>
    </EmptyState>
  );
};

/**
 * Main candidates list view component that dispatches to either recruiter or interviewer view
 * depending on the user's role.
 */
export const CandidatesListView: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return user.role === 'RECRUITER' ? <RecruiterCandidatesView /> : <InterviewerCandidatesView />;
};

/**
 * Recruiter candidates view with search, status/stage filtering, and full candidate contact details.
 */
const RecruiterCandidatesView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = parseRecruiterCandidatesSearchParams(searchParams);

  const candidatesQuery = useRecruiterCandidatesQuery(params);

  const candidates = candidatesQuery.data?.candidates ?? [];
  const pagination = candidatesQuery.data?.pagination;
  const filtered = hasActiveCandidateFilters(params);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'candidate' : 'candidates'}
            </p>
          )}
        </div>
      </header>

      {/* Filter bar is preserved across states so applied filters remain accessible */}
      <CandidatesFilters params={params} showSearch />

      {candidatesQuery.isPending ? (
        <RecruiterCandidatesTableSkeleton />
      ) : candidatesQuery.isError ? (
        <ErrorState
          onRetry={() => void candidatesQuery.refetch()}
          isFetching={candidatesQuery.isFetching}
        />
      ) : candidates.length === 0 ? (
        // Distinguish between no results found for active filters vs. no candidates in system
        filtered ? (
          <EmptyState message="No candidates match these filters.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildCandidatesHref({}))}
            >
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            message="No candidates yet."
            hint="People who sign up and apply appear here."
          />
        )
      ) : (
        <div
          className={
            candidatesQuery.isFetching ? 'flex flex-col gap-4 opacity-60' : 'flex flex-col gap-4'
          }
        >
          <RecruiterCandidatesTable candidates={candidates} />
          {pagination && <CandidatesPagination pagination={pagination} params={params} />}
        </div>
      )}
    </section>
  );
};

/**
 * Interviewer candidates view displaying assigned candidates and their respective rounds.
 */
const InterviewerCandidatesView: React.FC = () => {
  const searchParams = useSearchParams();

  const params = parseInterviewerCandidatesSearchParams(searchParams);

  const candidatesQuery = useInterviewerCandidatesQuery(params);

  const candidates = candidatesQuery.data?.candidates ?? [];
  const pagination = candidatesQuery.data?.pagination;
  const filtered = hasActiveCandidateFilters(params);

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="text-sm text-muted-foreground">The people you are interviewing.</p>
      </header>

      <CandidatesFilters params={{ ...params, q: undefined }} showSearch={false} />

      {candidatesQuery.isPending ? (
        <InterviewerCandidatesTableSkeleton />
      ) : candidatesQuery.isError ? (
        <ErrorState
          onRetry={() => void candidatesQuery.refetch()}
          isFetching={candidatesQuery.isFetching}
        />
      ) : candidates.length === 0 ? (
        filtered ? (
          <EmptyState message="No candidates match these filters." />
        ) : (
          <EmptyState
            message="You are not assigned to any candidates yet."
            hint="Candidates appear here when a recruiter assigns you to an interview."
          />
        )
      ) : (
        <div
          className={
            candidatesQuery.isFetching ? 'flex flex-col gap-4 opacity-60' : 'flex flex-col gap-4'
          }
        >
          <InterviewerCandidatesTable candidates={candidates} />
          {pagination && (
            <CandidatesPagination pagination={pagination} params={{ ...params, q: undefined }} />
          )}
        </div>
      )}
    </section>
  );
};
