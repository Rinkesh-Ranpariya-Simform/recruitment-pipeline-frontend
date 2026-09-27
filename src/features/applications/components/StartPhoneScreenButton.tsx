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

/** Button component to initiate a candidate's phone screen round and transition them to active interviews. */
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
