'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PhoneCallIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useStartPhoneScreen } from '@/features/interviews/hooks/useInterviewMutations';
import { ApiError } from '@/lib/api';
import { errorBodyOf } from '@/lib/error-details';
import type { RecruiterApplication } from '../types';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface StartPhoneScreenButtonProps {
  application: RecruiterApplication;
}

/**
 * **Start phone screen** — the one action on a row of the applications table
 * (applications FR-2.2).
 *
 * The name is the action, not the mechanism: "Select" would have been shorter
 * and would have meant two different things on two pages, because the Select
 * button on a round's page records a verdict. This one only creates the first
 * round, with no date, and **does not move the candidate's stage** — they are
 * still at Applied until somebody passes them.
 *
 * **It navigates to `/interviews` on success**, because that is where the
 * candidate now is. The round it just created is not visible from
 * `/applications` — the inbox has no stage, status or round count — so leaving
 * the recruiter on a row that looks exactly as it did before the click would
 * make a successful action read as a no-op.
 *
 * ## The three states of this cell
 *
 * | Application                 | What renders                                    |
 * | --------------------------- | ----------------------------------------------- |
 * | Live, no rounds yet         | **Start phone screen**                          |
 * | Has rounds                  | **View process** — a link to `/interviews/:id`  |
 * | Closed (hired or rejected)  | **View** — a link, nothing left to do           |
 *
 * The second row is the one worth stating: once a round exists, the action a
 * recruiter wants is to open the process, not to start a second phone screen by
 * accident. Scheduling further rounds is a decision with a type and a stage in
 * it, and it belongs in the dialog on the detail page where those are visible.
 *
 * Hiding the button on a closed application is a convenience. **The check is the
 * API's `409 APPLICATION_NOT_ACTIVE`**, which is handled below and holds for a
 * row that went stale in another tab.
 */
export const StartPhoneScreenButton: React.FC<StartPhoneScreenButtonProps> = ({ application }) => {
  const router = useRouter();
  const startMutation = useStartPhoneScreen();
  // The process page, which is under `/interviews` now — one row of this table
  // is one application, and an application's rounds are the interviews feature.
  const href = `/interviews/${application.id}`;

  if (application.status !== 'ACTIVE') {
    return (
      <Button variant="ghost" size="sm" render={<Link href={href} />}>
        View
      </Button>
    );
  }

  if (application.interviewCount > 0) {
    return (
      <Button variant="outline" size="sm" render={<Link href={href} />}>
        View process
      </Button>
    );
  }

  const start = async () => {
    try {
      await startMutation.mutateAsync(application.id);
      toast.success(`Phone screen started for ${application.candidate.name}.`);
      // To the list, not to the new round: the recruiter has just moved someone
      // into a process and the next thing they do is set its date or its panel,
      // both of which are one click into `/interviews`.
      router.push('/interviews');
    } catch (error) {
      // 403 is handled globally: `apiFetch` has already redirected and rejected,
      // so this view is unmounting and a message here would flash over it.
      if (error instanceof ApiError && error.status === 403) {
        return;
      }

      if (errorBodyOf(error)?.code === 'APPLICATION_NOT_ACTIVE') {
        // Somebody closed it first. `onSettled` has already invalidated, so the
        // button is about to become a link on its own.
        toast.error('This application is closed.');
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        toast.error('This application no longer exists.');
        return;
      }

      toast.error(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <Button size="sm" onClick={() => void start()} disabled={startMutation.isPending}>
      <PhoneCallIcon aria-hidden="true" />
      {startMutation.isPending ? 'Starting…' : 'Start phone screen'}
    </Button>
  );
};
