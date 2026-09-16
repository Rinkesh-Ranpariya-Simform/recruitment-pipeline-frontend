'use client';

import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Shown when a position isn't open to this candidate, inside the app chrome.
 *
 * A **data** 404, not `NotFoundView`: the route resolved fine and the candidate
 * may open it — it's the position that is gone.
 *
 * The copy deliberately does not say whether the requisition never existed or
 * has been closed, because **the API does not distinguish the two** — saying so
 * here would invent a fact the response doesn't carry.
 */
export const JobNotFound: React.FC = () => {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <FileQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">This position is no longer open</h1>
        <p className="text-sm text-muted-foreground">
          It may have been filled or closed since you last looked.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href="/jobs" />}>
        Back to open positions
      </Button>
    </section>
  );
};
