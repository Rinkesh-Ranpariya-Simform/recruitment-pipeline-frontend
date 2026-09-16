'use client';

import Link from 'next/link';
import { FileTextIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplicationsQuery } from '../hooks/useApplicationsQuery';
import { ApplicationCard } from './ApplicationCard';

/**
 * Everything this candidate has applied to.
 *
 * The server scopes the list to the caller's own rows **inside the query**, so
 * there is nothing to filter here and no candidate id to send. There is also no
 * pager: the API returns the whole list, and paging it client-side would page
 * something already fetched in full.
 *
 * Rows render in server order — newest first. **No client-side re-sort**, so the
 * order the API documents is the order the user sees.
 */
export function ApplicationsListView() {
  const { data, isPending, isError, refetch } = useApplicationsQuery();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">My applications</h1>
        <p className="text-sm text-muted-foreground">Where each of your applications stands.</p>
      </div>

      {isPending ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">Could not load your applications.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </section>
      ) : data.applications.length === 0 ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FileTextIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">You have not applied to anything yet.</p>
            <p className="text-sm text-muted-foreground">Browse open positions to get started.</p>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/jobs" />}>
            Browse open positions
          </Button>
        </section>
      ) : (
        <div className="space-y-3">
          {data.applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}
