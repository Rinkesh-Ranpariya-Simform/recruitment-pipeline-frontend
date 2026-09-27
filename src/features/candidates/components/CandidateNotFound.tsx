'use client';

import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Rendered when a requested candidate cannot be found or is not accessible.
 * Displays a friendly fallback message with navigation back to candidates list.
 */
export const CandidateNotFound: React.FC = () => {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <FileQuestionIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Candidate not found</h1>
        <p className="text-sm text-muted-foreground">
          This candidate doesn&apos;t exist, or the link that brought you here is out of date.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href="/candidates" />}>
        Back to candidates
      </Button>
    </section>
  );
};
