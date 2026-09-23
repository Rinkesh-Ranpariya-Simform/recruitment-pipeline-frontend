'use client';

import Link from 'next/link';
import { CheckCircle2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge } from '@/features/applications/components/ApplicationStatusBadge';
import { useApplicationsQuery } from '@/features/applications/hooks/useApplicationsQuery';
import { useApplyMutation } from '@/features/applications/hooks/useApplyMutation';
import { stageLabel } from '@/features/applications/labels';
import { ApiError } from '@/lib/api';
import { formatAbsolute } from '@/lib/format-date';

interface ApplyActionProps {
  jobId: number;
  onGone: () => void;
}

/**
 * The Apply button — or, once this candidate has applied to this position, the
 * panel that replaces it.
 *
 * **One application per position** is the backend's rule, not a client
 * convention. This component only stops a candidate reaching that 409 by
 * clicking a button that was never going to work — once an application exists
 * the button is not rendered at all, rather than rendered disabled, because a
 * disabled control with no explanation reads as a bug.
 *
 * Applying to a DIFFERENT position is untouched: the check is `role.id === jobId`,
 * so an unrelated application never hides this button.
 *
 * The prior-application lookup reads from the **shared** applications query key,
 * so arriving here from My applications costs no extra request. While that query
 * is still loading, the button is disabled — submitting during the one moment we
 * cannot tell whether an application exists is the only way to hit the 409 from
 * a fresh page load.
 */
export const ApplyAction: React.FC<ApplyActionProps> = ({ jobId, onGone }) => {
  const { data, isPending: applicationsPending } = useApplicationsQuery();
  const apply = useApplyMutation();

  // The list is the candidate's own and the API returns it whole, so `find` here
  // is a lookup over a handful of rows, not a substitute for a server query.
  const existing = (data?.applications ?? []).find((application) => application.role.id === jobId);

  const onApply = () => {
    apply.mutate(jobId, {
      onSuccess: () => {
        toast.success('Application submitted.');
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 404) {
          // Expected, not exceptional: the requisition was closed while this page
          // was open. Hand control back so the page can render the not-found panel.
          toast.error('This position is no longer open.');
          onGone();
          return;
        }

        if (error instanceof ApiError && error.status === 409) {
          // Two tabs, a stale list, or a double submit that outran the
          // in-flight guard. `useApplyMutation` invalidates on settle for
          // exactly this case, which swaps the button for the panel below.
          toast.info('You have already applied to this position.');
          return;
        }

        // 403 is handled globally by `apiFetch`'s onForbidden, and 401 by its
        // refresh. Anything else is the same story to the user.
        toast.error('Could not submit your application. Try again.');
      },
    });
  };

  if (existing) {
    return (
      <section className="space-y-3 rounded-xl border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">You have already applied to this position.</p>
          <ApplicationStatusBadge status={existing.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {/* Status and stage both, because "In progress" alone doesn't tell a
              candidate where they are. Only the fields the API actually
              returns — there is no feedback or rating to render here. */}
          Applied {formatAbsolute(existing.createdAt)} · {stageLabel(existing.currentStage)}
        </p>
        <Button variant="outline" size="sm" render={<Link href="/my-applications" />}>
          Check your application
        </Button>
      </section>
    );
  }

  return (
    <Button
      onClick={onApply}
      // Pending covers two things: an in-flight apply (a double-click guard that
      // now matters, because the second click would be a 409) and the
      // applications list not having arrived yet.
      disabled={apply.isPending || applicationsPending}
      className="font-medium"
    >
      {apply.isPending ? 'Applying…' : 'Apply'}
    </Button>
  );
};
