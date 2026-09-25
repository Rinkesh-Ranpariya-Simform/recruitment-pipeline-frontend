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
 * `/candidates` — **the role picks the component before anything renders**
 * (FE-4, D-1, FR-11.2, AC-F33).
 *
 * The two views below take different props types, call different api wrappers
 * and render different tables. **There is no single table with
 * `candidate.email && …` in it**, and there could not be: an interviewer's rows
 * do not type-check against the recruiter's table (SEC-2, AZ-3, AC-F32).
 *
 * The role comparison here is one of the **two** in this feature — this and the
 * detail page's — and it is a *dispatch*, not a conditional around a contact
 * field. It also protects nothing on its own: the API picks its projection from
 * the verified token, so an interviewer cannot obtain the recruiter shape by
 * any route (AZ-1, AZ-2).
 *
 * **The only component in this feature that reads `useSearchParams()` for this
 * route** (FE-1) — which is why the page above it supplies the Suspense
 * boundary, without which `next build` fails even though `next dev` does not.
 */
export const CandidatesListView: React.FC = () => {
  const { user } = useAuth();

  // `<RequireAuth>` above guarantees a user, and `<RequireRole>` guarantees one
  // of the two privileged roles. This is narrowing, not a loading state.
  if (!user) {
    return null;
  }

  return user.role === 'RECRUITER' ? <RecruiterCandidatesView /> : <InterviewerCandidatesView />;
};

/**
 * Every candidate, with contact details, filters and a search box (FR-2).
 *
 * One request on mount and one per filter or page change; searching is debounced
 * so typing six characters is one request (PERF-1, AC-F13). The previous rows
 * stay on screen while the next set loads, so a search never flashes a skeleton
 * back (FE-10, PERF-8, AC-F14).
 */
const RecruiterCandidatesView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sanitised before anything is requested, so `?stage=BANANA&page=-2` renders
  // the unfiltered first page instead of the 400 the API would rightly answer
  // (VAL-4, EC-22, AC-F15).
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

      {/* Always rendered, in every state below — including the error ones. A
          recruiter whose request failed should not also lose the filter they
          set (ERR-1). */}
      <CandidatesFilters params={params} showSearch />

      {candidatesQuery.isPending ? (
        <RecruiterCandidatesTableSkeleton />
      ) : candidatesQuery.isError ? (
        <ErrorState
          onRetry={() => void candidatesQuery.refetch()}
          isFetching={candidatesQuery.isFetching}
        />
      ) : candidates.length === 0 ? (
        // Two empty states, and they are not interchangeable (FR-2.6). Telling
        // a recruiter "no candidates match these filters" when they have set
        // none is how an empty list becomes indistinguishable from a broken one.
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
 * The candidates this interviewer is assigned to — **name only** (FR-3).
 *
 * **No search box** (FR-3.2, D-6, EC-02, AC-F05): their parser produces no `q`,
 * `CandidatesFilters` is told not to render one, and the API answers `?q=` with
 * a `400` anyway. Only the last of those three is a control (SEC-6, AC-M04).
 *
 * **Nothing here filters a list.** The rows are narrow because the request was
 * narrow: the API reads this interviewer's id from the token and puts the
 * assignment predicate into its own query. A candidate they have no round with
 * is not in the response to be dropped — and if one ever appears, that is a
 * backend bug to report (XBE-1, AC-F03).
 */
const InterviewerCandidatesView: React.FC = () => {
  const searchParams = useSearchParams();

  // The interviewer's parser, which has no `q` field at all (VAL-5, API-4,
  // EC-03, AC-F07).
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
          // Says what will change it, without saying anything about access
          // (FR-3.3, ERR-2, SEC-3).
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
