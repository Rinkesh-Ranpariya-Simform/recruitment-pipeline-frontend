'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { pipelineStageLabel } from '@/features/pipeline/labels';
import { formatAbsolute } from '@/lib/format-date';
import { useRecruiterCandidatesQuery } from '../hooks/useCandidatesQuery';
import { canManageCandidateContacts } from '../permissions';
import { buildApplicantsHref, parseApplicantsPage } from '../search-params';

interface RoleApplicantsProps {
  roleId: number;
}

/**
 * Applicants section for a specific role detail page.
 * Displays candidates applied to this role with their stage, application date, and candidate link.
 */
export const RoleApplicants: React.FC<RoleApplicantsProps> = ({ roleId }) => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const page = parseApplicantsPage(searchParams);

  const canView = canManageCandidateContacts(user);

  // `enabled` rather than an early return, so the hook count is stable across
  // renders whichever role is signed in.
  const applicantsQuery = useRecruiterCandidatesQuery({ roleId, page }, { enabled: canView });

  if (!canView) {
    return null;
  }

  const candidates = applicantsQuery.data?.candidates ?? [];
  const pagination = applicantsQuery.data?.pagination;

  return (
    <section className="flex flex-col gap-4 border-t pt-6">
      <h2 className="text-sm font-medium text-muted-foreground">
        Applicants
        {pagination && <span className="ml-1.5 text-foreground">({pagination.total})</span>}
      </h2>

      {applicantsQuery.isPending ? (
        <ApplicantsSkeleton />
      ) : applicantsQuery.isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load applicants.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void applicantsQuery.refetch()}
            disabled={applicantsQuery.isFetching}
          >
            {applicantsQuery.isFetching ? 'Retrying…' : 'Try again'}
          </Button>
        </div>
      ) : candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No applicants yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <ApplicantsTableHead />
            <TableBody>
              {candidates.map((candidate) => {
                // The application to THIS role, which is the one this section is
                // about. A candidate applying to several roles has several, and
                // the row must not show another role's stage.
                const application = candidate.applications.find(
                  (entry) => entry.role.id === roleId,
                );

                return (
                  <TableRow key={candidate.id}>
                    <TableCell className="w-full max-w-0 py-3">
                      <span className="block truncate font-medium">{candidate.name}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      {application ? (
                        <Badge variant="outline">
                          {pipelineStageLabel(application.currentStage)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 whitespace-nowrap text-muted-foreground">
                      {application ? formatAbsolute(application.stageEnteredAt) : '—'}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/candidates/${candidate.id}`} />}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <nav
              className="flex items-center justify-between gap-4 border-t pt-4"
              aria-label="Applicants pagination"
            >
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex items-center gap-2">
                {pagination.page > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={buildApplicantsHref(roleId, searchParams, pagination.page - 1)} />
                    }
                  >
                    <ChevronLeftIcon aria-hidden="true" />
                    Previous
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeftIcon aria-hidden="true" />
                    Previous
                  </Button>
                )}

                {pagination.page < pagination.totalPages ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={buildApplicantsHref(roleId, searchParams, pagination.page + 1)} />
                    }
                  >
                    Next
                    <ChevronRightIcon aria-hidden="true" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                    <ChevronRightIcon aria-hidden="true" />
                  </Button>
                )}
              </div>
            </nav>
          )}
        </div>
      )}
    </section>
  );
};

/** Table header for role applicants. */
const ApplicantsTableHead: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-full">Candidate</TableHead>
        <TableHead>Stage</TableHead>
        <TableHead>Applied</TableHead>
        <TableHead className="text-right">View</TableHead>
      </TableRow>
    </TableHeader>
  );
};

const ApplicantsSkeleton: React.FC = () => {
  return (
    <Table>
      <ApplicantsTableHead />
      <TableBody>
        {Array.from({ length: 3 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="py-3">
              <Skeleton className="h-4 w-44 max-w-full" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-5 w-20 rounded-4xl" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell className="py-3">
              <Skeleton className="ml-auto h-8 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
