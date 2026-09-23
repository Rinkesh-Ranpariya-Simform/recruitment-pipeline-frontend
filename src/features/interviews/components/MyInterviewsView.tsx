'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useInterviewerInterviewsQuery } from '../hooks/useInterviewsQuery';
import { buildInterviewsHref, parseInterviewsSearchParams } from '../search-params';
import { InterviewsPagination } from './InterviewsPagination';
import { InterviewsStatusFilter } from './InterviewsStatusFilter';
import { InterviewerInterviewsTable, InterviewsTableSkeleton } from './InterviewsTable';

const BASE_PATH = '/my-interviews';

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
        <p className="text-sm font-medium">{message}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
};

/**
 * `/my-interviews` — the interviewer's own rounds, and their landing route.
 *
 * **Every row here is one the API chose to send.** The request carries no
 * interviewer id: the server reads it from the verified token and puts the
 * assignment predicate into its own query, so a round outside this person's own
 * is never in the response at any page or under any filter. **This component
 * therefore filters nothing, and must not start** — if a round they are not on
 * ever appears, that is a backend bug to report, not a row to drop here.
 *
 * A client component because the filter and page come from `useSearchParams()`
 * — which is why the route above it supplies the Suspense boundary.
 */
export const MyInterviewsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sanitised before anything is requested, so `?status=BANANA&page=-2` renders
  // the unfiltered first page instead of an error.
  const params = parseInterviewsSearchParams(searchParams);
  const interviewsQuery = useInterviewerInterviewsQuery(params);

  const interviews = interviewsQuery.data?.interviews ?? [];
  const pagination = interviewsQuery.data?.pagination;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">My interviews</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'interview' : 'interviews'}
            </p>
          )}
        </div>

        <InterviewsStatusFilter basePath={BASE_PATH} params={params} />
      </header>

      {interviewsQuery.isPending ? (
        <InterviewsTableSkeleton />
      ) : interviewsQuery.isError ? (
        <EmptyState message="Could not load your interviews.">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void interviewsQuery.refetch()}
            disabled={interviewsQuery.isFetching}
          >
            {interviewsQuery.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </EmptyState>
      ) : interviews.length === 0 ? (
        // Three different empty states: a page past the end, a filter that
        // matched nothing, and nothing at all. Showing the explanatory
        // onboarding line to someone who has simply filtered to Cancelled would
        // be wrong, and showing a bare "no results" to a new interviewer would
        // leave them wondering whether the page is broken.
        params.page > 1 ? (
          <EmptyState message="No interviews on this page.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildInterviewsHref(BASE_PATH, { ...params, page: 1 }))}
            >
              Back to first page
            </Button>
          </EmptyState>
        ) : params.status ? (
          <EmptyState message="No interviews match this filter.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildInterviewsHref(BASE_PATH, {}))}
            >
              Clear filter
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            message="You have no interviews assigned."
            hint="A recruiter will assign you to interview rounds. They will appear here."
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <InterviewerInterviewsTable interviews={interviews} />
          {pagination && (
            <InterviewsPagination basePath={BASE_PATH} params={params} pagination={pagination} />
          )}
        </div>
      )}
    </section>
  );
};
