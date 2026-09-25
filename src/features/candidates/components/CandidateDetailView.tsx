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
 * `/candidates/[candidateId]` — **the role picks the component before anything
 * renders** (FE-4, FR-4.1, FR-7.1, AC-F33).
 *
 * The two views below take different props types and call different queries.
 * `RecruiterCandidateDetail` does not accept an `InterviewerCandidate` and
 * `InterviewerCandidateDetail` does not accept a `RecruiterCandidate`, so a
 * mistaken dispatch here is a **compile error** rather than a payload reaching
 * a component written for the other reader (FR-11.2, SEC-2, AZ-3).
 *
 * This is the second and last role comparison in the feature, and it is a
 * dispatch rather than a conditional around a contact field (AC-F32). It
 * protects nothing on its own: the API picks its projection from the verified
 * token, so an interviewer cannot obtain the recruiter shape by any route
 * (AZ-1, AZ-2).
 *
 * **Every `404` renders `<CandidateNotFound />` and says nothing about why**
 * (FR-7.4, FR-7.5, ERR-2, EC-01, AC-F01). For an interviewer it covers three
 * causes the API deliberately makes indistinguishable, so the client genuinely
 * cannot tell which it is and must not guess. It is **not retried** (FE-8,
 * PERF-9, AC-F02) — a `404` will not change on a second ask, and here it is
 * also how the API says "outside your scope".
 *
 * A client component because the route above has to `await params` — in Next 16
 * `params` is a Promise, so the page cannot also run the query.
 */
export const CandidateDetailView: React.FC<CandidateDetailViewProps> = ({ candidateId }) => {
  const { user } = useAuth();

  // `<RequireAuth>` above guarantees a user, and `<RequireRole>` guarantees one
  // of the two privileged roles. This is narrowing, not a loading state.
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
  // `/candidates/abc` never reaches the network — the id is visibly wrong, so
  // the not-found state renders straight away (FE-9).
  const parsedId = parseCandidateId(candidateId);
  const candidateQuery = useRecruiterCandidateQuery(parsedId);

  if (parsedId === null) {
    return <CandidateNotFound />;
  }

  if (candidateQuery.isPending) {
    return <DetailSkeleton />;
  }

  if (candidateQuery.isError) {
    // A 404 means there is no such candidate; anything else means we could not
    // ask, which is a different thing to tell a recruiter.
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
    // **Three causes, one rendering** (XBE-9, EC-01, EC-04). "No such
    // candidate", "that id is a recruiter's" and "you are not assigned to them"
    // arrive byte-identically, and nothing here tries to tell them apart.
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
