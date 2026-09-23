'use client';

import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Shown when the API answers `404` for a round.
 *
 * A **data** 404, not `NotFoundView`: the route resolved and the user may open
 * it — it is the round that did not come back.
 *
 * **The copy deliberately says nothing about why**, and must keep saying
 * nothing. For an interviewer the API answers identically whether the round
 * does not exist or lies outside their own — byte for byte — so the client
 * genuinely does not know which it is. Explaining would mean inventing a fact
 * the response does not carry, and would hand back exactly what the API
 * withheld. **Do not add a helpful sentence here.**
 *
 * `backHref` differs by role, which is why it is a prop: an interviewer's way
 * back is their own list, a recruiter's is all of them.
 */
interface InterviewNotFoundProps {
  backHref: string;
  backLabel: string;
}

export const InterviewNotFound: React.FC<InterviewNotFoundProps> = ({ backHref, backLabel }) => {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <FileQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Interview not found</h1>
        <p className="text-sm text-muted-foreground">
          This interview doesn&apos;t exist, or the link that brought you here is out of date.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href={backHref} />}>
        {backLabel}
      </Button>
    </section>
  );
};
