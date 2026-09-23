'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useRecruiterInterviewsQuery } from '../hooks/useInterviewsQuery';
import { buildInterviewsHref, parseInterviewsSearchParams } from '../search-params';
import { InterviewsPagination } from './InterviewsPagination';
import { InterviewsStatusFilter } from './InterviewsStatusFilter';
import { InterviewsTableSkeleton, RecruiterInterviewsTable } from './InterviewsTable';

const BASE_PATH = '/interviews';

interface EmptyStateProps {
  message: string;
  hint?: string;
  children?: React.ReactNode;
}

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
 * `/interviews` — every round in the system, with its panel.
 *
 * **There is no Schedule button here, and its absence is not an oversight.**
 * Scheduling a round needs an application to hang it off, and this list holds
 * rounds rather than applications — there is no recruiter-facing endpoint that
 * lists applications to pick one from (`GET /api/applications` is the
 * candidate's own). The schedule dialog is therefore mounted where an
 * application is already in hand: a round's detail, for scheduling another
 * round on the same application. The candidate detail page, which the
 * candidate-access feature owns, is the second call site and will use the same
 * component.
 *
 * `roleId` and `applicationId` come from the URL only — they exist so another
 * surface can deep-link into a scoped list. The Clear filters control appears
 * only once one of them is set, so a deep-linked recruiter can always get back
 * to everything.
 */
export const InterviewsListView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = parseInterviewsSearchParams(searchParams);
  const interviewsQuery = useRecruiterInterviewsQuery(params);

  const interviews = interviewsQuery.data?.interviews ?? [];
  const pagination = interviewsQuery.data?.pagination;
  const isScoped = params.roleId !== undefined || params.applicationId !== undefined;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
          {pagination && (
            <p className="text-sm text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'interview' : 'interviews'}
              {isScoped && ' in this view'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <InterviewsStatusFilter basePath={BASE_PATH} params={params} />
          {isScoped && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildInterviewsHref(BASE_PATH, { status: params.status }))}
            >
              Clear filters
            </Button>
          )}
        </div>
      </header>

      {interviewsQuery.isPending ? (
        <InterviewsTableSkeleton columns={6} />
      ) : interviewsQuery.isError ? (
        <EmptyState message="Could not load interviews.">
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
        ) : params.status || isScoped ? (
          <EmptyState message="No interviews match this filter.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildInterviewsHref(BASE_PATH, {}))}
            >
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            message="No interviews scheduled yet."
            hint="Schedule a round from a candidate's application to see it here."
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <RecruiterInterviewsTable interviews={interviews} />
          {pagination && (
            <InterviewsPagination basePath={BASE_PATH} params={params} pagination={pagination} />
          )}
        </div>
      )}
    </section>
  );
};
