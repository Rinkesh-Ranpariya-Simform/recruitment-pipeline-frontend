'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ApiError } from '@/lib/api';
import {
  parseCandidateId,
  useInterviewerCandidateQuery,
  useRecruiterCandidateQuery,
} from '../hooks/useCandidatesQuery';
import { CandidateNotFound } from './CandidateNotFound';
import { InterviewerCandidateDetail } from './InterviewerCandidateDetail';
import { RecruiterCandidateDetail } from './RecruiterCandidateDetail';

/** The loading state, shaped like a detail page rather than a spinner. */
const DetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-28" />
      <Card className="gap-4 p-5">
        <Skeleton className="h-8 w-64 max-w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </Card>
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
};

interface ErrorStateProps {
  onRetry: () => void;
  isFetching: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry, isFetching }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm text-muted-foreground">Couldn&apos;t load this candidate.</p>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>
        {isFetching ? 'Retrying…' : 'Try again'}
      </Button>
    </div>
  );
};

interface CandidateDetailViewProps {
  candidateId: string;
}

/**
 * Candidate detail view page component.
 * Renders either the recruiter view with full history and contact details,
 * or the interviewer view with assigned rounds only.
 */
export const CandidateDetailView: React.FC<CandidateDetailViewProps> = ({ candidateId }) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return user.role === 'RECRUITER' ? (
    <RecruiterView candidateId={candidateId} />
  ) : (
    <InterviewerView candidateId={candidateId} />
  );
};

interface RoleViewProps {
  candidateId: string;
}

const RecruiterView: React.FC<RoleViewProps> = ({ candidateId }) => {
  // Reject non-numeric candidate IDs early and show not found
  const parsedId = parseCandidateId(candidateId);
  const candidateQuery = useRecruiterCandidateQuery(parsedId);

  if (parsedId === null) {
    return <CandidateNotFound />;
  }

  if (candidateQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (candidateQuery.isError) {
    if (candidateQuery.error instanceof ApiError && candidateQuery.error.status === 404) {
      return <CandidateNotFound />;
    }

    return (
      <ErrorState
        onRetry={() => void candidateQuery.refetch()}
        isFetching={candidateQuery.isFetching}
      />
    );
  }

  return <RecruiterCandidateDetail candidate={candidateQuery.data.candidate} />;
};

const InterviewerView: React.FC<RoleViewProps> = ({ candidateId }) => {
  const parsedId = parseCandidateId(candidateId);
  const candidateQuery = useInterviewerCandidateQuery(parsedId);

  if (parsedId === null) {
    return <CandidateNotFound />;
  }

  if (candidateQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (candidateQuery.isError) {
    if (candidateQuery.error instanceof ApiError && candidateQuery.error.status === 404) {
      return <CandidateNotFound />;
    }

    return (
      <ErrorState
        onRetry={() => void candidateQuery.refetch()}
        isFetching={candidateQuery.isFetching}
      />
    );
  }

  return (
    <InterviewerCandidateDetail
      candidate={candidateQuery.data.candidate}
      interviews={candidateQuery.data.interviews}
    />
  );
};
